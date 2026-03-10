package com.xxxx.dddd.domain.repository;

import com.xxxx.dddd.domain.model.entity.Notification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository {
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);
    Notification save(Notification notification);

    Optional<Notification> findById(String notificationId);

    @Transactional
    @Modifying
    @Query("""
        update Notification n
        set n.read = true
        where n.userId = :userId
          and n.read = false
    """)
    int markAllAsReadByUserId(@Param("userId") String userId);
}
