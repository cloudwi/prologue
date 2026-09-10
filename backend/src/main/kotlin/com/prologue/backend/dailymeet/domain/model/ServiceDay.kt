package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * 서비스의 하루 — 정오(KST)에 넘어간다.
 *
 * 달력의 자정도, 새벽도 아닌 정오를 쓴다. 이 앱의 하루는 잠에서 깨는 것이 아니라
 * 새 질문이 열리는 것으로 시작하기 때문이다. 아무도 보지 않는 새벽에 질문을 갈아끼우면
 * 그 사실을 알릴 방법이 없다 — 사람들이 깨어 있는 시각에 바뀌어야 "왔다"고 말할 수 있다.
 *
 * 오늘의 질문·취향 카드 한 벌·상대 후보·답변 보상·어드민의 "오늘" 배지가 모두 이 경계를
 * 함께 쓴다. 한 곳에만 두는 이유가 그것이다 — 경계가 두 개면 같은 시각에 두 화면이
 * 다른 날을 가리킨다.
 */
object ServiceDay {
    val ZONE: ZoneId = ZoneId.of("Asia/Seoul")

    /** 하루가 넘어가는 시각. 바꾸면 그날 하루는 질문이 한 번 더(또는 덜) 바뀐다. */
    val ROLLOVER: LocalTime = LocalTime.of(12, 0)

    /** 지금이 속한 서비스 하루. */
    fun now(): LocalDate = of(ZonedDateTime.now(ZONE))

    /** [at]이 속한 서비스 하루 — 정오 전이면 아직 어제다. */
    fun of(at: ZonedDateTime): LocalDate =
        if (at.toLocalTime() < ROLLOVER) at.toLocalDate().minusDays(1) else at.toLocalDate()

    /** [day]가 시작된 실제 시각 — "오늘 이미 받았나"를 원장 시각으로 판정할 때 쓴다. */
    fun startOf(day: LocalDate): Instant = day.atTime(ROLLOVER).atZone(ZONE).toInstant()

    /** 지금 속한 서비스 하루가 시작된 시각. */
    fun startOfToday(): Instant = startOf(now())
}
