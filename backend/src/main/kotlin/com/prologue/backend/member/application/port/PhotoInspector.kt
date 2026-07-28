package com.prologue.backend.member.application.port

/**
 * 프로필 사진 검수 아웃 포트(SPI).
 *
 * 소개팅 서비스라 "얼굴이 담긴 사진인지"가 프로필의 최소 조건이다.
 * 풍경·짤·화면 캡처가 대표 사진으로 올라가는 걸 업로드 시점에 막는다.
 * 클라이언트에서 거르는 건 우회가 가능하므로 판정은 서버에서 한다.
 */
interface PhotoInspector {
    /** 이미지 바이트를 검사해 얼굴 수·선정성 판정을 돌려준다. 실패해도 예외 대신 [PhotoInspection.skipped]를 반환한다. */
    fun inspect(bytes: ByteArray, contentType: String): PhotoInspection
}

/**
 * 사진 검수 결과. 통과/거절 판단(정책)은 애플리케이션 서비스가 하고, 여기서는 사실만 담는다.
 *
 * @param faceCount 감지된 얼굴 수
 * @param largestFaceRatio 가장 큰 얼굴이 사진 넓이에서 차지하는 비율(0~1). 이미지 크기를 못 읽으면 null.
 * @param unsafe 선정적·폭력적이라 게시할 수 없는 사진
 * @param skipped 검수기가 꺼져 있거나 호출에 실패해 판별하지 못함 → 통과시킨다
 */
data class PhotoInspection(
    val faceCount: Int,
    val largestFaceRatio: Double?,
    val unsafe: Boolean,
    val skipped: Boolean = false,
) {
    companion object {
        /** 판별 불가. 검수기 미설정·API 오류처럼 "우리 사정"으로 회원 업로드를 막지 않기 위한 값. */
        fun skipped() = PhotoInspection(faceCount = 0, largestFaceRatio = null, unsafe = false, skipped = true)
    }
}

/** 검수에서 걸러진 사진. 사용자에게 그대로 보여줄 안내 문구를 message에 담는다. (→ 422) */
class PhotoRejectedException(message: String) : RuntimeException(message)
