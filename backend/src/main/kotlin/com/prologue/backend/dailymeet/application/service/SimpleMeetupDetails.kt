package com.prologue.backend.dailymeet.application.service

import java.time.Instant

/** 새 모임에는 운영에 쓰는 정보만 받는다. 빈 소개·연락처·사진을 채우도록 강요하지 않는다. */
data class SimpleMeetupDetails(
    val title: String,
    val meetAt: Instant,
    val place: String,
    val capacity: Int,
    val description: String? = null,
    val placeAddress: String? = null,
    val fee: Int = 0,
    val coverUrls: List<String> = emptyList(),
    val kakaoLink: String = "",
    val durationMinutes: Int? = null,
)
