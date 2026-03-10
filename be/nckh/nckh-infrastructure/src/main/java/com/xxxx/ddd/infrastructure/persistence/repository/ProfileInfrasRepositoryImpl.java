package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.ProfileJpaMapper;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProfileInfrasRepositoryImpl implements ProfileRepository {
    private final ProfileJpaMapper jpa;

    @Override
    public Optional<Profile> findByUserId(String userId) {
        return jpa.findByUserId(userId);
    }

    @Override
    public Optional<Profile> findByEmail(String email) {
        return jpa.findByEmail(email);
    }

    @Override
    public Profile save(Profile profile) {
        return jpa.save(profile);
    }

    @Override
    public List<Profile> findAll() {
        return jpa.findAll();
    }


}
