package com.prologue.backend.notification.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "device_tokens")
class DeviceTokenJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "account_id", nullable = false) var accountId: UUID,
    @Column(name = "token", nullable = false, length = 255, updatable = false) val token: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 10, updatable = false) val platform: StorePlatform,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant,
)
