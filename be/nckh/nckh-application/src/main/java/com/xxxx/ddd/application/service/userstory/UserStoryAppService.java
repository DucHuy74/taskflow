package com.xxxx.ddd.application.service.userstory;

import com.xxxx.ddd.application.model.dto.request.UserStoryCreateRequest;
import com.xxxx.ddd.application.model.dto.request.UserStoryStatusUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;

import java.util.List;

public interface UserStoryAppService {
//    UserStoryResponse create(String workspaceId, UserStoryCreateRequest request);

    List<UserStoryResponse> getBacklog(String workspaceId);

    List<UserStoryResponse> getBySprint(String sprintId);

    UserStoryResponse updateStatus(String userStoryId, UserStoryStatusUpdateRequest request);

    void delete(String userStoryId);

    UserStoryResponse getById(String userStoryId);

    List<UserStoryResponse> create(String workspaceId, List<UserStoryCreateRequest> request);
}
