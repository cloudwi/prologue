package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import java.time.Duration
import java.time.Instant
import java.util.UUID

/**
 * 최근 접속을 뭉갠 버킷 — 정확한 시각은 프라이버시상 상대에게 내리지 않는다.
 * 한 달 넘게 조용한 계정은 null(미표시) — "43일 전 접속"은 신뢰를 깎기만 한다.
 */
enum class LastActiveBucket {
    TODAY, THIS_WEEK, WEEKS_AGO;

    companion object {
        fun of(lastSeenAt: Instant?, now: Instant = Instant.now()): LastActiveBucket? {
            if (lastSeenAt == null) return null
            val elapsed = Duration.between(lastSeenAt, now)
            return when {
                elapsed < Duration.ofHours(24) -> TODAY
                elapsed < Duration.ofDays(7) -> THIS_WEEK
                elapsed <= Duration.ofDays(30) -> WEEKS_AGO
                else -> null
            }
        }
    }
}

/**
 * 블라인드 상대. 닉네임 등 신원은 감추되 프로필(성별·나이·키·자기소개·키워드)은 공개한다.
 * 답변(글)은 Give&Take — 내가 오늘 답해야 열린다([answerUnlocked]).
 */
data class PeerView(
    val peerAnswerId: UUID?,
    val peerAnswer: String?,
    val answerUnlocked: Boolean,
    /** 노출 순서대로의 프로필 사진. 가입 시 2장이 필수라 비어 있는 건 옛 데이터뿐이다. */
    val photoUrls: List<String>,
    val nickname: String?,
    /** 미리 써둔 프로필 편지(질문+답). 자기소개를 대신한다. */
    val letters: List<ProfileLetterView>,
    val gender: Gender?,
    /** 만 나이(서버 계산). 생년월일 원본은 상대에게 노출하지 않는다. */
    val age: Int?,
    val region: String?,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
    /** 내가 이 상대에게 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
    val mailSent: Boolean = false,
    /** 최근 접속 버킷. 접속 기록이 없거나 한 달 넘게 조용하면 null(미표시). */
    val lastActive: LastActiveBucket? = null,
)

/**
 * 오늘의 상대 목록. 매일 정오(KST) 전에는 [open]=false, 공개 후에는 최대 2명의 [peers].
 */
data class TodayPeersView(
    val open: Boolean,
    val answerUnlocked: Boolean,
    val peers: List<PeerView>,
)
