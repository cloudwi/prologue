package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.LastActiveBucket
import com.prologue.backend.dailymeet.application.service.PeerView
import com.prologue.backend.dailymeet.application.service.TodayPeersView
import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Religion

data class PeerResponse(
    val peerAnswerId: String?,
    val peerAnswer: String?,
    /** 상대가 답한 질문 — 오늘 질문이 아닐 수 있어 화면은 이 값을 우선 쓴다. */
    val question: String?,
    /** 그 질문의 id — 답이 잠겨 있을 때 잉크로 열 대상을 가리킨다. */
    val questionId: Long?,
    val answerUnlocked: Boolean,
    val photoUrls: List<String>,
    val nickname: String?,
    val letters: List<ProfileLetterDtos.Letter>,
    /** 그 사람이 최근에 남긴 답 몇 개 — 한 사람을 자세히 보는 자리에서만 채워진다. */
    val recentAnswers: List<RecentAnswer>,
    /** 나와 똑같이 고른 취향 카드 — 상대가 덧붙인 한 줄까지. 목록에서는 비어 있다. */
    val sharedTastes: List<SharedTaste>,
    val gender: Gender?,
    val age: Int?,
    val region: String?,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    /** 상대가 적어 공개하기로 한 종교·정치 성향. 안 적었으면 null. */
    val religion: Religion?,
    val politicalLeaning: PoliticalLeaning?,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
    /** 내가 이 상대에게 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
    val mailSent: Boolean,
    /** 내가 이 상대에게 이미 하트를 보냈는지(하트는 한 사람에게 한 번). */
    val hearted: Boolean,
    /** 최근 접속 버킷(TODAY/THIS_WEEK/WEEKS_AGO). 기록 없음·한 달 초과는 null. */
    val lastActive: LastActiveBucket?,
    /** 직장 인증 여부 — 모임 프로필과 같은 신뢰 신호를 매칭 프로필에도 단다. */
    val jobVerified: Boolean,
    /** 인증한 회사 이메일 도메인. 배지에 그대로 노출된다(유저 결정 2026-08-24). 미인증이면 null. */
    val jobDomain: String?,
    /** 이어진 지 사흘이 지나 닫힌 프로필. true면 사진·답변·상세가 비어 있고, 열려면 잉크가 든다. */
    val locked: Boolean,
) {
    data class RecentAnswer(
        val questionId: Long,
        val question: String,
        val content: String,
        val answeredAt: java.time.Instant,
    )

    data class SharedTaste(
        val cardId: Long,
        val prompt: String,
        val choice: String,
        val peerNote: String?,
    )

    companion object {
        fun from(view: PeerView): PeerResponse =
            PeerResponse(
                mailSent = view.mailSent,
                hearted = view.hearted,
                peerAnswerId = view.peerAnswerId?.toString(),
                peerAnswer = view.peerAnswer,
                question = view.question,
                questionId = view.questionId,
                answerUnlocked = view.answerUnlocked,
                photoUrls = view.photoUrls,
                nickname = view.nickname,
                letters = view.letters.map { ProfileLetterDtos.Letter(it.questionId, it.question, it.content) },
                recentAnswers = view.recentAnswers.map { RecentAnswer(it.questionId, it.question, it.content, it.answeredAt) },
                sharedTastes = view.sharedTastes.map { SharedTaste(it.cardId, it.prompt, it.choice, it.peerNote) },
                gender = view.gender,
                age = view.age,
                region = view.region,
                bio = view.bio,
                heightCm = view.heightCm,
                bodyType = view.bodyType,
                religion = view.religion,
                politicalLeaning = view.politicalLeaning,
                hobbies = view.hobbies,
                interests = view.interests,
                strengths = view.strengths,
                avatarId = view.avatarId,
                lastActive = view.lastActive,
                jobVerified = view.jobVerified,
                jobDomain = view.jobDomain,
                locked = view.locked,
            )
    }
}

/** 답변 id로 조회한 상대 프로필 — 그 답의 질문을 함께. */
data class PeerProfileResponse(
    val question: String,
    val peer: PeerResponse,
) {
    companion object {
        fun from(view: com.prologue.backend.dailymeet.application.service.PeerProfileView): PeerProfileResponse =
            PeerProfileResponse(view.question, PeerResponse.from(view.peer))
    }
}

/** 오늘의 상대 목록 — 정오 전에는 open=false, 공개 후 최대 3명. */
data class PeersResponse(
    val open: Boolean,
    val answerUnlocked: Boolean,
    val peers: List<PeerResponse>,
) {
    companion object {
        fun from(view: TodayPeersView): PeersResponse =
            PeersResponse(
                open = view.open,
                answerUnlocked = view.answerUnlocked,
                peers = view.peers.map(PeerResponse::from),
            )
    }
}
