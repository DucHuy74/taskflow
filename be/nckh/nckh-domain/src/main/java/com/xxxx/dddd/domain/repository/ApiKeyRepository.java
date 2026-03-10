package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.ApiKey;

import java.util.Optional;

public interface ApiKeyRepository {
    ApiKey save(ApiKey apiKey);

    long count();

    Optional<ApiKey> findById(String apiKey);
}
