package com.xxxx.ddd.application.service.profile.impl;

import com.xxxx.ddd.application.mapper.ProfileMapper;
import com.xxxx.ddd.application.model.dto.request.ProfileUpdateRequest;
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

    /**
     * Keycloak is updated first so a rejected/unreachable identity provider leaves the Profile row untouched.
     * If the DB write then fails, the Keycloak change is reverted (best effort) before the error is rethrown.
     * Intentionally not @Transactional: the repository save commits on its own so DB failures surface here.
     */
    @Override
    public ProfileResponse updateMyProfile(ProfileUpdateRequest request) {
        Profile profile = getOrCreateCurrentProfile();

        String userId = profile.getUserId();
        String previousFirstName = profile.getFirstName();
        String previousLastName = profile.getLastName();
        String firstName = request.getFirstName().trim();
        String lastName = request.getLastName().trim();

        identityService.updateUserName(userId, firstName, lastName);

        profile.setFirstName(firstName);
        profile.setLastName(lastName);
        profile.setDob(request.getDob());

        try {
            profile = profileRepository.save(profile);
        } catch (RuntimeException ex) {
            log.error("Profile update failed after Keycloak sync for userId={}, reverting Keycloak names", userId, ex);
            try {
                identityService.updateUserName(userId, previousFirstName, previousLastName);
            } catch (RuntimeException revertEx) {
                log.error("Could not revert Keycloak names for userId={}", userId, revertEx);
            }
            throw ex;
        }

        return profileMapper.toProfileResponse(profile);
    }

    public Profile getOrCreateCurrentProfile() {

        var authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
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
