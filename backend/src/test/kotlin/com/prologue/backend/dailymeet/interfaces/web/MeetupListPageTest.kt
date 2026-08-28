package com.prologue.backend.dailymeet.interfaces.web

import com.prologue.backend.dailymeet.application.service.MeetupInvitationView
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertFalse
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.UUID

/**
 * 공개 모임 목록 — 검색이 읽어 가는 페이지.
 *
 * 여기가 틀리면 **눈에 띄지 않게** 틀린다. 구조화 데이터는 사람 화면에 안 나오고,
 * 따옴표 하나가 JSON을 깨면 구글은 통째로 무시한다. 그래서 태그·이스케이프를 못 박는다.
 */
class MeetupListPageTest {
    private fun view(
        title: String = "밑줄 모임",
        fee: Int = 35000,
        placeName: String? = "1층 파란지붕 서로서가",
        placeAddress: String? = "서울 서초구 언남길 49",
    ) = MeetupInvitationView(
        meetupId = UUID.fromString("11111111-2222-3333-4444-555555555555"),
        title = title,
        description = "책 한 권 들고 오세요",
        meetAt = ZonedDateTime.of(2026, 9, 26, 18, 0, 0, 0, ZoneId.of("Asia/Seoul")).toInstant(),
        placeName = placeName,
        placeAddress = placeAddress,
        capacity = 8,
        confirmedCount = 3,
        fee = fee,
        feeFemale = null,
        genderLimit = null,
        minAgeMale = null,
        maxAgeMale = null,
        minAgeFemale = null,
        maxAgeFemale = null,
        minHeightMaleCm = null,
        minHeightFemaleCm = null,
        requireJobVerified = false,
        coverUrls = listOf("https://cdn.example.com/cover.jpg"),
        bodyImageUrls = emptyList(),
        hostNickname = "자상한구름",
        occurrence = 1,
        occurrenceTotal = 1,
        open = true,
    )

    private fun html(items: List<MeetupInvitationView> = listOf(view())) =
        MeetupListPage.render(items, "https://prologue.day")

    @Test
    fun `모임이 한 줄씩 실린다`() {
        val out = html()

        assertContains(out, "밑줄 모임")
        assertContains(out, "2026. 09. 26")
        assertContains(out, "서울 서초구 언남길 49")
        assertContains(out, "https://prologue.day/m/11111111-2222-3333-4444-555555555555")
    }

    @Test
    fun `이벤트 구조화 데이터가 실린다 — 이 페이지를 만드는 가장 큰 이유다`() {
        val out = html()

        assertContains(out, """"@type": "Event"""")
        assertContains(out, """"startDate": "2026-09-26T18:00:00+09:00"""")
        assertContains(out, """"eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"""")
        assertContains(out, """"priceCurrency": "KRW"""")
        assertContains(out, """"price": "35000"""")
    }

    @Test
    fun `모임 이름의 따옴표가 구조화 데이터를 깨지 않는다`() {
        // JSON이 깨지면 구글은 통째로 무시한다 — 화면에는 아무 표시도 안 난다.
        val out = html(listOf(view(title = """밑줄 "모임" \ 하나""")))

        assertContains(out, """\"모임\"""")
        assertFalse(out.contains(""""name": "밑줄 "모임"""))
    }

    @Test
    fun `모임 이름이 태그가 되지 못한다`() {
        val out = html(listOf(view(title = "<script>alert(1)</script>")))

        assertFalse(out.contains("<script>alert"))
        assertContains(out, "&lt;script&gt;")
    }

    @Test
    fun `열린 모임이 없으면 빈 자리를 그리고 구조화 데이터는 넣지 않는다`() {
        val out = html(emptyList())

        assertContains(out, "지금은 열린 모임이 없어요")
        assertFalse(out.contains(""""@type": "Event""""))
    }

    @Test
    fun `무료 모임은 0원으로 실린다`() {
        val out = html(listOf(view(fee = 0)))

        assertContains(out, """"price": "0"""")
        assertContains(out, "무료")
    }
}
