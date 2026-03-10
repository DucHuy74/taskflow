package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.UserStory;

import java.util.List;
import java.util.Optional;

public interface UserStoryRepository {
    List<UserStory> findByWorkspace_IdAndSprintIsNull(String workspaceId);

    List<UserStory> findBySprint_Id(String sprintId);

    UserStory save(UserStory userStory);
    List<UserStory> saveAll(List<UserStory> userStories);

    Optional<UserStory> findById(String userStoryId);

    void delete(String userStoryId);
}
