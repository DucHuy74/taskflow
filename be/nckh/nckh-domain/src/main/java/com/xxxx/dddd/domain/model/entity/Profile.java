package com.xxxx.dddd.domain.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.xxxx.dddd.domain.model.entity.workspace.WorkspaceMember;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "profile")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "profile_id")
    String profileId;

    String userId;
    String email;
    String username;
    String firstName;
    String lastName;
    LocalDate dob;

    @JsonIgnore
    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<WorkspaceMember> workspaceMembers;
}
