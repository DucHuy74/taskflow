package com.xxxx.sprint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

import com.xxxx.ddd.application.mapper.UserStoryMapperImpl;
import com.xxxx.ddd.application.model.dto.request.UserStoryUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;
import com.xxxx.ddd.application.port.async.UserStoryEventPort;
import com.xxxx.ddd.application.service.access.WorkspaceAccessService;
import com.xxxx.ddd.application.service.userstory.UserStoryAppService;
import com.xxxx.ddd.application.service.userstory.impl.UserStoryAppServiceImpl;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.ddd.infrastructure.persistence.mapper.UserStoryJpaMapper;
import com.xxxx.ddd.infrastructure.persistence.mapper.WorkspaceJpaMapper;
import com.xxxx.ddd.infrastructure.persistence.repository.SprintInfrasRepositoryImpl;
import com.xxxx.ddd.infrastructure.persistence.repository.UserStoryInfrasRepositoryImpl;
import com.xxxx.ddd.infrastructure.persistence.repository.WorkspaceInfrasRepositoryImpl;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.UserStoryStatus;
import java.util.ArrayList;
import java.util.List;
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
    "spring.flyway.enabled=false",
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
    UserStoryAppServiceImpl.class,
    UserStoryMapperImpl.class,
    SprintInfrasRepositoryImpl.class,
    WorkspaceInfrasRepositoryImpl.class,
    UserStoryInfrasRepositoryImpl.class
})
@Testcontainers
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class UserStoryUpdateConcurrencyIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4");

    @MockBean WorkspaceAccessService workspaceAccessService;
    @MockBean UserStoryEventPort userStoryEventPort;

    @Autowired UserStoryAppService userStoryAppService;
    @Autowired UserStoryJpaMapper userStoryJpaMapper;
    @Autowired WorkspaceJpaMapper workspaceJpaMapper;
    @Autowired TransactionTemplate transactionTemplate;

    private ExecutorService executor;
    private String storyId;

    @BeforeEach
    void setUp() {
        executor = Executors.newFixedThreadPool(2);

        storyId = transactionTemplate.execute(ignored -> {
            Workspace workspace = workspaceJpaMapper.saveAndFlush(
                    Workspace.builder().name("Story update test workspace").build());
            UserStory story = userStoryJpaMapper.saveAndFlush(UserStory.builder()
                    .storyText("Original")
                    .status(UserStoryStatus.ToDo)
                    .workspace(workspace)
                    .build());
            assertThat(story.getVersion()).isEqualTo(0L);
            return story.getId();
        });
    }

    @AfterEach
    void tearDown() throws InterruptedException {
        executor.shutdownNow();
        executor.awaitTermination(5, TimeUnit.SECONDS);
    }

    @Test
    @Timeout(20)
    void updateWithCurrentVersion_succeedsAndReturnsNewVersion() {
        UserStoryResponse response = userStoryAppService.update(
                storyId, new UserStoryUpdateRequest("Edited", 0L));

        // The service flushes before mapping, so the response already carries the incremented version.
        assertThat(response.getStoryText()).isEqualTo("Edited");
        assertThat(response.getVersion()).isEqualTo(1L);
        assertCommittedState("Edited", 1L);
    }

    @Test
    @Timeout(20)
    void updateWithStaleVersion_isRejectedAndKeepsCommittedContent() {
        userStoryAppService.update(storyId, new UserStoryUpdateRequest("First edit", 0L));

        // A client that still holds version 0 re-sends its old form.
        assertThatThrownBy(() -> userStoryAppService.update(
                storyId, new UserStoryUpdateRequest("Stale edit", 0L)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.USER_STORY_VERSION_CONFLICT);

        assertCommittedState("First edit", 1L);
    }

    @Test
    @Timeout(20)
    void concurrentUpdatesPassingPrecheck_oneSucceedsAndOtherGetsVersionConflict() throws Exception {
        // Both callers have already read version 0 when they reach the permission check;
        // the latch makes both pass the version precheck before either one flushes.
        CountDownLatch bothHaveRead = new CountDownLatch(2);
        doAnswer(invocation -> {
            bothHaveRead.countDown();
            if (!bothHaveRead.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for the other caller");
            }
            return null;
        }).when(workspaceAccessService).requireUserStory(any(UserStory.class), eq(Permission.ISSUE_EDIT));

        List<Future<Throwable>> futures = new ArrayList<>();
        for (String text : List.of("Edit A", "Edit B")) {
            futures.add(executor.submit(() -> {
                try {
                    userStoryAppService.update(storyId, new UserStoryUpdateRequest(text, 0L));
                    return (Throwable) null;
                } catch (RuntimeException exception) {
                    return exception;
                }
            }));
        }

        List<Throwable> results = new ArrayList<>();
        for (Future<Throwable> future : futures) {
            results.add(future.get(10, TimeUnit.SECONDS));
        }

        assertThat(results).filteredOn(result -> result == null).hasSize(1);
        assertThat(results).filteredOn(result -> result != null)
                .singleElement()
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.USER_STORY_VERSION_CONFLICT);

        // Exactly one edit was applied; which one wins is not fixed.
        transactionTemplate.executeWithoutResult(ignored -> {
            UserStory story = userStoryJpaMapper.findById(storyId).orElseThrow();
            assertThat(story.getStoryText()).isIn("Edit A", "Edit B");
            assertThat(story.getVersion()).isEqualTo(1L);
        });
    }

    private void assertCommittedState(String expectedText, long expectedVersion) {
        transactionTemplate.executeWithoutResult(ignored -> {
            UserStory story = userStoryJpaMapper.findById(storyId).orElseThrow();
            assertThat(story.getStoryText()).isEqualTo(expectedText);
            assertThat(story.getVersion()).isEqualTo(expectedVersion);
        });
    }
}
