package com.xxxx.ddd.infrastructure.config.datasource;

import com.xxxx.dddd.domain.model.enums.DataSourceType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class DataSourceConfig {
    @Value("${spring.datasource.master.url}")
    private String masterUrl;

    @Value("${spring.datasource.master.username}")
    private String masterUsername;

    @Value("${spring.datasource.master.password}")
    private String masterPassword;

    @Value("${spring.datasource.slave.url}")
    private String slaveUrl;

    @Value("${spring.datasource.slave.username}")
    private String slaveUsername;

    @Value("${spring.datasource.slave.password}")
    private String slavePassword;

    @Bean
    public DataSource dataSource() {

        DataSource master = DataSourceBuilder.create()
                .url(masterUrl)
                .username(masterUsername)
                .password(masterPassword)
                .build();

        DataSource slave = DataSourceBuilder.create()
                .url(slaveUrl)
                .username(slaveUsername)
                .password(slavePassword)
                .build();

        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put(DataSourceType.MASTER, master);
        targetDataSources.put(DataSourceType.SLAVE, slave);

        RoutingDataSource routingDataSource = new RoutingDataSource();
        routingDataSource.setTargetDataSources(targetDataSources);
        routingDataSource.setDefaultTargetDataSource(master);

        return routingDataSource;
    }
}
