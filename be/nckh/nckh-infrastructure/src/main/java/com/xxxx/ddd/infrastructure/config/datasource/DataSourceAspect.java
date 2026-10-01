package com.xxxx.ddd.infrastructure.config.datasource;

import com.xxxx.dddd.domain.model.enums.DataSourceType;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class DataSourceAspect {
    @Before("@annotation(com.xxxx.ddd.application.annotation.ReadOnly)")
    public void setReadOnly() {
        DataSourceContextHolder.set(DataSourceType.SLAVE);
    }

    @After("@annotation(com.xxxx.ddd.application.annotation.ReadOnly)")
    public void clear() {
        DataSourceContextHolder.clear();
    }
}
