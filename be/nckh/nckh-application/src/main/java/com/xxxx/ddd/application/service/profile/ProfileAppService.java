package com.xxxx.ddd.application.service.profile;

import com.xxxx.ddd.application.model.dto.request.ProfileUpdateRequest;
import com.xxxx.ddd.application.model.dto.request.RegistrationRequest;
import com.xxxx.ddd.application.model.dto.response.ProfileResponse;
import com.xxxx.dddd.domain.model.entity.Profile;

import java.util.List;

public interface ProfileAppService {
    List<ProfileResponse> getAllProfiles();

    ProfileResponse getMyProfile();

    ProfileResponse register(RegistrationRequest request);

    ProfileResponse updateMyProfile(ProfileUpdateRequest request);

    Profile getOrCreateCurrentProfile();
}
