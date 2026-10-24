package com.xxxx.ddd.application.service.profile;

import com.xxxx.ddd.application.mapper.ProfileMapper;
import com.xxxx.ddd.application.model.dto.request.ProfileUpdateRequest;
import com.xxxx.ddd.application.model.dto.response.ProfileResponse;
import com.xxxx.ddd.application.service.profile.impl.ProfileAppServiceImpl;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import com.xxxx.dddd.domain.identity.IdentityService;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.repository.ProfileRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProfileAppServiceImplTest {
    private ProfileRepository profiles;
    private IdentityService identity;
    private ProfileAppServiceImpl service;
    private Profile profile;

    @BeforeEach
    void setUp() {
        profiles = mock(ProfileRepository.class);
        identity = mock(IdentityService.class);
        ProfileMapper mapper = mock(ProfileMapper.class);
        service = new ProfileAppServiceImpl(profiles, mapper, identity);

        Jwt jwt = Jwt.withTokenValue("token").header("alg", "none").subject("user-1").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));

        profile = Profile.builder().userId("user-1").firstName("Old").lastName("Name").build();
        when(profiles.findByUserId("user-1")).thenReturn(Optional.of(profile));
        when(mapper.toProfileResponse(any())).thenAnswer(inv -> {
            Profile p = inv.getArgument(0);
            return ProfileResponse.builder().userId(p.getUserId())
                    .firstName(p.getFirstName()).lastName(p.getLastName()).dob(p.getDob()).build();
        });
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void syncsKeycloakThenSavesProfile() {
        when(profiles.save(any())).thenAnswer(inv -> inv.getArgument(0));
        LocalDate dob = LocalDate.of(1999, 1, 2);

        ProfileResponse response = service.updateMyProfile(new ProfileUpdateRequest(" Huy ", "Hoang", dob));

        var order = inOrder(identity, profiles);
        order.verify(identity).updateUserName("user-1", "Huy", "Hoang");
        order.verify(profiles).save(profile);
        assertThat(response.getFirstName()).isEqualTo("Huy");
        assertThat(response.getLastName()).isEqualTo("Hoang");
        assertThat(response.getDob()).isEqualTo(dob);
    }

    @Test
    void keycloakFailureLeavesProfileUntouched() {
        doThrow(new AppException(ErrorCode.IDENTITY_SYNC_FAILED))
                .when(identity).updateUserName(any(), any(), any());

        assertThatThrownBy(() -> service.updateMyProfile(new ProfileUpdateRequest("Huy", "Hoang", null)))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IDENTITY_SYNC_FAILED);

        verify(profiles, never()).save(any());
        assertThat(profile.getFirstName()).isEqualTo("Old");
    }

    @Test
    void dbFailureRevertsKeycloakNames() {
        when(profiles.save(any())).thenThrow(new IllegalStateException("db down"));

        assertThatThrownBy(() -> service.updateMyProfile(new ProfileUpdateRequest("Huy", "Hoang", null)))
                .isInstanceOf(IllegalStateException.class);

        verify(identity).updateUserName("user-1", "Huy", "Hoang");
        verify(identity).updateUserName("user-1", "Old", "Name");
    }
}
