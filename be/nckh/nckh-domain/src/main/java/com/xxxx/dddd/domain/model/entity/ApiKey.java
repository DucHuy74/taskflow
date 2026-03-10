package com.xxxx.dddd.domain.model.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Date;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "api_keys")
public class ApiKey {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "api_key")
    String apiKey;

    Boolean status = true;

    @Temporal(TemporalType.TIMESTAMP)
    Date expiryDate;
}
