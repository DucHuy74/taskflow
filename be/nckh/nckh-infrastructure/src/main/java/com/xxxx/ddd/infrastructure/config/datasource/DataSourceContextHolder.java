package com.xxxx.ddd.infrastructure.config.datasource;

import com.xxxx.dddd.domain.model.enums.DataSourceType;

public class DataSourceContextHolder {
    private static final ThreadLocal<DataSourceType> context = new ThreadLocal<>();

    public static void set(DataSourceType type) {
        context.set(type);
    }

    public static DataSourceType get() {
        return context.get();
    }

    public static void clear() {
        context.remove();
    }
}
