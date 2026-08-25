package com.prologue.backend.dailymeet.interfaces.web

import com.prologue.backend.dailymeet.application.service.MeetupInvitationView
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import java.time.Instant
import java.time.ZonedDateTime
import java.time.ZoneId
import java.util.UUID

/**
 * 초대장 페이지 — 화면 없이 문자열로만 검증되는 것들.
 *
 * 여기가 틀리면 **눈에 띄지 않게** 틀린다. 미리보기 태그는 사람이 보는 화면에 안 나오고,
 * 이스케이프 구멍은 평범한 제목으로 테스트하면 영원히 안 걸리며, 시간대를 흘리면
 * 새벽 모임의 날짜가 하루씩 밀린다. 그래서 태그·이스케이프·KST를 못 박아 둔다.
 */
class MeetupInvitationPageTest {
    private val id = UUID.fromString("11111111-2222-3333-4444-555555555555")

    private fun view(
        title: String = "밑줄 모임",
        description: String? = null,
        meetAt: Instant = ZonedDateTime.of(2026, 9, 26, 19, 0, 0, 0, ZoneId.of("Asia/Seoul")).toInstant(),
        coverUrl: String? = "https://cdn.example.com/cover.jpg",
        fee: Int = 30_000,
        feeFemale: Int? = null,
        capacity: Int = 8,
        confirmedCount: Int = 5,
        occurrence: Int = 1,
        occurrenceTotal: Int = 1,
        open: Boolean = true,
        hostNickname: String? = "지연",
        genderLimit: String? = null,
        minAgeMale: Int? = null,
        maxAgeMale: Int? = null,
        minAgeFemale: Int? = null,
        maxAgeFemale: Int? = null,
        minHeightMaleCm: Int? = null,
        requireJobVerified: Boolean = false,
    ) = MeetupInvitationView(
        meetupId = id,
        title = title,
        description = description,
        meetAt = meetAt,
        placeName = "2층 카페",
        placeAddress = "서울 성동구 연무장길 5",
        capacity = capacity,
        confirmedCount = confirmedCount,
        fee = fee,
        feeFemale = feeFemale,
        genderLimit = genderLimit,
        minAgeMale = minAgeMale,
        maxAgeMale = maxAgeMale,
        minAgeFemale = minAgeFemale,
        maxAgeFemale = maxAgeFemale,
        minHeightMaleCm = minHeightMaleCm,
        minHeightFemaleCm = null,
        requireJobVerified = requireJobVerified,
        coverUrl = coverUrl,
        hostNickname = hostNickname,
        occurrence = occurrence,
        occurrenceTotal = occurrenceTotal,
        open = open,
    )

    private fun html(v: MeetupInvitationView = view()) =
        MeetupInvitationPage.render(v, "https://prologue.day", "https://apps.apple.com/kr/app/id1", "https://play.google.com/store/apps/details?id=x")

    @Test
    fun `미리보기 태그가 응답 본문에 들어 있다 — 크롤러는 JS를 돌리지 않는다`() {
        val out = html()
        assertContains(out, """<meta property="og:title" content="밑줄 모임" />""")
        assertContains(out, """<meta property="og:url" content="https://prologue.day/m/$id" />""")
        assertContains(out, """<meta name="twitter:card" content="summary_large_image" />""")
    }

    @Test
    fun `커버 사진이 미리보기 이미지가 되고, 없으면 브랜드 기본 이미지로 대신한다`() {
        assertContains(html(), """<meta property="og:image" content="https://cdn.example.com/cover.jpg" />""")
        assertContains(html(view(coverUrl = null)), """<meta property="og:image" content="https://prologue.day/og.png" />""")
    }

    @Test
    fun `이어져 온 모임은 제목에 회차가 붙는다 — 미리보기 한 줄이 신뢰 신호를 겸한다`() {
        assertContains(html(view(occurrence = 3, occurrenceTotal = 4)), """og:title" content="밑줄 모임 · 3번째 만남"""")
        assertFalse(html().contains("번째 만남"))
    }

    @Test
    fun `미리보기 설명은 언제·어디서·얼마·자리 순서다`() {
        assertEquals("9월 26일 (토) 오후 7시 · 2층 카페 · 참가비 30,000원 · 자리 3개 남음", MeetupInvitationPage.ogDescription(view()))
    }

    @Test
    fun `마감된 모임은 남은 자리 대신 끝났다고 적는다 — 헛걸음시키지 않게`() {
        assertEquals("모집이 끝났어요", MeetupInvitationPage.seatsLabel(view(open = false)))
        assertEquals("자리가 다 찼어요", MeetupInvitationPage.seatsLabel(view(confirmedCount = 8)))
    }

    @Test
    fun `시각은 한국 시간으로 읽는다 — 서버 시간대가 UTC라도 새벽 모임의 날짜가 밀리면 안 된다`() {
        // 2026-09-27 00:30 KST = 2026-09-26 15:30 UTC
        val dawn = ZonedDateTime.of(2026, 9, 27, 0, 30, 0, 0, ZoneId.of("Asia/Seoul")).toInstant()
        assertEquals("2026. 09. 27", MeetupInvitationPage.numeralDate(dawn))
        assertEquals("9월 27일 (일) 오전 12:30시", MeetupInvitationPage.whenLine(dawn))
    }

    @Test
    fun `유저가 쓴 글은 태그가 되지 못한다 — 초대장 한 장이 남의 브라우저에서 스크립트가 되면 안 된다`() {
        val out = html(view(title = """<script>alert("x")</script>""", description = "따옴표 ' 와 & 도"))
        assertFalse(out.contains("<script>alert"))
        assertContains(out, "&lt;script&gt;")
        assertContains(out, "&amp;")
    }

    @Test
    fun `참가 조건은 성별별로 나눠 적는다`() {
        assertEquals(
            "남 28~39세 · 여 25~35세",
            MeetupInvitationPage.conditionLabel(view(minAgeMale = 28, maxAgeMale = 39, minAgeFemale = 25, maxAgeFemale = 35)),
        )
        assertEquals("여성만 · 직장인증", MeetupInvitationPage.conditionLabel(view(genderLimit = "FEMALE", requireJobVerified = true)))
        assertNull(MeetupInvitationPage.conditionLabel(view()))
    }

    @Test
    fun `참가비가 성별로 다르면 나눠 적는다`() {
        assertEquals("남 70,000원 · 여 무료", MeetupInvitationPage.feeLabel(view(fee = 70_000, feeFemale = 0)))
        assertEquals("무료", MeetupInvitationPage.feeLabel(view(fee = 0)))
    }

    @Test
    fun `없는 모임은 사과 대신 다음 모임으로 보낸다`() {
        val out = MeetupInvitationPage.notFound("https://prologue.day")
        assertContains(out, "지난 초대장이에요")
        assertContains(out, "https://prologue.day/download")
    }
}
