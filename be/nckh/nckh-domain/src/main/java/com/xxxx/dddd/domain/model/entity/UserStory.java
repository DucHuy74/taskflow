package com.xxxx.dddd.domain.model.entity;

import com.xxxx.dddd.domain.model.entity.workspace.Workspace;
import com.xxxx.dddd.domain.model.enums.UserStoryStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_story")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserStory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "us_id")
    String id;

    @Column(name = "us_story_text", length = 255, nullable = false)
    String storyText;

    @Enumerated(EnumType.STRING)
    @Column(name = "us_status", nullable = false)
    UserStoryStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spr_id")
    Sprint sprint; // NULL = Backlog

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wsp_id", nullable = false)
    Workspace workspace;

    @ManyToOne
    @JoinColumn(name = "backlog_id")
    private Backlog backlog;


    @CreationTimestamp
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;
}


