package com.xxxx.ddd.application.service.profile.impl;

import com.xxxx.ddd.application.mapper.ProfileMapper;
import com.xxxx.ddd.application.model.dto.request.RegistrationRequest;
import com.xxxx.ddd.application.model.dto.response.ProfileResponse;
import com.xxxx.ddd.application.service.profile.ProfileAppService;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.identity.IdentityService;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.repository.ProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProfileAppServiceImpl implements ProfileAppService {

    ProfileRepository profileRepository;
    ProfileMapper profileMapper;
    IdentityService identityService;

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public List<ProfileResponse> getAllProfiles() {
        return profileRepository.findAll()
                .stream()
                .map(profileMapper::toProfileResponse)
                .toList();
    }

    @Override
    public ProfileResponse getMyProfile() {
        String userId = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        var profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return profileMapper.toProfileResponse(profile);
    }

    @Override
    public ProfileResponse register(RegistrationRequest request) {

        //delegate toàn bộ Keycloak logic
        String userId = identityService.createUser(
                request.getUsername(),
                request.getFirstName(),
                request.getLastName(),
                request.getEmail(),
                request.getPassword()
        );

        var profile = profileMapper.toProfile(request);
        profile.setUserId(userId);

        profile = profileRepository.save(profile);

        return profileMapper.toProfileResponse(profile);
    }

    public Profile getOrCreateCurrentProfile() {

        var authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        String userId = jwt.getToken().getSubject();

        return profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Profile profile = Profile.builder()
                            .userId(userId)
                            .email(jwt.getToken().getClaim("email"))
                            .username(jwt.getToken().getClaim("preferred_username"))
                            .firstName(jwt.getToken().getClaim("given_name"))
                            .lastName(jwt.getToken().getClaim("family_name"))
                            .build();
                    return profileRepository.save(profile);
                });
    }
}
