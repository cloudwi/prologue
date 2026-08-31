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

    /**
     * 소개 글에서 사진 자리를 가리키는 표시 — `[사진1]`, `[사진2]` …
     *
     * 폭을 붙일 수 있다: `[사진1:50]`은 카드 폭의 절반. 폭이 없으면 지금까지처럼
     * 카드 밖으로 흘려 꽉 채운다 — 그래서 폭이 없던 시절의 글이 그대로 보인다.
     *
     * 뒤에 원본 크기가 더 붙을 수 있다: `[사진1:100:1200x1115]`. 이걸 아는 이유는 하나다 —
     * 사진이 도착하기 전에 자리를 잡아둬야 글이 밀리지 않는다(레이아웃 시프트). 브라우저는
     * width/height 속성만으로 비율을 계산해 빈 상자를 먼저 그려준다.
     *
     * 크기를 **URL 쿼리에 붙이지 않은** 이유가 있다. 앱의 thumbUrl이 `${'$'}url?width=…`로 이어
     * 붙이는데, URL에 이미 `?`가 있으면 `…jpg?w=1200&h=1115?width=260`이 되어 리사이즈가
     * 통째로 깨진다. 이미 스토어에 나간 판은 고칠 수 없다. 표시에 실으면 URL은 그대로다.
     */
    private val PHOTO_TOKEN = Regex("""\[사진(\d+)(?::(\d+))?(?::(\d+)x(\d+))?]""")

    /**
     * 원본 크기 → `width`/`height` 속성. 둘 다 있고 말이 될 때만 내보낸다.
     *
     * 숫자가 터무니없으면(0이거나 몇 만 픽셀) 자리를 잘못 잡아 오히려 더 크게 밀린다.
     * 그럴 바엔 속성 없이 지금까지처럼 두는 게 낫다.
     */
    private fun sizeAttrs(w: String, h: String): String {
        val width = w.toIntOrNull() ?: return ""
        val height = h.toIntOrNull() ?: return ""
        if (width !in 1..20000 || height !in 1..20000) return ""
        return """ width="$width" height="$height""""
    }

    /**
     * 폭은 네 칸뿐이다 — 25·50·75·100.
     *
     * 임의의 숫자를 받지 않는 이유가 둘이다. 하나, 초대장은 폰에서 380px 폭으로 읽히므로
     * 콘솔에서 맞춘 63%는 거기서 다른 그림이 된다. 둘, 숫자를 그대로 style에 흘리면
     * 그 자리가 곧 주입 통로다 — 클래스 이름으로만 내보내면 그 여지가 아예 없다.
     */
    /**
     * 줄 앞에 붙는 정렬 표시 — `[가운데]무엇을 준비했나요`, `[오른쪽]— 프롤로그 드림`.
     *
     * 왼쪽이 기본이라 표시가 없다. 긴 문단은 왼쪽으로 흘려야 읽히고, 머리줄이나 맺는 한 줄만
     * 가운데·오른쪽이 어울린다. 그 판단은 글을 쓴 사람만 할 수 있어서 자동으로 정하지 않는다
     * (짧은 줄을 기계적으로 가운데로 보내면 우연히 짧아진 문장까지 끌려간다).
     */
    private val ALIGN_TOKEN = Regex("""^\s*\[(가운데|오른쪽)]\s?""")

    private fun alignClass(raw: String): String = when (raw) {
        "가운데" -> " center"
        "오른쪽" -> " right"
        else -> ""
    }

    private fun widthClass(raw: String): String = when (raw.toIntOrNull()) {
        25, 50, 75 -> " w$raw"
        else -> "" // 100이거나 알 수 없는 값 — 지금까지의 꽉 찬 모양.
    }

    private val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")

    /** 초대장 HTML. [baseUrl]은 이 페이지가 서 있는 주소(OG url·기본 이미지의 뿌리). */
    fun render(v: MeetupInvitationView, baseUrl: String, iosStoreUrl: String, androidStoreUrl: String): String {
        val web = baseUrl.trimEnd('/')
        val url = "$web/m/${v.meetupId}"
        val ogTitle = if (v.occurrenceTotal > 1) "${v.title} · ${v.occurrence}번째 만남" else v.title
        val image = v.coverUrls.firstOrNull() ?: "$web/og.png"
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
                  ${v.coverUrls.firstOrNull()?.let { """<img class="cover" src="${escape(ImageUrl.thumb(it, ImageUrl.COVER))}" alt="" />""" } ?: ""}
                  <p class="eyebrow">INVITATION</p>
                  ${if (v.occurrenceTotal > 1) """<p class="occurrence">${v.occurrence}번째 만남</p>""" else ""}
                  <h1>${escape(v.title)}</h1>
                  <p class="date">${escape(numeralDate(v.meetAt))}</p>
                  <p class="when">${escape(whenLine(v.meetAt))}</p>
                  ${greeting(v.description, v.bodyImageUrls)}
                  ${gallery(v.coverUrls)}
                  <dl class="info">
                    ${row("여는 사람", v.hostNickname ?: "프롤로그")}
                    ${row("장소", v.placeName)}
                    ${row("주소", v.placeAddress)}
                    ${row("참가비", feeValue(v))}
                    ${row("참석 조건", conditionLabel(v))}
                    ${row("남은 자리", seatsValue(v))}
                  </dl>
                  ${recap(v)}
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

    /**
     * 표 안에 넣을 값 — 라벨을 되풀이하지 않는다.
     *
     * '참가비' 칸에 "참가비 35,000원"이 들어가면 같은 말을 두 번 하는 셈이다. 그런데
     * 카카오톡 미리보기 한 줄([ogDescription])에는 라벨이 없으니 "35,000원"만으로는 무슨
     * 숫자인지 알 수 없다 — 그래서 값과 한 줄짜리 문구를 갈라 둔다.
     */
    internal fun feeValue(v: MeetupInvitationView): String {
        // 자리 구분 쉼표는 서버 로케일에 맡기지 않는다 — 배포 환경에 따라 "30.000원"이 될 수 있다.
        fun won(n: Int) = String.format(Locale.KOREA, "%,d원", n)
        if (v.feeFemale != null && v.feeFemale != v.fee) {
            return "남 ${if (v.fee > 0) won(v.fee) else "무료"} · 여 ${if (v.feeFemale > 0) won(v.feeFemale) else "무료"}"
        }
        return if (v.fee > 0) won(v.fee) else "무료"
    }

    internal fun feeLabel(v: MeetupInvitationView): String {
        val value = feeValue(v)
        return if (v.fee > 0 && (v.feeFemale == null || v.feeFemale == v.fee)) "참가비 $value" else value
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

    internal fun seatsValue(v: MeetupInvitationView): String {
        if (!v.open) return "모집이 끝났어요"
        val remaining = (v.capacity - v.confirmedCount).coerceAtLeast(0)
        return if (remaining > 0) "${remaining}자리" else "다 찼어요"
    }

    internal fun seatsLabel(v: MeetupInvitationView): String {
        if (!v.open) return "모집이 끝났어요"
        val remaining = (v.capacity - v.confirmedCount).coerceAtLeast(0)
        return if (remaining > 0) "자리 ${remaining}개 남음" else "자리가 다 찼어요"
    }

    // ── 조판 ──

    /**
     * 나머지 사진들 — 청첩장처럼.
     *
     * 첫 장은 위에 표지로 걸리고, 여기서는 그 뒤의 사진들을 옆으로 밀어 보게 한다.
     * 자바스크립트를 쓰지 않는다(scroll-snap) — 초대장은 링크 하나로 열리는 페이지라
     * 스크립트가 늦게 오거나 막히는 환경에서도 사진은 보여야 한다.
     */
    /**
     * 소개 글 — 글 사이에 사진이 놓인다.
     *
     * 글에 `[사진1]`처럼 적어두면 그 자리에 [bodyImageUrls]의 그 사진이 들어간다.
     * 서식 편집기를 만들지 않은 이유가 이것이다. 글은 여전히 평문이라 저장 형식이 바뀌지 않고,
     * 우리가 만든 표시만 치환하므로 남의 HTML이 끼어들 자리도 없다 — **이스케이프한 뒤에**
     * 치환하는 순서가 그 안전을 지킨다. 순서가 뒤집히면 그 자리가 곧 XSS 구멍이 된다.
     *
     * 가리키는 사진이 없는 표시(사진을 지웠거나 오타)는 조용히 지운다. 화면에 [사진3]이
     * 글자로 남는 것보다는 없는 편이 낫다.
     */
    private fun greeting(description: String?, bodyImageUrls: List<String>): String {
        if (description == null) return ""
        val out = StringBuilder()
        // 같은 정렬이 이어지는 동안은 한 문단으로 묶고 줄만 바꾼다 — 줄마다 문단을 열면 간격이 벌어진다.
        var open: String? = null
        fun close() {
            if (open != null) out.append("</p>")
            open = null
        }
        fun openWith(cls: String) {
            if (open == cls) out.append("<br />") else { close(); out.append("""<p class="$cls">"""); open = cls }
        }

        for (raw in description.split("\n")) {
            val cls = "greeting" + (ALIGN_TOKEN.find(raw)?.let { alignClass(it.groupValues[1]) } ?: "")
            val escaped = escape(ALIGN_TOKEN.replace(raw, ""))
            openWith(cls)
            // 사진은 문단을 끊고 들어간다. 끊은 뒤에는 같은 정렬로 다시 연다.
            val withPhotos = PHOTO_TOKEN.replace(escaped) { match ->
                val index = match.groupValues[1].toIntOrNull()?.minus(1) ?: return@replace ""
                val width = widthClass(match.groupValues[2])
                val size = sizeAttrs(match.groupValues[3], match.groupValues[4])
                // 꽉 찬 사진은 카드 폭까지 커지고, 폭을 정한 사진은 그 안에 머문다 — 받아올 크기도 그만큼 갈린다.
                val thumbWidth = if (width.isEmpty()) ImageUrl.COVER else ImageUrl.INLINE
                bodyImageUrls.getOrNull(index)
                    ?.let { """</p><img class="body-photo$width" src="${escape(ImageUrl.thumb(it, thumbWidth))}"$size alt="" loading="lazy" /><p class="$cls">""" }
                    ?: ""
            }
            out.append(withPhotos)
        }
        close()

        // 사진이 끼어든 자리에 빈 문단이 남는다 — 문단을 열고 닫는 방식이라 어쩔 수 없이 생긴다.
        return out.toString()
            .replace(Regex("""<p class="greeting( center| right)?"><br /></p>"""), "")
            .replace(Regex("""<p class="greeting( center| right)?"></p>"""), "")
    }

    /**
     * 후기 — 모임이 끝난 뒤에 붙는 글.
     *
     * 정보 표 **아래**에 둔다. 초대장을 처음 여는 사람이 알고 싶은 건 언제·어디서·얼마이고,
     * 후기는 그 다음이다. 지난 모임의 초대장을 다시 여는 사람에게는 반대 순서가 맞겠지만,
     * 링크는 대개 열리기 전에 돈다.
     *
     * 조판은 소개 글과 같은 함수를 쓴다 — 같은 문법으로 저장되므로 다르게 그릴 이유가 없다.
     * 승인되지 않은 후기는 애초에 [MeetupInvitationView]에 담기지 않는다.
     */
    private fun recap(v: MeetupInvitationView): String {
        if (v.recap == null && v.recapImageUrls.isEmpty()) return ""
        return """
            <section class="recap">
              <p class="eyebrow">그날의 기록</p>
              ${greeting(v.recap, v.recapImageUrls)}
            </section>
        """.trimIndent()
    }

    private fun gallery(coverUrls: List<String>): String {
        val rest = coverUrls.drop(1)
        if (rest.isEmpty()) return ""
        val items = rest.joinToString("") { """<img src="${escape(ImageUrl.thumb(it, ImageUrl.INLINE))}" alt="" loading="lazy" />""" }
        return """<div class="gallery">$items</div>"""
    }

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
    internal fun page(title: String, head: String, body: String): String = """
        <!doctype html>
        <html lang="ko">
        <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escape(title)}</title>
${head.prependIndent("        ")}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
        <!--
          본문 글씨는 Pretendard — prologue.day의 나머지와 같은 글씨다.

          그동안 이 페이지만 시스템 기본체로 나갔다. font-family에 "Pretendard"가 적혀는
          있었지만 불러오지 않았고, 그나마도 -apple-system 뒤에 있어서 애플 기기에서는
          영영 차례가 오지 않았다. 링크로 열린 초대장과 사이트가 다른 글씨로 보였다는 뜻이고,
          콘솔의 미리보기는 이 페이지를 그대로 끼우므로 거기서도 어긋났다.

          동적 서브셋 판을 쓴다 — 한글은 글자 수가 많아 통짜로 받으면 무겁고, 이 판은 쓰는
          글자만 골라 받는다. 못 받아 오면 아래 폴백이 그대로 받는다.
        -->
        <link rel="stylesheet"
              href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <style>
          :root { --bg:#F6F8FA; --card:#FFFFFF; --sunken:#F3F6F9; --text:#1B2126; --muted:#69747E; --line:#E3E8EE; --point:#D9694C; --on-point:#fff; }
          @media (prefers-color-scheme: dark) {
            :root { --bg:#101418; --card:#181D22; --sunken:#1F252B; --text:#EAEFF4; --muted:#96A1AC; --line:#28303A; --point:#E07A5C; --on-point:#101418; }
          }
          * { box-sizing: border-box; }
          body { margin:0; background:var(--bg); color:var(--text);
                 font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,system-ui,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
                 display:flex; justify-content:center; padding:24px 16px 48px; }
          .card { width:100%; max-width:420px; background:var(--card); border:1px solid var(--line); border-radius:20px; overflow:hidden;
                  padding:0 24px 32px; text-align:center; }
          .cover { display:block; width:calc(100% + 48px); margin:0 -24px 28px; aspect-ratio:4/3; object-fit:cover; background:var(--line); }
          .eyebrow { margin:32px 0 0; font-size:11.5px; font-weight:600; letter-spacing:4px; color:var(--muted); }
          .cover ~ .eyebrow { margin-top:0; }
          .occurrence { margin:10px 0 0; font-size:13px; font-weight:700; color:var(--point); }
          h1 { margin:14px 0 0; font-size:26px; line-height:1.38; letter-spacing:-0.3px; }
          .date { margin:20px 0 0; font-size:22px; font-weight:300; letter-spacing:3px; font-variant-numeric:tabular-nums; }
          .when { margin:8px 0 0; font-size:14px; color:var(--muted); }
          /*
            머리말(눈썹·제목·날짜)만 가운데에 두고 **본문은 왼쪽으로 흘린다**.
            청첩장이 가운데 정렬로 읽히는 건 한 줄 한 줄을 손으로 끊어 놓기 때문이다. 모임장이
            쓰는 소개는 긴 문단이라, 가운데에 두면 줄 끝이 들쭉날쭉해지고 "들려드릴 / 게요."처럼
            한 음절이 홀로 떨어진다. 청첩장다움은 정렬이 아니라 눈썹의 자간·숫자 날짜·여백이 낸다.
          */
          .greeting { margin:36px 0 0; font-size:15.5px; line-height:1.9; letter-spacing:-0.2px; text-align:left; }
          /* 글쓴이가 세운 줄 — 머리줄과 맺는 한 줄이 여기 온다. 기본은 왼쪽이라 클래스가 없다. */
          .greeting.center { text-align:center; }
          .greeting.right { text-align:right; }
          /*
           * 글 사이의 사진 — 카드 밖으로 흘려 폭을 넉넉히 쓴다(폭을 정하지 않았을 때의 모양).
           *
           * height는 auto여야 한다. 표시에 원본 크기가 실려 있으면 브라우저가 width/height
           * 속성으로 비율을 계산해 사진이 도착하기 전에 상자를 잡아주는데, 여기서 height를
           * 못박으면 그 계산이 통째로 무시된다 — 글이 밀리는 이유가 다시 생긴다.
           */
          .body-photo { display:block; width:calc(100% + 48px); height:auto; margin:24px -24px; border-radius:0;
                        object-fit:cover; background:var(--line); }
          /* 폭을 정한 사진은 카드 안으로 들어와 가운데 선다 — 흘려보낼 이유가 없으니 모서리도 둥글다. */
          .body-photo.w25, .body-photo.w50, .body-photo.w75 {
            margin:24px auto; border-radius:14px; }
          .body-photo.w25 { width:25%; }
          .body-photo.w50 { width:50%; }
          .body-photo.w75 { width:75%; }
          /*
            후기 — 정보 표 아래에 선 하나로 갈라 놓는다.

            같은 카드 안이지만 다른 시간의 글이다. 위는 "오세요"이고 여기는 "이랬어요"다.
            그 경계가 없으면 지난 모임의 후기가 모집 문구처럼 읽힌다.
          */
          .recap { margin:36px -24px 0; padding:28px 24px 0; border-top:1px solid var(--line); }
          .recap .eyebrow { margin:0; }
          .recap .greeting { margin-top:18px; }
          /* 사진 여러 장 — 옆으로 밀어 본다. 카드 밖으로 흘러나가게 두면 폭이 넉넉해 보인다. */
          .gallery { display:flex; gap:8px; margin:36px -24px 0; padding:0 24px; overflow-x:auto;
                     scroll-snap-type:x mandatory; scrollbar-width:none; }
          .gallery::-webkit-scrollbar { display:none; }
          .gallery img { flex:0 0 auto; width:72%; max-width:280px; aspect-ratio:4/3; object-fit:cover;
                         border-radius:14px; background:var(--line); scroll-snap-align:center; }
          /*
            표에서 줄마다 긋던 선을 걷어냈다. 면과 테두리를 함께 쓰면 같은 말을 두 번 하는 셈이고,
            다섯 줄에 다섯 개의 선이 그어지면 정보보다 선이 먼저 눈에 든다. 한 칸 눌린 면에
            올려 덩어리로 묶고, 그 안은 여백으로만 가른다.
          */
          .info { margin:40px 0 0; padding:6px 18px; text-align:left; background:var(--sunken); border-radius:16px; }
          .row { display:flex; justify-content:space-between; align-items:baseline; gap:20px; padding:13px 0; }
          dt { font-size:14px; color:var(--muted); flex-shrink:0; }
          dd { margin:0; font-size:15px; font-weight:600; text-align:right; line-height:1.55; }
          .cta { display:block; margin:32px 0 0; padding:17px; border-radius:16px; background:var(--point); color:var(--on-point);
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
