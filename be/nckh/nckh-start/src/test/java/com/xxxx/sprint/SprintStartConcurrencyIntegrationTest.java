package com.xxxx.sprint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.xxxx.ddd.application.mapper.SprintMapper;
import com.xxxx.ddd.application.mapper.UserStoryMapper;
import com.xxxx.ddd.application.port.async.UserStoryEventPort;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.sprint.SprintAppService;
import com.xxxx.ddd.application.service.sprint.impl.SprintAppServiceImpl;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.ddd.infrastructure.persistence.mapper.SprintJpaMapper;
import com.xxxx.ddd.infrastructure.persistence.mapper.WorkspaceJpaMapper;
import com.xxxx.ddd.infrastructure.persistence.repository.SprintInfrasRepositoryImpl;
import com.xxxx.ddd.infrastructure.persistence.repository.UserStoryInfrasRepositoryImpl;
import com.xxxx.ddd.infrastructure.persistence.repository.WorkspaceInfrasRepositoryImpl;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create",
    "spring.datasource.hikari.max-lifetime=600000",
    "spring.datasource.hikari.idle-timeout=300000",
    "spring.datasource.hikari.keepalive-time=30000",
    "spring.datasource.hikari.validation-timeout=5000",
    "spring.datasource.hikari.connection-timeout=30000",
    "spring.datasource.hikari.minimum-idle=1",
    "spring.datasource.hikari.maximum-pool-size=10"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    SprintAppServiceImpl.class,
    SprintInfrasRepositoryImpl.class,
    WorkspaceInfrasRepositoryImpl.class,
    UserStoryInfrasRepositoryImpl.class
})
@Testcontainers
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SprintStartConcurrencyIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4");

    @MockBean WorkspaceAccessService workspaceAccessService;
    @MockBean SprintMapper sprintMapper;
    @MockBean UserStoryMapper userStoryMapper;
    @MockBean UserStoryEventPort userStoryEventPort;

    @Autowired SprintAppService sprintAppService;
    @Autowired SprintJpaMapper sprintJpaMapper;
    @Autowired WorkspaceJpaMapper workspaceJpaMapper;
    @Autowired TransactionTemplate transactionTemplate;

    private ExecutorService executor;
    private String workspaceId;
    private String sprintOneId;
    private String sprintTwoId;

    @BeforeEach
    void setUp() {
        executor = Executors.newFixedThreadPool(3);

        transactionTemplate.executeWithoutResult(ignored -> {
            Workspace workspace = workspaceJpaMapper.saveAndFlush(
                    Workspace.builder().name("Concurrency test workspace").build());
            workspaceId = workspace.getId();

            Sprint sprintOne = sprintJpaMapper.save(
                    Sprint.builder()
                            .name("Sprint 1")
                            .status(SprintStatus.ToDo)
                            .workspace(workspace)
                            .build());
            Sprint sprintTwo = sprintJpaMapper.save(
                    Sprint.builder()
                            .name("Sprint 2")
                            .status(SprintStatus.ToDo)
                            .workspace(workspace)
                            .build());
            sprintJpaMapper.flush();

            sprintOneId = sprintOne.getId();
            sprintTwoId = sprintTwo.getId();
        });
    }

    @AfterEach
    void tearDown() {
        executor.shutdownNow();
    }

    @Test
    @Timeout(20)
    void concurrentStarts_allowExactlyOneActiveSprint() throws Exception {
        CountDownLatch databaseLockAcquired = new CountDownLatch(1);
        CountDownLatch releaseDatabaseLock = new CountDownLatch(1);

        Future<?> lockHolder = executor.submit(() -> transactionTemplate.executeWithoutResult(ignored -> {
            workspaceJpaMapper.findByIdForUpdate(workspaceId).orElseThrow();
            databaseLockAcquired.countDown();
            await(releaseDatabaseLock, Duration.ofSeconds(10));
        }));

        assertThat(databaseLockAcquired.await(5, TimeUnit.SECONDS)).isTrue();

        CountDownLatch callersReady = new CountDownLatch(2);
        CountDownLatch startTogether = new CountDownLatch(1);
        Future<Throwable> firstStart = executor.submit(startAttempt(sprintOneId, callersReady, startTogether));
        Future<Throwable> secondStart = executor.submit(startAttempt(sprintTwoId, callersReady, startTogether));

        try {
            assertThat(callersReady.await(5, TimeUnit.SECONDS)).isTrue();
            startTogether.countDown();

            // Both transactions must wait for the same Workspace row lock.
            Thread.sleep(500);
            assertFalse(firstStart.isDone());
            assertFalse(secondStart.isDone());
        } finally {
            releaseDatabaseLock.countDown();
        }

        lockHolder.get(5, TimeUnit.SECONDS);
        List<Throwable> results = Arrays.asList(
                firstStart.get(5, TimeUnit.SECONDS), secondStart.get(5, TimeUnit.SECONDS));

        assertThat(results).filteredOn(result -> result == null).hasSize(1);
        Throwable rejectedStart = results.stream().filter(Objects::nonNull).findFirst().orElseThrow();
        assertThat(rejectedStart).isInstanceOf(AppException.class);
        assertThat(((AppException) rejectedStart).getErrorCode()).isEqualTo(ErrorCode.SPRINT_ALREADY_ACTIVE);

        List<Sprint> persistedSprints = sprintJpaMapper.findAllById(List.of(sprintOneId, sprintTwoId));
        assertThat(persistedSprints)
                .filteredOn(sprint -> sprint.getStatus() == SprintStatus.InProgress)
                .hasSize(1);
        assertThat(persistedSprints)
                .filteredOn(sprint -> sprint.getStatus() == SprintStatus.ToDo)
                .hasSize(1);
    }

    private Callable<Throwable> startAttempt(
            String sprintId, CountDownLatch callersReady, CountDownLatch startTogether) {
        return () -> {
            callersReady.countDown();
            await(startTogether, Duration.ofSeconds(5));
            try {
                sprintAppService.startSprint(sprintId);
                return null;
            } catch (Throwable throwable) {
                return throwable;
            }
        };
    }

    private static void await(CountDownLatch latch, Duration timeout) {
        try {
            if (!latch.await(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                throw new IllegalStateException("Timed out while coordinating concurrent test threads");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent test thread was interrupted", exception);
        }
    }

}
