package com.xxxx.dddd.domain.model.entity;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "backlog")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Backlog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "blg_id")
    String id;

    @Column(name = "blg_name", length = 100, nullable = false)
    String name;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wsp_id", nullable = false, unique = true)
    Workspace workspace;

    @OneToMany(mappedBy = "backlog")
    private List<UserStory> userStories;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}