package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Drinking
import com.prologue.backend.member.domain.model.MeetFrequency
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Smoking
import com.prologue.backend.member.domain.model.Religion
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
    /** 상대가 답한 질문. 후보를 최근 며칠치로 넓혀서, 오늘 질문이 아닐 수 있다. */
    val question: String?,
    /** 그 질문의 id — 답이 잠겨 있을 때 앱이 잉크로 열 대상을 가리키는 값이다. */
    val questionId: Long? = null,
    val answerUnlocked: Boolean,
    /** 노출 순서대로의 프로필 사진. 가입 시 2장이 필수라 비어 있는 건 옛 데이터뿐이다. */
    val photoUrls: List<String>,
    val nickname: String?,
    /** 미리 써둔 프로필 편지(질문+답). 자기소개를 대신한다. */
    val letters: List<ProfileLetterView>,
    /**
     * 이 사람이 최근에 남긴 답 몇 개(최신순, [peerAnswer]로 이미 보여준 답은 뺀다).
     *
     * 하트를 받았을 때 "이 사람은 무슨 생각을 하는 사람인가"를 알 방법이 한 편밖에 없었다(2026-08-25).
     * 미리 써둔 프로필 문답은 잘 다듬은 자기소개라면, 이건 그날그날의 목소리다 — 둘이 함께 있어야 사람이 보인다.
     * 프로필이 열려 있을 때만 담긴다(잠기면 [locked]가 비운다) — 창을 여는 값은 이미 치른 뒤다.
     */
    val recentAnswers: List<PeerAnswerView> = emptyList(),
    /**
     * 나와 똑같이 고른 취향 카드 몇 장([SharedTasteView]).
     *
     * 점수는 뒤에서 조용히 순서를 바꿀 뿐이라, 카드를 넘긴 값이 화면에 보이지 않으면 아무도 두 번
     * 넘기지 않는다. "둘 다 밤형"이라는 한 줄이 첫 인사를 훨씬 쉽게 만들기도 한다.
     * 답변과 같은 규칙으로 잠긴다 — 창이 닫히면 함께 비운다([locked]).
     */
    val sharedTastes: List<SharedTasteView> = emptyList(),
    val gender: Gender?,
    /** 만 나이(서버 계산). 생년월일 원본은 상대에게 노출하지 않는다. */
    val age: Int?,
    val region: String?,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    /**
     * 종교·정치 성향(민감정보). 본인이 적어 **공개하기로 한 값**만 온다 — 안 적었으면 null이고,
     * 그때는 화면에도 아무것도 그리지 않는다("무응답"이라는 말조차 정보다).
     * 프로필이 잠기면 다른 상세와 함께 비운다([locked]).
     */
    val religion: Religion? = null,
    val politicalLeaning: PoliticalLeaning? = null,
    /**
     * 생활 습관 — 흡연·음주·만나는 빈도. 본인이 고른 것만 온다(안 고르면 null).
     * 민감정보가 아니라 동의로 잠기지는 않지만, 프로필이 닫히면 다른 상세와 함께 비운다.
     */
    val smoking: Smoking? = null,
    val drinking: Drinking? = null,
    val meetFrequency: MeetFrequency? = null,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
    /** 내가 이 상대에게 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
    val mailSent: Boolean = false,
    /** 내가 이 상대에게 이미 하트를 보냈는지. 하트는 한 사람에게 한 번뿐이라 화면이 미리 알아야 한다. */
    val hearted: Boolean = false,
    /** 최근 접속 버킷. 접속 기록이 없거나 한 달 넘게 조용하면 null(미표시). */
    val lastActive: LastActiveBucket? = null,
    /** 직장 인증 여부 — 모임 프로필과 같은 신뢰 신호를 매칭 프로필에도 단다. */
    val jobVerified: Boolean = false,
    /** 인증한 회사 이메일 도메인 — 배지에 노출(유저 결정 2026-08-24, 약관 고지). 미인증이면 null. */
    val jobDomain: String? = null,
    /**
     * 이어진 지 사흘이 지나 닫힌 프로필인지(ProfileAccess). true면 사진·답변·상세가 비어 온다 —
     * 화면이 "빈 프로필"과 "잠긴 프로필"을 구별할 수 있어야 잉크를 쓸 자리를 안내할 수 있다.
     */
    val locked: Boolean = false,
) {
    /**
     * 잠긴 상태의 자신 — 누구인지는 남기고 볼거리는 지운다.
     *
     * 닉네임·나이·지역·아바타를 남기는 건 목록이 이름 없는 자물쇠 줄이 되지 않게 하기 위해서다.
     * 잉크를 쓸지 정하려면 누구인지는 알아야 한다. 사진과 답변, 자기소개는 그 값이 치를 대상이다.
     */
    fun locked(): PeerView = copy(
        locked = true,
        photoUrls = emptyList(),
        peerAnswer = null,
        answerUnlocked = false,
        letters = emptyList(),
        recentAnswers = emptyList(),
        sharedTastes = emptyList(),
        bio = null,
        heightCm = null,
        bodyType = null,
        religion = null,
        politicalLeaning = null,
        smoking = null,
        drinking = null,
        meetFrequency = null,
        hobbies = emptyList(),
        interests = emptyList(),
        strengths = emptyList(),
    )
}

/** 지난 상대의 그날 문답 하나. [questionId]는 잠긴 하루를 잉크로 열 때 앱이 가리키는 값이다. */
data class PeerAnswerView(
    val questionId: Long,
    val question: String,
    val content: String,
    val answeredAt: Instant,
)

/**
 * 오늘의 상대 목록. 매일 정오(KST) 전에는 [open]=false, 공개 후에는 최대 2명의 [peers].
 */
data class TodayPeersView(
    /**
     * 공개 시각이 사라진 뒤로는 언제나 true(2026-08-25).
     * 정오 카운트다운을 그리던 옛 앱이 이 값을 보고 있어 필드는 남긴다 — 가산적 변경 원칙.
     */
    val open: Boolean,
    val answerUnlocked: Boolean,
    /**
     * [peers]가 오늘 도착한 사람이 아니라 지난번에 만난 사람이라는 표시.
     * 아직 오늘 답하지 않았다는 뜻이고, 앱은 "답을 남기면 새로운 사람이 도착해요"로 안내한다.
     */
    val carriedOver: Boolean = false,
    val peers: List<PeerView>,
)
