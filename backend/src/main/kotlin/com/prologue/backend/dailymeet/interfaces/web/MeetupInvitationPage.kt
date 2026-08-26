package com.prologue.backend.dailymeet.interfaces.web

import com.prologue.backend.dailymeet.application.service.MeetupInvitationView
import java.time.Instant
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

/**
 * 공개 초대장 페이지 — 카카오톡에 붙은 링크가 펼쳐지는 자리.
 *
 * **왜 백엔드가 HTML을 그리나.** 미리보기(OG 태그)는 크롤러가 JS를 돌리지 않고 읽어 가므로
 * 응답 본문에 이미 들어 있어야 한다. 웹(prologue.day)은 정적 사이트라 유저가 방금 만든 모임의
 * 페이지를 미리 구워둘 수 없다. 그래서 이 한 경로만 서버가 그리고, 정적 호스트는 rewrite로 넘긴다.
 *
 * 페이지가 하는 일은 셋뿐이다: 미리보기에 쓸 태그를 싣고, 초대장을 한눈에 보여주고, 앱으로 보낸다.
 * 신청은 여기서 받지 않는다 — 참가 조건과 신청 상태는 로그인해야 아는 것이라 앱의 일이다.
 *
 * 값은 전부 [escape]를 거친다. 제목·모시는 글·닉네임은 유저가 쓴 글이고, 그게 그대로 HTML이 되면
 * 초대장 한 장이 남의 브라우저에서 스크립트가 된다.
 */
object MeetupInvitationPage {
    private val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")

    /** 초대장 HTML. [baseUrl]은 이 페이지가 서 있는 주소(OG url·기본 이미지의 뿌리). */
    fun render(v: MeetupInvitationView, baseUrl: String, iosStoreUrl: String, androidStoreUrl: String): String {
        val web = baseUrl.trimEnd('/')
        val url = "$web/m/${v.meetupId}"
        val ogTitle = if (v.occurrenceTotal > 1) "${v.title} · ${v.occurrence}번째 만남" else v.title
        val image = v.coverUrl ?: "$web/og.png"
        // 슬래시가 셋이다. prologue://meetup/{id}로 쓰면 "meetup"이 호스트로 파싱되고 경로에는 id만 남아
        // /meetup/[id] 라우트에 걸리지 않는다(앱이 Unmatched Route를 띄운다). 호스트를 비워 경로를 온전히 넘긴다 —
        // Expo의 Linking.createURL이 만들어내는 형식도 이쪽이다.
        val deepLink = "prologue:///meetup/${v.meetupId}"

        return page(
            title = "$ogTitle — 프롤로그 초대장",
            head = """
                <meta property="og:type" content="article" />
                <meta property="og:site_name" content="프롤로그" />
                <meta property="og:title" content="${escape(ogTitle)}" />
                <meta property="og:description" content="${escape(ogDescription(v))}" />
                <meta property="og:image" content="${escape(image)}" />
                <meta property="og:url" content="${escape(url)}" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${escape(ogTitle)}" />
                <meta name="twitter:description" content="${escape(ogDescription(v))}" />
                <meta name="twitter:image" content="${escape(image)}" />
                <meta name="description" content="${escape(ogDescription(v))}" />
                <!-- 초대장은 링크를 받은 사람이 보는 것이지 검색으로 찾는 것이 아니다. -->
                <meta name="robots" content="noindex" />
            """.trimIndent(),
            body = """
                <main class="card">
                  ${if (v.coverUrl != null) """<img class="cover" src="${escape(v.coverUrl)}" alt="" />""" else ""}
                  <p class="eyebrow">INVITATION</p>
                  ${if (v.occurrenceTotal > 1) """<p class="occurrence">${v.occurrence}번째 만남</p>""" else ""}
                  <h1>${escape(v.title)}</h1>
                  <p class="date">${escape(numeralDate(v.meetAt))}</p>
                  <p class="when">${escape(whenLine(v.meetAt))}</p>
                  ${if (v.description != null) """<p class="greeting">${escape(v.description).replace("\n", "<br />")}</p>""" else ""}
                  <dl class="info">
                    ${row("여는 사람", v.hostNickname ?: "프롤로그")}
                    ${row("장소", listOfNotNull(v.placeName, v.placeAddress).joinToString(" · ").ifBlank { null })}
                    ${row("참가비", feeLabel(v))}
                    ${row("참석 조건", conditionLabel(v))}
                    ${row("자리", seatsLabel(v))}
                  </dl>
                  <a class="cta" href="${escape(deepLink)}" id="open">앱에서 초대장 열기</a>
                  <p class="note">프롤로그 앱에서 신청할 수 있어요. 앱이 없다면 아래에서 받아주세요.</p>
                  <p class="stores">
                    <a href="${escape(iosStoreUrl)}">App Store</a><span>·</span><a href="${escape(androidStoreUrl)}">Google Play</a>
                  </p>
                </main>
                <script>
                  // 앱이 깔려 있으면 딥링크가 열리고, 없으면 아무 일도 없다 — 그때만 스토어로 보낸다.
                  // 알림창(confirm)은 쓰지 않는다: 링크를 눌렀을 뿐인 사람에게 묻는 건 실례다.
                  document.getElementById('open').addEventListener('click', function () {
                    var ua = navigator.userAgent || '';
                    var store = /Android/i.test(ua) ? ${'"'}${escape(androidStoreUrl)}${'"'}
                      : /iPhone|iPad|iPod/i.test(ua) ? ${'"'}${escape(iosStoreUrl)}${'"'} : null;
                    if (!store) return;
                    var left = false;
                    // 앱으로 넘어가면 페이지가 숨겨진다 — 그 신호가 오면 스토어로 보내지 않는다.
                    document.addEventListener('visibilitychange', function () { if (document.hidden) left = true; });
                    setTimeout(function () { if (!left) window.location.href = store; }, 1500);
                  });
                </script>
            """.trimIndent(),
        )
    }

    /** 없는(또는 지워진) 모임. 링크가 늙는 건 정상이라, 사과 대신 다음 모임으로 안내한다. */
    fun notFound(baseUrl: String): String = page(
        title = "지난 초대장 — 프롤로그",
        head = """<meta name="robots" content="noindex" />""",
        body = """
            <main class="card">
              <p class="eyebrow">INVITATION</p>
              <h1>지난 초대장이에요</h1>
              <p class="note">이 모임은 마감되었거나 취소됐어요. 프롤로그 앱에서 다음 모임을 볼 수 있어요.</p>
              <a class="cta" href="${escape(baseUrl.trimEnd('/'))}/download">프롤로그 앱 받기</a>
            </main>
        """.trimIndent(),
    )

    /**
     * 미리보기 한 줄 — 카카오톡에서 제목 아래 작게 붙는 글.
     * 링크를 받은 사람이 갈지 말지 정하는 데 필요한 것만: 언제·어디서·얼마·자리.
     */
    internal fun ogDescription(v: MeetupInvitationView): String = listOfNotNull(
        whenLine(v.meetAt),
        v.placeName ?: v.placeAddress,
        feeLabel(v),
        seatsLabel(v),
    ).joinToString(" · ")

    // ── 문구 ── 앱(meetup-format.ts, meetups.ts)과 같은 규칙을 쓴다. 한쪽만 고치면 초대장이 두 얼굴이 된다.

    internal fun numeralDate(at: Instant): String =
        at.atZone(SEOUL).let { String.format(Locale.KOREA, "%d. %02d. %02d", it.year, it.monthValue, it.dayOfMonth) }

    internal fun whenLine(at: Instant): String {
        val t = at.atZone(SEOUL)
        val weekday = t.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.KOREAN)
        val hour12 = if (t.hour % 12 == 0) 12 else t.hour % 12
        val ampm = if (t.hour < 12) "오전" else "오후"
        val minute = if (t.minute == 0) "" else String.format(Locale.KOREA, ":%02d", t.minute)
        return "${t.monthValue}월 ${t.dayOfMonth}일 ($weekday) $ampm $hour12${minute}시"
    }

    internal fun feeLabel(v: MeetupInvitationView): String {
        // 자리 구분 쉼표는 서버 로케일에 맡기지 않는다 — 배포 환경에 따라 "30.000원"이 될 수 있다.
        fun won(n: Int) = String.format(Locale.KOREA, "%,d원", n)
        if (v.feeFemale != null && v.feeFemale != v.fee) {
            return "남 ${if (v.fee > 0) won(v.fee) else "무료"} · 여 ${if (v.feeFemale > 0) won(v.feeFemale) else "무료"}"
        }
        return if (v.fee > 0) "참가비 ${won(v.fee)}" else "무료"
    }

    internal fun conditionLabel(v: MeetupInvitationView): String? {
        fun of(minAge: Int?, maxAge: Int?, minHeight: Int?): String? {
            val parts = mutableListOf<String>()
            if (minAge != null || maxAge != null) {
                parts += if (minAge != null && maxAge != null) "$minAge~${maxAge}세" else if (minAge != null) "${minAge}세+" else "~${maxAge}세"
            }
            if (minHeight != null) parts += "${minHeight}cm+"
            return parts.joinToString("·").ifBlank { null }
        }

        val male = if (v.genderLimit != "FEMALE") of(v.minAgeMale, v.maxAgeMale, v.minHeightMaleCm) else null
        val female = if (v.genderLimit != "MALE") of(v.minAgeFemale, v.maxAgeFemale, v.minHeightFemaleCm) else null
        val parts = mutableListOf<String>()
        if (v.genderLimit != null) parts += if (v.genderLimit == "MALE") "남성만" else "여성만"
        when {
            male != null && female != null -> parts += "남 $male · 여 $female"
            male != null -> parts += if (v.genderLimit == "MALE") male else "남 $male"
            female != null -> parts += if (v.genderLimit == "FEMALE") female else "여 $female"
        }
        if (v.requireJobVerified) parts += "직장인증"
        return parts.joinToString(" · ").ifBlank { null }
    }

    internal fun seatsLabel(v: MeetupInvitationView): String {
        if (!v.open) return "모집이 끝났어요"
        val remaining = (v.capacity - v.confirmedCount).coerceAtLeast(0)
        return if (remaining > 0) "자리 ${remaining}개 남음" else "자리가 다 찼어요"
    }

    // ── 조판 ──

    private fun row(label: String, value: String?): String =
        if (value == null) "" else """<div class="row"><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>"""

    /**
     * 값이 그대로 태그가 되지 않게 막는다.
     * 따옴표까지 거르는 이유는 이 값들이 속성(content="…") 안에도 들어가기 때문이다.
     */
    internal fun escape(raw: String): String = raw
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")

    /** 앱과 같은 팔레트(constants/theme.ts) — 차가운 중성 회색 바탕에 테라코타 하나. 다크 모드도 따라간다. */
    private fun page(title: String, head: String, body: String): String = """
        <!doctype html>
        <html lang="ko">
        <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escape(title)}</title>
${head.prependIndent("        ")}
        <style>
          :root { --bg:#F6F8FA; --card:#FFFFFF; --text:#1B2126; --muted:#69747E; --line:#E3E8EE; --point:#D9694C; --on-point:#fff; }
          @media (prefers-color-scheme: dark) {
            :root { --bg:#101418; --card:#181D22; --text:#EAEFF4; --muted:#96A1AC; --line:#28303A; --point:#E07A5C; --on-point:#101418; }
          }
          * { box-sizing: border-box; }
          body { margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",system-ui,sans-serif;
                 display:flex; justify-content:center; padding:24px 16px 48px; }
          .card { width:100%; max-width:420px; background:var(--card); border:1px solid var(--line); border-radius:20px; overflow:hidden;
                  padding:0 24px 32px; text-align:center; }
          .cover { display:block; width:calc(100% + 48px); margin:0 -24px 28px; aspect-ratio:4/3; object-fit:cover; background:var(--line); }
          .eyebrow { margin:32px 0 0; font-size:11.5px; font-weight:600; letter-spacing:4px; color:var(--muted); }
          .cover ~ .eyebrow { margin-top:0; }
          .occurrence { margin:10px 0 0; font-size:13px; font-weight:700; color:var(--point); }
          h1 { margin:14px 0 0; font-size:26px; line-height:1.38; letter-spacing:-0.3px; }
          .date { margin:18px 0 0; font-size:22px; font-weight:300; letter-spacing:3px; font-variant-numeric:tabular-nums; }
          .when { margin:8px 0 0; font-size:14px; color:var(--muted); }
          .greeting { margin:28px 0 0; font-size:15px; line-height:1.85; }
          .info { margin:32px 0 0; padding:0; text-align:left; }
          .row { display:flex; justify-content:space-between; gap:16px; padding:14px 0; border-bottom:1px solid var(--line); }
          .row:last-child { border-bottom:0; }
          dt { font-size:14px; color:var(--muted); flex-shrink:0; }
          dd { margin:0; font-size:15px; font-weight:600; text-align:right; }
          .cta { display:block; margin:28px 0 0; padding:15px; border-radius:999px; background:var(--point); color:var(--on-point);
                 font-size:16px; font-weight:700; text-decoration:none; }
          .note { margin:16px 0 0; font-size:13px; line-height:1.7; color:var(--muted); }
          .stores { margin:10px 0 0; font-size:13px; color:var(--muted); display:flex; gap:8px; justify-content:center; }
          .stores a { color:var(--muted); }
        </style>
        </head>
        <body>
${body.prependIndent("        ")}
        </body>
        </html>
    """.trimIndent()
}
