package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProfileJpaMapper extends JpaRepository<Profile, String> {
    Optional<Profile> findByEmail(String email);
    Optional<Profile> findByUserId(String userId);
}
