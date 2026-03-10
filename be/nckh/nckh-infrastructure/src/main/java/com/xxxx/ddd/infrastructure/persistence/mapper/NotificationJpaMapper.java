package com.xxxx.ddd.infrastructure.persistence.mapper;

import com.xxxx.dddd.domain.model.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface NotificationJpaMapper extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);
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
