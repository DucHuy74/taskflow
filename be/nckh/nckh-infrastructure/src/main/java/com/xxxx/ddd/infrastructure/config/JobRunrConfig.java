package com.xxxx.ddd.infrastructure.config;

import lombok.RequiredArgsConstructor;
import org.jobrunr.configuration.JobRunr;
import org.jobrunr.scheduling.JobScheduler;
import org.jobrunr.server.JobActivator;
import org.jobrunr.storage.StorageProvider;
import org.jobrunr.storage.sql.mysql.MySqlStorageProvider;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
@RequiredArgsConstructor
public class JobRunrConfig {

    private final ApplicationContext applicationContext;

    @Bean
    public StorageProvider storageProvider(DataSource dataSource){
        return new MySqlStorageProvider(dataSource);
    }

    @Bean
    JobActivator jobActivator(){
        return applicationContext::getBean;
    }

    @Bean
    public JobScheduler jobScheduler(StorageProvider storageProvider, JobActivator jobActivator){
        return JobRunr.configure()
                .useStorageProvider(storageProvider)
                .useJobActivator(jobActivator)
                .useBackgroundJobServer()
                .useDashboard(8001)
                .initialize()
                .getJobScheduler();
    }
}
