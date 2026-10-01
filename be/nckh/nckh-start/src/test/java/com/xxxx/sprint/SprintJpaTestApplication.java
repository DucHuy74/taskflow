package com.xxxx.sprint;

import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootConfiguration
@EnableAutoConfiguration
@EntityScan(basePackages = "com.xxxx.dddd.domain.model.entity")
@EnableJpaRepositories(basePackages = "com.xxxx.ddd.infrastructure.persistence.mapper")
class SprintJpaTestApplication {

    @Bean
    TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
        return new TransactionTemplate(transactionManager);
    }
}
