package com.xxxx.dddd.domain.model.entity.workspace;

import com.xxxx.dddd.domain.model.enums.Permission;
import com.xxxx.dddd.domain.model.enums.PermissionEffect;
import com.xxxx.dddd.domain.model.enums.PrincipalType;
import com.xxxx.dddd.domain.model.enums.ResourceType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Object-level ACL statement (S3-like): Principal + Action + Resource + Effect.
 */
@Entity
@Table(
        name = "resource_grant",
        indexes = {
                @Index(name = "idx_grant_workspace", columnList = "workspace_id"),
                @Index(name = "idx_grant_resource", columnList = "workspace_id,resource_type,resource_id")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResourceGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "grant_id")
    String id;

    @Column(name = "workspace_id", nullable = false)
    String workspaceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false)
    ResourceType resourceType;

    @Column(name = "resource_id", nullable = false)
    String resourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "principal_type", nullable = false)
    PrincipalType principalType;

    @Column(name = "principal_id", nullable = false)
    String principalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false)
    Permission permission;

    @Enumerated(EnumType.STRING)
    @Column(name = "effect", nullable = false)
    PermissionEffect effect;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;
}
