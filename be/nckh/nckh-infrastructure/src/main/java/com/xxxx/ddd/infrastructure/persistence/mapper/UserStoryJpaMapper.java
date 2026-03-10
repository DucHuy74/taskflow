package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.UserStory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserStoryJpaMapper extends JpaRepository<UserStory, String> {
    List<UserStory> findByWorkspace_IdAndSprintIsNull(String workspaceId);

    List<UserStory> findBySprint_Id(String sprintId);
}
