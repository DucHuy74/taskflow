package com.xxxx.ddd.application.model.dto.response;

import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkspaceMemberResponse {
    String userId;
    String email;
    WorkspaceRoleType role;
}
