package com.prologue.backend.dailymeet.interfaces.web

/**
 * 사진 주소 → 화면에 필요한 크기만 받아오는 주소.
 *
 * 앱의 `lib/image.ts` [thumbUrl]과 같은 일을 한다. 앱은 진작 이걸 쓰고 있었는데 **초대장과
 * 목록만 원본 주소를 그대로 내보내고 있었다**(2026-08-31). 모임장이 올린 1.9MB짜리 그림이
 * 링크를 연 사람에게 통째로 날아갔다는 뜻이다.
 *
 * Supabase Storage의 변환 엔드포인트는 폭을 주면 그 크기로 만들어 주고, 브라우저가
 * `Accept: image/webp`를 보내면 WebP로 내려준다. 위의 1.9MB PNG로 실측한 값:
 *
 *     width=600  PNG 622KB / WebP 26.7KB
 *     width=900  PNG 1.36MB / WebP 49.8KB
 *
 * 요즘 브라우저는 전부 WebP를 받는다. 사진을 올릴 때 줄이지 않아도 여기서 해결되고,
 * **이미 올라가 있는 사진까지 함께 고쳐진다** — 모임장에게 "JPEG로 다시 올려주세요"라고
 * 부탁할 일이 아니었다.
 *
 * `resize=contain`이 빠지면 줄이는 게 아니라 **자른다** — Supabase의 기본 모드가 cover라
 * 폭만 주면 높이를 원본대로 두고 가운데를 세로로 오려낸다. 자르는 일은 CSS(object-fit)가
 * 하고, 여기서는 비율대로 줄이기만 한다. 앱이 같은 자리에서 겪은 일이다.
 */
object ImageUrl {

    private const val OBJECT_PATH = "/storage/v1/object/public/"
    private const val RENDER_PATH = "/storage/v1/render/image/public/"

    /**
     * 초대장 커버(카드 폭 420px까지 꽉 차게)와 본문 100% 사진.
     * 고해상도 화면을 감안해 표시 폭의 2배 남짓으로 잡는다.
     */
    const val COVER = 900

    /** 본문 25·50·75% 사진(카드 안쪽 372px의 일부)과 커버 갤러리(최대 280px). */
    const val INLINE = 600

    /** 목록 한 줄의 썸네일 — 76×95px로 작게 보이는 만큼 3배까지 갈 필요가 없다. */
    const val ROW = 240

    /**
     * [width]px로 줄인 주소. 우리 저장소 사진이 아니거나 이미 물음표가 붙어 있으면
     * (변환을 거쳤거나 서명된 주소) 손대지 않고 그대로 돌려준다.
     */
    fun thumb(url: String, width: Int): String {
        if (!url.contains(OBJECT_PATH) || url.contains('?')) return url
        return url.replace(OBJECT_PATH, RENDER_PATH) + "?width=$width&resize=contain&quality=70"
    }
}
