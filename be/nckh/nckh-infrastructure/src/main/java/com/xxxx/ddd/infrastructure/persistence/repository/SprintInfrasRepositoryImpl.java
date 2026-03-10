package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.SprintJpaMapper;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.enums.SprintStatus;
import com.xxxx.dddd.domain.repository.SprintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class SprintInfrasRepositoryImpl implements SprintRepository {
    private final SprintJpaMapper jpa;

    @Override
    public List<Sprint> findByWorkspace_IdOrderByCreatedAtDesc(String workspaceId){
        return jpa.findByWorkspace_IdOrderByCreatedAtDesc(workspaceId);
    }

    @Override
    public boolean existsByWorkspace_IdAndStatus(String workspaceId, SprintStatus status){
        return jpa.existsByWorkspace_IdAndStatus(workspaceId, status);
    }

    @Override
    public Sprint save(Sprint sprint){
        return jpa.save(sprint);
    }
    @Override
    public Optional<Sprint> findById(String sprintId){
        return jpa.findById(sprintId);
    }

}
