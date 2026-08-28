package com.prologue.backend.dailymeet.interfaces.web

import com.prologue.backend.dailymeet.application.service.MeetupInvitationView
import com.prologue.backend.dailymeet.interfaces.web.MeetupInvitationPage.escape
import com.prologue.backend.dailymeet.interfaces.web.MeetupInvitationPage.feeValue
import com.prologue.backend.dailymeet.interfaces.web.MeetupInvitationPage.numeralDate
import com.prologue.backend.dailymeet.interfaces.web.MeetupInvitationPage.page
import com.prologue.backend.dailymeet.interfaces.web.MeetupInvitationPage.seatsValue
import com.prologue.backend.dailymeet.interfaces.web.MeetupInvitationPage.whenLine
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * 공개 모임 목록 — 검색에 걸리라고 만든 유일한 모임 페이지.
 *
 * 지금 우리 웹은 13쪽뿐이고 전부 소개팅 이야기다. "하루 한 문답 소개팅"으로는 찾는 사람이
 * 거의 없지만 **"서초 독서모임", "강남 와인모임"** 같은 말은 사람들이 실제로 찾는다.
 * 그 표면을 만드는 자리다 — 모임이 늘수록 이 페이지가 담는 말도 늘어난다.
 *
 * **개별 초대장(`/m/{id}`)은 계속 noindex다.** 장소와 날짜가 검색에 통째로 노출되면
 * 사적인 공간에서 여는 모임에는 부담이 된다. 목록은 제목·날짜·지역·요약까지만 보여주고
 * 자세한 것은 앱에서 보게 한다.
 *
 * 승인된 모임만 실린다(MeetupService.publicUpcoming) — 심사를 통과하지 않은 자리가
 * 검색에 걸리면 심사가 무의미해진다.
 */
object MeetupListPage {

    private val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
    private val ISO_LOCAL = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX")

    fun render(meetups: List<MeetupInvitationView>, baseUrl: String): String {
        val web = baseUrl.trimEnd('/')
        val url = "$web/meetups"
        val description = if (meetups.isEmpty()) {
            "프롤로그가 여는 오프라인 모임을 모았습니다. 책·와인·대화 — 조건이 아니라 생각이 맞는 사람들과 만나요."
        } else {
            "지금 신청할 수 있는 모임 ${meetups.size}개 — " +
                meetups.take(3).joinToString(" · ") { "${it.title}(${numeralDate(it.meetAt)})" }
        }

        return page(
            title = "모임 — 프롤로그",
            head = """
                <meta name="description" content="${escape(description)}" />
                <link rel="canonical" href="$url" />
                <meta property="og:title" content="프롤로그 모임" />
                <meta property="og:description" content="${escape(description)}" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="$url" />
                <meta property="og:image" content="$web/og.png" />
                ${eventJsonLd(meetups, web)}
                <style>
                  /* 목록은 초대장과 같은 팔레트를 쓰되 조판이 다르다 — 한 장이 아니라 여러 줄이다. */
                  .card.list { text-align:left; padding:32px 24px 36px; }
                  .card.list .eyebrow { margin:0; }
                  .card.list h1 { margin:12px 0 0; font-size:24px; }
                  .card.list .lead { margin:8px 0 0; color:var(--muted); font-size:15px; line-height:1.7; }
                  .row { display:flex; gap:14px; align-items:center; margin-top:16px; padding:14px;
                         background:var(--sunken); border-radius:16px; text-decoration:none; color:inherit; }
                  .row img { width:76px; height:95px; flex:0 0 auto; object-fit:cover; border-radius:12px; background:var(--line); }
                  .row-body { min-width:0; }
                  .row-title { font-size:16px; font-weight:700; line-height:1.4; }
                  .row-date { margin-top:5px; font-size:13.5px; font-variant-numeric:tabular-nums; }
                  .row-meta { margin-top:3px; font-size:13px; color:var(--muted); line-height:1.5; }
                  .blank { margin-top:20px; padding:36px 20px; text-align:center; background:var(--sunken); border-radius:16px; }
                  .blank strong { display:block; font-size:15px; }
                  .blank span { display:block; margin-top:6px; color:var(--muted); font-size:13.5px; }
                  .card.list .note { text-align:center; }
                </style>
            """.trimIndent(),
            body = """
                <main class="card list">
                  <p class="eyebrow">MEETUPS</p>
                  <h1>프롤로그 모임</h1>
                  <p class="lead">조건이 아니라 생각이 맞는 사람들과, 앱 밖에서 한 번.</p>
                  ${if (meetups.isEmpty()) empty(web) else meetups.joinToString("") { row(it, web) }}
                  <p class="note">신청은 프롤로그 앱에서 해요.</p>
                  <a class="cta" href="$web/download">프롤로그 앱 받기</a>
                </main>
            """.trimIndent(),
        )
    }

    private fun empty(web: String): String = """
        <div class="blank">
          <strong>지금은 열린 모임이 없어요.</strong>
          <span>새 모임이 열리면 앱에서 가장 먼저 알려드려요.</span>
        </div>
    """.trimIndent()

    /**
     * 한 줄에 담는 것 — 언제·어디서·얼마·몇 자리.
     *
     * 링크를 받은 사람이 갈지 말지 정하는 데 필요한 것만이다. 소개 글 전문은 넣지 않는다:
     * 목록이 길어져 읽히지 않고, 자세한 것은 초대장이 이미 맡고 있다.
     */
    private fun row(v: MeetupInvitationView, web: String): String {
        val place = listOfNotNull(v.placeName, v.placeAddress).joinToString(" · ")
        return """
            <a class="row" href="$web/m/${v.meetupId}">
              ${v.coverUrls.firstOrNull()?.let { """<img src="${escape(it)}" alt="" loading="lazy" />""" } ?: ""}
              <div class="row-body">
                <div class="row-title">${escape(v.title)}</div>
                <div class="row-date">${escape(numeralDate(v.meetAt))} · ${escape(whenLine(v.meetAt))}</div>
                <div class="row-meta">${escape(place)}</div>
                <div class="row-meta">${escape(feeValue(v))} · ${escape(seatsValue(v))}</div>
              </div>
            </a>
        """.trimIndent()
    }

    /**
     * 구조화 데이터 — 구글이 **이벤트 리치 결과**로 뽑아 갈 수 있는 형태.
     *
     * 날짜와 장소가 검색 결과에 바로 붙는다. 이게 이 페이지를 만드는 가장 큰 이유다 —
     * 목록 하나로 모임 수만큼의 검색 표면이 생긴다.
     *
     * 값은 전부 이스케이프해서 넣는다. JSON 안이라 태그가 되지는 않지만 따옴표 하나가
     * 구조를 깨면 구글은 통째로 무시한다.
     */
    private fun eventJsonLd(meetups: List<MeetupInvitationView>, web: String): String {
        if (meetups.isEmpty()) return ""
        val items = meetups.joinToString(",") { v ->
            val start = v.meetAt.atZone(SEOUL).format(ISO_LOCAL)
            val place = listOfNotNull(v.placeName, v.placeAddress).joinToString(" · ")
            """
            {
              "@context": "https://schema.org",
              "@type": "Event",
              "name": "${json(v.title)}",
              "startDate": "$start",
              "eventStatus": "https://schema.org/EventScheduled",
              "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
              "url": "$web/m/${v.meetupId}",
              "location": {
                "@type": "Place",
                "name": "${json(v.placeName ?: place)}",
                "address": "${json(v.placeAddress ?: place)}"
              },
              "organizer": { "@type": "Organization", "name": "프롤로그", "url": "$web" },
              "offers": {
                "@type": "Offer",
                "price": "${v.fee}",
                "priceCurrency": "KRW",
                "availability": "https://schema.org/InStock",
                "url": "$web/m/${v.meetupId}"
              }
            }
            """.trimIndent()
        }
        return """<script type="application/ld+json">[$items]</script>"""
    }

    /** JSON 문자열 안에 넣을 값 — 따옴표와 역슬래시, 줄바꿈을 죈다. */
    private fun json(raw: String): String = raw
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", " ")
        .replace("<", "\\u003C")
}
