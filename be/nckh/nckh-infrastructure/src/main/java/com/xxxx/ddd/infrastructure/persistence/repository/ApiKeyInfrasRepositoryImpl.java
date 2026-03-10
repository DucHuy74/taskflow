package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.ApiKeyJpaMapper;
import com.xxxx.dddd.domain.model.entity.ApiKey;
import com.xxxx.dddd.domain.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ApiKeyInfrasRepositoryImpl implements ApiKeyRepository {

    private final ApiKeyJpaMapper jpa;

    @Override
    public ApiKey save(ApiKey apiKey) {
        return jpa.save(apiKey);
    }

    @Override
    public long count() {
        return jpa.count();
    }

    @Override
    public Optional<ApiKey> findById(String apiKey) {
        return jpa.findById(apiKey);
    }
}
