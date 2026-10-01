package com.xxxx.sprint;

import com.xxxx.ddd.application.service.sprint.SprintAppService;
import com.xxxx.ddd.application.service.sprint.SprintStoryRetryService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SprintStoryRetryServiceTest {

    private SprintAppService service;
    private PlatformTransactionManager transactionManager;
    private SprintStoryRetryService retryService;

    @BeforeEach
    void setUp() {
        service = mock(SprintAppService.class);
        transactionManager = mock(PlatformTransactionManager.class);

        // Mỗi lần bắt đầu transaction nhận một status riêng.
        when(transactionManager.getTransaction(
                any(TransactionDefinition.class)))
                .thenAnswer(invocation -> {
                    TransactionDefinition definition =
                            invocation.getArgument(0);

                    assertThat(definition.getPropagationBehavior())
                            .isEqualTo(
                                    TransactionDefinition.PROPAGATION_REQUIRES_NEW);

                    return mock(TransactionStatus.class);
                });

        retryService = new SprintStoryRetryService(
                service, transactionManager);
    }

    @Test
    void lockFailure_retriesAfterRollback_thenCommits() {
        List<String> ids = List.of("A", "B");

        doThrow(new CannotAcquireLockException("Simulated lock failure"))
                .doNothing()
                .when(service)
                .addUserStoriesToSprint("sprint-1", ids);

        retryService.addUserStoriesToSprint("sprint-1", ids);

        var order = inOrder(transactionManager, service);

        order.verify(transactionManager)
                .getTransaction(any(TransactionDefinition.class));
        order.verify(service).addUserStoriesToSprint("sprint-1", ids);
        order.verify(transactionManager)
                .rollback(any(TransactionStatus.class));

        order.verify(transactionManager)
                .getTransaction(any(TransactionDefinition.class));
        order.verify(service).addUserStoriesToSprint("sprint-1", ids);
        order.verify(transactionManager)
                .commit(any(TransactionStatus.class));

        verify(service, times(2))
                .addUserStoriesToSprint("sprint-1", ids);
    }

    @Test
    void businessFailure_doesNotRetry() {
        List<String> ids = List.of("A", "B");
        AppException failure =
                new AppException(ErrorCode.SPRINT_INVALID_STATE);

        doThrow(failure).when(service)
                .addUserStoriesToSprint("sprint-1", ids);

        assertThatThrownBy(() ->
                retryService.addUserStoriesToSprint("sprint-1", ids))
                .isSameAs(failure);

        verify(service, times(1))
                .addUserStoriesToSprint("sprint-1", ids);
        verify(transactionManager, times(1))
                .rollback(any(TransactionStatus.class));
        verify(transactionManager, never())
                .commit(any(TransactionStatus.class));
    }

    @Test
    void repeatedLockFailure_stopsAfterThreeAttempts() {
        List<String> ids = List.of("A", "B");
        CannotAcquireLockException failure =
                new CannotAcquireLockException("Simulated lock failure");

        doThrow(failure).when(service)
                .addUserStoriesToSprint("sprint-1", ids);

        assertThatThrownBy(() ->
                retryService.addUserStoriesToSprint("sprint-1", ids))
                .isSameAs(failure);

        verify(service, times(3))
                .addUserStoriesToSprint("sprint-1", ids);
        verify(transactionManager, times(3))
                .getTransaction(any(TransactionDefinition.class));
        verify(transactionManager, times(3))
                .rollback(any(TransactionStatus.class));
        verify(transactionManager, never())
                .commit(any(TransactionStatus.class));
    }
}
