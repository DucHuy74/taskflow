package com.xxxx.dddd.domain.model.entity.workspace;

import com.xxxx.dddd.domain.model.enums.InvitationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "workspace_invitations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceInvitation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String email;

    private String workspaceId;

    private String inviterId;

    private String inviteeUserId;

    @Enumerated(EnumType.STRING)
    private InvitationStatus status;

    private Instant expiredAt;
}
