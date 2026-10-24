package com.xxxx.sprint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.xxxx.ddd.application.service.sprint.SprintAppService;
import com.xxxx.ddd.application.service.sprint.SprintStoryRetryService;
import com.xxxx.ddd.infrastructure.persistence.mapper.SprintJpaMapper;
import com.xxxx.ddd.infrastructure.persistence.mapper.UserStoryJpaMapper;
import com.xxxx.ddd.infrastructure.persistence.mapper.WorkspaceJpaMapper;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import com.xxxx.dddd.domain.model.enums.UserStoryStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.OptimisticLockingFailureException;
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
@Import(SprintStoryRetryService.class)
@Testcontainers
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SprintStoryRetryIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4");

    @MockBean SprintAppService sprintAppService;

    @Autowired SprintStoryRetryService retryService;
    @Autowired SprintJpaMapper sprintJpaMapper;
    @Autowired UserStoryJpaMapper userStoryJpaMapper;
    @Autowired WorkspaceJpaMapper workspaceJpaMapper;
    @Autowired TransactionTemplate transactionTemplate;
    @PersistenceContext EntityManager entityManager;

    @Test
    @Timeout(20)
    void lockFailureAfterFlush_rollsBackBeforeRetry_thenCommitsSuccessfulAttempt() {
        // Commit the fixture before invoking the retry service's independent transactions.
        Fixture fixture = transactionTemplate.execute(ignored -> {
            Workspace workspace = workspaceJpaMapper.saveAndFlush(
                    Workspace.builder().name("Retry rollback test workspace").build());
            Sprint sprint = sprintJpaMapper.saveAndFlush(Sprint.builder()
                    .name("Retry target sprint")
                    .status(SprintStatus.ToDo)
                    .workspace(workspace)
                    .build());
            UserStory story = userStoryJpaMapper.saveAndFlush(UserStory.builder()
                    .storyText("Original story")
                    .status(UserStoryStatus.ToDo)
                    .workspace(workspace)
                    .build());
            return new Fixture(sprint.getId(), story.getId());
        });
        assertThat(fixture).isNotNull();

        List<String> storyIds = List.of(fixture.storyId());
        AtomicInteger attempts = new AtomicInteger();
        doAnswer(invocation -> {
            int attempt = attempts.incrementAndGet();
            assertThat(entityManager.isJoinedToTransaction()).isTrue();
            UserStory story = userStoryJpaMapper.findById(fixture.storyId()).orElseThrow();

            // In particular, attempt 2 must see the original database values after rollback.
            assertThat(story.getStoryText()).isEqualTo("Original story");
            assertThat(story.getStatus()).isEqualTo(UserStoryStatus.ToDo);
            assertThat(story.getSprint()).isNull();

            story.setStoryText(attempt == 1 ? "Failed attempt change" : "Committed retry change");
            story.setStatus(UserStoryStatus.InProgress);
            story.setSprint(sprintJpaMapper.findById(fixture.sprintId()).orElseThrow());
            entityManager.flush();

            if (attempt == 1) {
                // Clear the first-level cache and prove the UPDATE reached MySQL before failing.
                entityManager.clear();
                UserStory flushedStory = userStoryJpaMapper.findById(fixture.storyId()).orElseThrow();
                assertThat(flushedStory.getStoryText()).isEqualTo("Failed attempt change");
                assertThat(flushedStory.getSprint().getId()).isEqualTo(fixture.sprintId());
                throw new CannotAcquireLockException("Simulated lock failure after flush");
            }
            return null;
        }).when(sprintAppService).addUserStoriesToSprint(fixture.sprintId(), storyIds);

        retryService.addUserStoriesToSprint(fixture.sprintId(), storyIds);

        assertThat(attempts.get()).isEqualTo(2);
        verify(sprintAppService, times(2)).addUserStoriesToSprint(fixture.sprintId(), storyIds);

        // A separate transaction proves the successful retry was committed, not merely flushed.
        transactionTemplate.executeWithoutResult(ignored -> {
            UserStory committedStory = userStoryJpaMapper.findById(fixture.storyId()).orElseThrow();
            assertThat(committedStory.getStoryText()).isEqualTo("Committed retry change");
            assertThat(committedStory.getStatus()).isEqualTo(UserStoryStatus.InProgress);
            assertThat(committedStory.getSprint().getId()).isEqualTo(fixture.sprintId());
        });
    }

    @Test
    @Timeout(20)
    void staleUpdate_isRejectedAndKeepsFirstCommittedChange() throws Exception {
        String storyId = transactionTemplate.execute(ignored -> {
            Workspace workspace = workspaceJpaMapper.saveAndFlush(
                    Workspace.builder()
                            .name("Optimistic locking test")
                            .build());

            UserStory story = userStoryJpaMapper.saveAndFlush(
                    UserStory.builder()
                            .storyText("Original")
                            .status(UserStoryStatus.ToDo)
                            .workspace(workspace)
                            .build());

            assertThat(story.getVersion()).isEqualTo(0L);
            return story.getId();
        });

        assertThat(storyId).isNotNull();

        CountDownLatch secondHasRead = new CountDownLatch(1);
        CountDownLatch firstHasCommitted = new CountDownLatch(1);
        var executor = Executors.newSingleThreadExecutor();

        try {
            // T2 reads version 0 and keeps that entity in its transaction.
            var secondUpdate = executor.submit(() -> {
                try {
                    transactionTemplate.executeWithoutResult(ignored -> {
                        UserStory story = userStoryJpaMapper
                                .findById(storyId).orElseThrow();

                        assertThat(story.getVersion()).isEqualTo(0L);
                        secondHasRead.countDown();

                        awaitLatch(firstHasCommitted);

                        story.setStoryText("Changed by T2");

                        // Flush through the repository so Spring translates Hibernate's exception.
                        userStoryJpaMapper.flush();
                    });
                    return (Throwable) null;
                } catch (RuntimeException exception) {
                    return exception;
                }
            });

            assertThat(secondHasRead.await(5, TimeUnit.SECONDS)).isTrue();

            // T1 also reads version 0, then updates and commits before T2.
            transactionTemplate.executeWithoutResult(ignored -> {
                UserStory story = userStoryJpaMapper
                        .findById(storyId).orElseThrow();

                assertThat(story.getVersion()).isEqualTo(0L);
                story.setStoryText("Changed by T1");
                userStoryJpaMapper.flush();

                assertThat(story.getVersion()).isEqualTo(1L);
            });

            // Returning from executeWithoutResult means T1 has committed.
            firstHasCommitted.countDown();

            Throwable rejectedUpdate = secondUpdate.get(5, TimeUnit.SECONDS);

            assertThat(rejectedUpdate)
                    .isInstanceOf(OptimisticLockingFailureException.class);

            // Verify committed state in a new transaction.
            transactionTemplate.executeWithoutResult(ignored -> {
                UserStory story = userStoryJpaMapper
                        .findById(storyId).orElseThrow();

                assertThat(story.getStoryText()).isEqualTo("Changed by T1");
                assertThat(story.getVersion()).isEqualTo(1L);
            });
        } finally {
            firstHasCommitted.countDown();
            executor.shutdownNow();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    private static void awaitLatch(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for transaction");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Test interrupted", exception);
        }
    }

    private record Fixture(String sprintId, String storyId) {}
}
