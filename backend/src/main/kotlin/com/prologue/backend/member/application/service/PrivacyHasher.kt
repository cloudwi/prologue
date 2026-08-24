package com.prologue.backend.member.application.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * 개인정보 대조용 해시 — 원문은 버리고 "같은 값인가"만 남긴다.
 *
 * 전화번호(차단 목록)와 회사 이메일(직장 인증 재사용 방지)이 쓴다. 두 값 모두 경우의 수가
 * 작아 맨 SHA-256은 금방 역산된다 — 서버만 아는 페퍼를 섞은 HMAC이어야 해시가 의미 있다.
 * 페퍼를 따로 정하지 않으면 JWT 시크릿을 빌려 쓴다.
 * 주의: 페퍼가 바뀌면 저장된 해시가 전부 무효가 된다(차단·인증 기록이 대조에 실패한다).
 */
@Component
class PrivacyHasher(
    @param:Value("\${privacy.hash-pepper:\${jwt.secret}}") private val pepper: String,
) {
    fun hash(value: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(pepper.toByteArray(), "HmacSHA256"))
        return mac.doFinal(value.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
