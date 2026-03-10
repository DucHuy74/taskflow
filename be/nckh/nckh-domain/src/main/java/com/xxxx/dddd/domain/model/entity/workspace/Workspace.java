package com.xxxx.dddd.domain.model.entity.workspace;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.xxxx.dddd.domain.model.entity.Backlog;
import com.xxxx.dddd.domain.model.entity.Sprint;
import com.xxxx.dddd.domain.model.entity.UserStory;
import com.xxxx.dddd.domain.model.enums.WorkspaceAccess;
import com.xxxx.dddd.domain.model.enums.WorkspaceType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "workspace")
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "wsp_id")
    String id;

    @Column(name = "wsp_name", length = 100, nullable = false)
    String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "wsp_type", length = 50)
    WorkspaceType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "wsp_access", length = 20)
    WorkspaceAccess access;

    @CreationTimestamp
    @Column(updatable = false)
    LocalDate createdAt;

    @UpdateTimestamp
    LocalDate updatedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<WorkspaceRole> workspaceRoles;


    @JsonIgnore
    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<WorkspaceMember> members;

    @JsonIgnore
    @OneToOne(mappedBy = "workspace", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Backlog backlog;


    @JsonIgnore
    @OneToMany(mappedBy = "workspace", fetch = FetchType.LAZY)
    Set<Sprint> sprints;

    @OneToMany(mappedBy = "workspace")
    Set<UserStory> userStories;
}
