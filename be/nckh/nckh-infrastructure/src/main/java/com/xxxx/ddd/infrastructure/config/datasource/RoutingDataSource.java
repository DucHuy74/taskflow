package com.xxxx.ddd.infrastructure.config.datasource;

import com.xxxx.dddd.domain.model.enums.DataSourceType;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey(){
        return DataSourceContextHolder.get();
    }
}
