package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.response.InvitationResponse;
import com.xxxx.ddd.application.service.invitation.InvitationAppService;
import com.xxxx.ddd.common.dto.ApiResponse;
import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InvitationController {
    InvitationAppService invitationService;

    private String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof JwtAuthenticationToken jwt) {
            return jwt.getToken().getSubject();
        }
        throw new AppException(ErrorCode.UNAUTHENTICATED);
    }

    @PostMapping("/{invitationId}/accept")
    public ApiResponse<Void> accept(@PathVariable("invitationId") String invitationId) {

        invitationService.accept(invitationId, getCurrentUserId());

        return ApiResponse.<Void>builder()
                .message("Invitation accepted")
                .build();
    }

    @PostMapping("/{invitationId}/deny")
    public ApiResponse<Void> deny(@PathVariable("invitationId") String invitationId) {

        invitationService.deny(invitationId, getCurrentUserId());

        return ApiResponse.<Void>builder()
                .message("Invitation denied")
                .build();
    }

    @GetMapping("/pending")
    public ApiResponse<List<InvitationResponse>> myPendingInvitations() {
        return ApiResponse.<List<InvitationResponse>>builder()
                .result(invitationService.getMyPendingInvitations(getCurrentUserId()))
                .build();
    }
}
