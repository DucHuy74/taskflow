package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.UserStory;
import org.springframework.data.jpa.repository.JpaRepository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

import java.util.List;

public interface UserStoryJpaMapper extends JpaRepository<UserStory, String> {
    List<UserStory> findByWorkspace_IdAndSprintIsNull(String workspaceId);

    List<UserStory> findBySprint_Id(String sprintId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserStory u where u.id = :userStoryId")
    Optional<UserStory> findByIdForUpdate(
            @Param("userStoryId") String userStoryId);
}
