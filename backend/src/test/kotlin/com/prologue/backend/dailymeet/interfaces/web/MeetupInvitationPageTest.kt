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
        coverUrls: List<String> = listOf("https://cdn.example.com/cover.jpg"),
        bodyImageUrls: List<String> = emptyList(),
        fee: Int = 30_000,
        feeFemale: Int? = null,
        capacity: Int = 8,
        confirmedCount: Int = 5,
        occurrence: Int = 1,
        occurrenceTotal: Int = 1,
        open: Boolean = true,
        recap: String? = null,
        recapImageUrls: List<String> = emptyList(),
        durationMinutes: Int? = null,
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
        coverUrls = coverUrls,
        bodyImageUrls = bodyImageUrls,
        hostNickname = hostNickname,
        occurrence = occurrence,
        occurrenceTotal = occurrenceTotal,
        durationMinutes = durationMinutes,
        open = open,
        recap = recap,
        recapImageUrls = recapImageUrls,
    )

    @Test
    fun `커버가 여러 장이면 첫 장은 표지로, 나머지는 갤러리로 실린다`() {
        val out = html(view(coverUrls = listOf("https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg")))

        assertContains(out, """<img class="cover" src="https://cdn.example.com/a.jpg"""")
        assertContains(out, """<div class="gallery">""")
        assertContains(out, """<img src="https://cdn.example.com/b.jpg"""")
    }

    @Test
    fun `커버가 한 장뿐이면 갤러리를 그리지 않는다`() {
        val out = html(view(coverUrls = listOf("https://cdn.example.com/a.jpg")))

        assertFalse(out.contains("""<div class="gallery">"""))
    }

    @Test
    fun `소개 글의 사진 표시는 그 자리에 사진으로 바뀐다`() {
        val out = html(
            view(
                description = "첫 문단\n[사진1]\n둘째 문단",
                bodyImageUrls = listOf("https://cdn.example.com/body.jpg"),
            ),
        )

        assertContains(out, """<img class="body-photo" src="https://cdn.example.com/body.jpg"""")
        assertFalse(out.contains("[사진1]")) // 표시가 글자로 남으면 안 된다
    }

    @Test
    fun `가운데 표시가 붙은 줄만 가운데로 선다`() {
        val out = html(view(description = "[가운데]상은 이렇게\n와인과 치즈를 준비해요"))

        assertContains(out, """<p class="greeting center">상은 이렇게</p>""")
        assertContains(out, """<p class="greeting">와인과 치즈를 준비해요</p>""")
        assertFalse(out.contains("[가운데]")) // 표시가 글자로 남으면 안 된다
    }

    @Test
    fun `오른쪽 표시가 붙은 줄은 오른쪽으로 선다`() {
        val out = html(view(description = "[오른쪽]— 프롤로그 드림\n본문"))

        assertContains(out, """<p class="greeting right">— 프롤로그 드림</p>""")
        assertContains(out, """<p class="greeting">본문</p>""")
        assertFalse(out.contains("[오른쪽]"))
    }

    @Test
    fun `같은 정렬이 이어지면 한 문단으로 묶는다 — 줄마다 문단을 열면 간격이 벌어진다`() {
        val out = html(view(description = "첫 줄\n둘째 줄"))

        assertContains(out, """<p class="greeting">첫 줄<br />둘째 줄</p>""")
    }

    @Test
    fun `가운데 줄 사이에 낀 사진도 가운데 문단을 이어서 연다`() {
        val out = html(
            view(description = "[가운데]앞\n[사진1]\n[가운데]뒤", bodyImageUrls = listOf("https://cdn.example.com/b.jpg")),
        )

        assertContains(out, """<p class="greeting center">앞</p>""")
        assertContains(out, """<p class="greeting center">뒤</p>""")
    }

    @Test
    fun `폭이 붙은 표시는 그 폭의 클래스를 단다`() {
        val out = html(
            view(
                description = "[사진1:50]",
                bodyImageUrls = listOf("https://cdn.example.com/body.jpg"),
            ),
        )

        assertContains(out, """<img class="body-photo w50"""")
    }

    @Test
    fun `폭이 없던 시절의 글은 그대로 꽉 찬 사진으로 읽힌다`() {
        // 문법이 자랐지 바뀌지 않았다 — 마이그레이션 없이 옛 글이 어제와 같아야 한다.
        val out = html(view(description = "[사진1]", bodyImageUrls = listOf("https://cdn.example.com/body.jpg")))

        assertContains(out, """<img class="body-photo" """)
    }

    @Test
    fun `폭은 네 칸뿐 — 그 밖의 숫자는 꽉 찬 모양으로 떨어진다`() {
        // 임의의 숫자를 style에 흘리면 그 자리가 곧 주입 통로가 된다. 클래스는 우리가 정한 것만 나간다.
        val out = html(view(description = "[사진1:63]", bodyImageUrls = listOf("https://cdn.example.com/body.jpg")))

        assertContains(out, """<img class="body-photo" """)
        assertFalse(out.contains("w63"))
    }

    /*
     * 원본 크기 — 사진이 오기 전에 자리를 잡아두라는 숫자다.
     *
     * 이게 없으면 사진이 뜨는 순간 아래 글이 통째로 밀린다(레이아웃 시프트). 사람 눈에는
     * "읽던 줄이 도망가는" 것으로 보이고, 검색 점수에도 그대로 깎인다.
     */
    @Test
    fun `원본 크기가 붙으면 width height로 자리를 잡아둔다`() {
        val out = html(
            view(
                description = "[사진1:100:1200x1115]",
                bodyImageUrls = listOf("https://cdn.example.com/body.jpg"),
            ),
        )

        assertContains(out, """ width="1200" height="1115"""")
        assertFalse(out.contains("1200x1115")) // 표시가 글자로 남으면 안 된다
    }

    @Test
    fun `폭과 크기가 같이 붙어도 둘 다 산다`() {
        val out = html(
            view(description = "[사진1:50:800x600]", bodyImageUrls = listOf("https://cdn.example.com/body.jpg")),
        )

        assertContains(out, """<img class="body-photo w50"""")
        assertContains(out, """ width="800" height="600"""")
    }

    @Test
    fun `말이 안 되는 크기는 속성 없이 지나간다`() {
        // 0이나 몇 만 픽셀로 자리를 잡으면 안 잡느니만 못하다 — 엉뚱한 크기로 밀린다.
        val out = html(
            view(description = "[사진1:50:0x600]", bodyImageUrls = listOf("https://cdn.example.com/body.jpg")),
        )

        assertFalse(out.contains("height=\"600\""))
        assertFalse(out.contains("0x600"))
    }

    /*
     * 후기 — 모임이 끝난 뒤에 붙는 글.
     *
     * 소개와 같은 문법으로 저장되므로 같은 조판을 탄다. 여기서 확인하는 것은 "따로 선 자리에,
     * 소개와 섞이지 않게" 붙는가이다. 위는 "오세요"이고 아래는 "이랬어요"인데 그 경계가 없으면
     * 지난 모임의 후기가 모집 문구처럼 읽힌다.
     */
    @Test
    fun `후기가 있으면 따로 선 자리에 붙는다`() {
        val out = html(view(recap = "여덟 분이 오셨어요.\n다음에도 이렇게 하려고요."))

        assertContains(out, """<section class="recap">""")
        assertContains(out, "그날의 기록")
        assertContains(out, "여덟 분이 오셨어요.")
    }

    @Test
    fun `후기가 없으면 그 자리가 통째로 없다 — 빈 제목만 남으면 안 된다`() {
        val out = html(view())

        // CSS의 .recap 규칙은 늘 실려 있다 — 없어야 하는 건 그 자리(마크업)다.
        assertFalse(out.contains("""<section class="recap">"""))
        assertFalse(out.contains("그날의 기록"))
    }

    @Test
    fun `후기 안의 사진 표시도 소개와 같은 규칙으로 그려진다`() {
        val out = html(
            view(
                recap = "그날 상은 이랬어요.\n[사진1:75:1200x900]",
                recapImageUrls = listOf("https://cdn.example.com/r1.jpg"),
            ),
        )

        assertContains(out, """<img class="body-photo w75"""")
        assertContains(out, """ width="1200" height="900"""")
        assertFalse(out.contains("[사진1"))
    }

    @Test
    fun `사진만 있는 후기도 자리를 얻는다`() {
        val out = html(view(recap = "[사진1]", recapImageUrls = listOf("https://cdn.example.com/r1.jpg")))

        assertContains(out, """<section class="recap">""")
        assertContains(out, "https://cdn.example.com/r1.jpg")
    }

    @Test
    fun `후기도 그대로 태그가 되지 못한다`() {
        val out = html(view(recap = "<script>alert(1)</script>"))

        assertFalse(out.contains("<script>alert(1)</script>"))
        assertContains(out, "&lt;script&gt;")
    }

    @Test
    fun `가리키는 사진이 없는 표시는 조용히 지운다`() {
        // 사진을 지웠거나 오타를 냈을 때 — 화면에 [사진3]이 글자로 남는 것보다 없는 편이 낫다.
        val out = html(view(description = "첫 문단\n[사진3]\n둘째 문단", bodyImageUrls = emptyList()))

        assertFalse(out.contains("[사진3]"))
        assertContains(out, "첫 문단")
        assertContains(out, "둘째 문단")
    }

    @Test
    fun `사진 표시를 흉내낸 글자는 태그가 되지 못한다`() {
        // 이스케이프가 치환보다 먼저다 — 순서가 뒤집히면 이 자리가 곧 구멍이 된다.
        val out = html(view(description = "<script>alert(1)</script>", bodyImageUrls = emptyList()))

        assertFalse(out.contains("<script>alert"))
        assertContains(out, "&lt;script&gt;")
    }

    private fun html(v: MeetupInvitationView = view()) =
        MeetupInvitationPage.render(v, "https://prologue.day", "https://apps.apple.com/kr/app/id1", "https://play.google.com/store/apps/details?id=x")

    @Test
    fun `앱으로 여는 링크는 슬래시가 셋 — 둘이면 첫 마디가 호스트로 먹힌다`() {
        // prologue://meetup/{id}로 쓰면 "meetup"이 호스트로 파싱되고 경로에는 id만 남아,
        // 앱이 /meetup/[id]를 못 찾고 Unmatched Route를 띄운다. 눈으로는 구분이 안 가는 종류의 버그다.
        val out = html()
        assertContains(out, "prologue:///meetup/$id")
        assertFalse(out.contains("prologue://meetup/"), "슬래시 둘짜리 딥링크가 남아 있으면 앱이 링크를 못 연다")
    }

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
        assertContains(html(view(coverUrls = emptyList())), """<meta property="og:image" content="https://prologue.day/og.png" />""")
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

    /**
     * "몇 시에 끝나지"는 처음 가는 자리에서 가장 먼저 계산하는 것이다.
     *
     * 오전/오후를 매번 적으면 같은 말이 두 번이고, 한 번도 안 적으면 밤 11시에 시작한 모임이
     * 11시에 끝난 것처럼 읽힌다. 그 경계와 자정 넘김을 못 박는다.
     */
    @Test
    fun `끝나는 시각을 붙여 말한다`() {
        val at = ZonedDateTime.of(2026, 9, 26, 18, 0, 0, 0, ZoneId.of("Asia/Seoul")).toInstant()
        assertEquals("9월 26일 (토) 오후 6시 – 8시", MeetupInvitationPage.whenLine(view(meetAt = at, durationMinutes = 120)))
        // 정하지 않은 모임은 지금까지처럼 시작 시각만 말한다.
        assertEquals("9월 26일 (토) 오후 6시", MeetupInvitationPage.whenLine(view(meetAt = at)))
        // 분이 남으면 함께 적는다.
        assertEquals("9월 26일 (토) 오후 6시 – 7:30시", MeetupInvitationPage.whenLine(view(meetAt = at, durationMinutes = 90)))
    }

    @Test
    fun `오전에서 오후로 넘어가면 다시 적는다`() {
        val morning = ZonedDateTime.of(2026, 9, 26, 11, 0, 0, 0, ZoneId.of("Asia/Seoul")).toInstant()
        assertEquals("9월 26일 (토) 오전 11시 – 오후 1시", MeetupInvitationPage.whenLine(view(meetAt = morning, durationMinutes = 120)))
    }

    @Test
    fun `자정을 넘기면 다음 날이라고 말한다`() {
        val night = ZonedDateTime.of(2026, 9, 26, 23, 0, 0, 0, ZoneId.of("Asia/Seoul")).toInstant()
        assertEquals("9월 26일 (토) 오후 11시 – 다음 날 오전 1시", MeetupInvitationPage.whenLine(view(meetAt = night, durationMinutes = 120)))
    }

    /**
     * 커버도 본문 사진도 원본 주소로 나가면 안 된다 — 모임장이 올린 1.9MB 그림이
     * 링크를 연 사람에게 통째로 날아간다(2026-08-31에 실제로 그랬다).
     * 꽉 찬 사진과 폭을 정한 사진은 화면에서 크기가 다르니 받아오는 크기도 갈린다.
     */
    @Test
    fun `사진은 화면 크기에 맞춰 줄여 받는다`() {
        val stored = "https://x.supabase.co/storage/v1/object/public/profile-photos/a/b"
        val out = html(
            view(
                coverUrls = listOf(stored, stored),
                description = "[사진1]\n[사진2:75:800x1200]",
                bodyImageUrls = listOf(stored, stored),
            ),
        )
        assertFalse(out.contains("""src="$stored""""), "원본 주소를 그대로 내보내고 있다")
        assertContains(out, "/storage/v1/render/image/public/profile-photos/a/b?width=900&amp;resize=contain")
        assertContains(out, "/storage/v1/render/image/public/profile-photos/a/b?width=600&amp;resize=contain")
        // 미리보기(og:image)만 원본이다 — 크롤러는 WebP를 받지 않는 곳이 있고, 한 번만 가져간다.
        assertContains(out, """<meta property="og:image" content="$stored" />""")
    }

    @Test
    fun `없는 모임은 사과 대신 다음 모임으로 보낸다`() {
        val out = MeetupInvitationPage.notFound("https://prologue.day")
        assertContains(out, "지난 초대장이에요")
        assertContains(out, "https://prologue.day/download")
    }
}
