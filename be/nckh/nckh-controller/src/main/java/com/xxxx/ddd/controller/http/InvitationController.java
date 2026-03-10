package com.xxxx.ddd.controller.http;

import com.xxxx.ddd.application.model.dto.response.InvitationResponse;
import com.xxxx.ddd.application.service.invitation.InvitationAppService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/{invitationId}/accept")
    public ResponseEntity<Void> accept(@PathVariable("invitationId") String invitationId) {

        JwtAuthenticationToken auth =
                (JwtAuthenticationToken) SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String userId = auth.getToken().getSubject();

        invitationService.accept(invitationId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{invitationId}/deny")
    public ResponseEntity<Void> deny(@PathVariable("invitationId") String invitationId) {

        JwtAuthenticationToken auth =
                (JwtAuthenticationToken) SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String userId = auth.getToken().getSubject();

        invitationService.deny(invitationId, userId);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/pending")
    public ResponseEntity<List<InvitationResponse>> myPendingInvitations() {

        var auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = ((JwtAuthenticationToken) auth).getToken().getSubject();

        return ResponseEntity.ok(
                invitationService.getMyPendingInvitations(userId)
        );
    }
}