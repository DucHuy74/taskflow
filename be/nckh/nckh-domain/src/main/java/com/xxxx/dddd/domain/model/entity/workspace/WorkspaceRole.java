package com.xxxx.dddd.domain.model.entity.workspace;

import com.xxxx.dddd.domain.model.enums.WorkspaceRoleType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "workspace_role")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WorkspaceRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "wsp_role_id")
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wsp_id", nullable = false)
    Workspace workspace;

    @Enumerated(EnumType.STRING)
    @Column(name = "wsp_role_name", nullable = false)
    WorkspaceRoleType roleName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}