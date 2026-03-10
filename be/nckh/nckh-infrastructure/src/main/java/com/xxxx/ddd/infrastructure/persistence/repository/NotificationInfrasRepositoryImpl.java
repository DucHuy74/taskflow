package com.xxxx.ddd.infrastructure.persistence.repository;

import com.xxxx.ddd.infrastructure.persistence.mapper.NotificationJpaMapper;
import com.xxxx.dddd.domain.model.entity.Notification;
import com.xxxx.dddd.domain.model.entity.Profile;
import com.xxxx.dddd.domain.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class NotificationInfrasRepositoryImpl implements NotificationRepository {
    private final NotificationJpaMapper jpa;

    @Override
    public Notification save(Notification notification) {
        return jpa.save(notification);
    }

    @Override
    public List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId){
        return jpa.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    @Override
    public Optional<Notification> findById(String notificationId) {
        return jpa.findById(notificationId);
    }

    @Override
    public int markAllAsReadByUserId(@Param("userId") String userId){
        return jpa.markAllAsReadByUserId(userId);
    }
}
