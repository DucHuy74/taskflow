package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;

import java.util.List;
import java.util.Optional;


public interface WorkspaceMemberRepository {
    Optional<WorkspaceMember> findByWorkspace_IdAndProfile_UserId(
            String workspaceId,
            String userId
    );

    List<WorkspaceMember> findAllByProfile_UserId(String userId);

    List<WorkspaceMember> findAllByWorkspace_Id(String workspaceId);;

    WorkspaceMember save(WorkspaceMember workspaceMember);
}
