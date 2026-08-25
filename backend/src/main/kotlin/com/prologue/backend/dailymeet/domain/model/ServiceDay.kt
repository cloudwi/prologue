package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * 서비스의 하루 — 새벽 5시(KST)에 넘어간다.
 *
 * 달력의 자정이 아니라 활동이 가장 적은 시각을 경계로 삼는다. 자정을 경계로 쓰면
 * 밤 11시 반에 답을 남긴 사람이 30분 뒤 새 질문을 받는다 — 하루를 두 번 사는 셈이다.
 * 새벽 5시면 거의 모두가 자고 있어, 어제의 끝과 오늘의 시작이 사람의 하루와 맞아떨어진다.
 *
 * 오늘의 질문·상대 후보·답변 보상·어드민의 "오늘" 배지가 모두 이 경계를 함께 쓴다.
 * 한 곳에만 두는 이유가 그것이다 — 경계가 두 개면 새벽 4시에 두 화면이 다른 날을 가리킨다.
 */
object ServiceDay {
    val ZONE: ZoneId = ZoneId.of("Asia/Seoul")

    /** 하루가 넘어가는 시각. 바꾸면 그날 하루는 질문이 한 번 더(또는 덜) 바뀐다. */
    val ROLLOVER: LocalTime = LocalTime.of(5, 0)

    /** 지금이 속한 서비스 하루. */
    fun now(): LocalDate = of(ZonedDateTime.now(ZONE))

    /** [at]이 속한 서비스 하루 — 새벽 5시 전이면 아직 어제다. */
    fun of(at: ZonedDateTime): LocalDate =
        if (at.toLocalTime() < ROLLOVER) at.toLocalDate().minusDays(1) else at.toLocalDate()

    /** [day]가 시작된 실제 시각 — "오늘 이미 받았나"를 원장 시각으로 판정할 때 쓴다. */
    fun startOf(day: LocalDate): Instant = day.atTime(ROLLOVER).atZone(ZONE).toInstant()

    /** 지금 속한 서비스 하루가 시작된 시각. */
    fun startOfToday(): Instant = startOf(now())
}
