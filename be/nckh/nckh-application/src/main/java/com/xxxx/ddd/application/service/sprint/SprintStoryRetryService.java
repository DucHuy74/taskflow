package com.xxxx.ddd.application.service.sprint;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Service
@Slf4j
public class SprintStoryRetryService {
    private final SprintAppService sprintAppService;
    private final RetryTemplate retryTemplate;
    private final TransactionTemplate transactionTemplate;

    public SprintStoryRetryService(
            SprintAppService sprintAppService,
            PlatformTransactionManager transactionManager) {

        this.sprintAppService = sprintAppService;

        this.retryTemplate = RetryTemplate.builder()
                .maxAttempts(3)
                .exponentialBackoff(100, 2, 500)
                .retryOn(PessimisticLockingFailureException.class)
                .traversingCauses()
                .build();

        this.transactionTemplate =
                new TransactionTemplate(transactionManager);

        this.transactionTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void addUserStoriesToSprint(
            String sprintId, List<String> userStoryIds) {

        retryTemplate.execute(context -> {
            if (context.getRetryCount() > 0) {
                log.warn(
                        "Retry add stories: sprintId={}, attempt={}",
                        sprintId,
                        context.getRetryCount() + 1);
            }

            transactionTemplate.executeWithoutResult(status ->
                    sprintAppService.addUserStoriesToSprint(
                            sprintId, userStoryIds));

            return null;
        });
    }
}
