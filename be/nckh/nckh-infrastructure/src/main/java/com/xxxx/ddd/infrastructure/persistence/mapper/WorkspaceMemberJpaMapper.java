package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberJpaMapper extends JpaRepository<WorkspaceMember, String> {
    Optional<WorkspaceMember> findByWorkspace_IdAndProfile_UserId(
            String workspaceId,
            String userId
    );

    List<WorkspaceMember> findAllByProfile_UserId(String userId);

    List<WorkspaceMember> findAllByWorkspace_Id(String workspaceId);
}
