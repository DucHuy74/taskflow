package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiKeyJpaMapper extends JpaRepository<ApiKey, String> {
}
