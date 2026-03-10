package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.UserStoryJpaMapper;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserStoryInfrasRepositoryImpl implements UserStoryRepository {

    private final UserStoryJpaMapper jpa;

    @Override
    public List<UserStory> findByWorkspace_IdAndSprintIsNull(String workspaceId){
        return jpa.findByWorkspace_IdAndSprintIsNull(workspaceId);
    }

    @Override
    public List<UserStory> findBySprint_Id(String sprintId){
        return jpa.findBySprint_Id(sprintId);
    }

    @Override
    public UserStory save(UserStory userStory){
        return jpa.save(userStory);
    }

    @Override
    public List<UserStory> saveAll(List<UserStory> userStories){
        return jpa.saveAll(userStories);
    }

    @Override
    public Optional<UserStory> findById(String userStoryId){
        return jpa.findById(userStoryId);
    }

    @Override
    public void delete(String userStoryId) {
        jpa.deleteById(userStoryId);
    }
}
