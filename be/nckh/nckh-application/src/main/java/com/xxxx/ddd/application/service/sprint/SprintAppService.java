package com.xxxx.ddd.application.service.sprint;

import com.xxxx.ddd.application.model.dto.request.SprintCreateRequest;
import com.xxxx.ddd.application.model.dto.response.SprintResponse;
import com.xxxx.ddd.application.model.dto.response.UserStoryResponse;

import java.util.List;

public interface SprintAppService {
    SprintResponse createSprint(String workspaceId, SprintCreateRequest request);

    List<SprintResponse> getSprints(String workspaceId);

    void startSprint(String sprintId);

    void completeSprint(String sprintId);

    void addUserStoryToSprint(String sprintId, String userStoryId);

    void removeUserStoryFromSprint(String userStoryId);

    List<UserStoryResponse> getBacklog(String workspaceId);

    List<UserStoryResponse> getUserStoriesOfSprint(String sprintId);
}
