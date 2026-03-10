package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.Profile;

import java.util.List;
import java.util.Optional;

public interface ProfileRepository {
    Optional<Profile> findByUserId(String userId);
    Optional<Profile> findByEmail(String email);

    Profile save(Profile profile);

    List<Profile> findAll();
}
