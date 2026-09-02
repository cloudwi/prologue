package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.AnswerAccessService
import com.prologue.backend.dailymeet.application.service.DailyAnswerService
import com.prologue.backend.dailymeet.application.service.PeerMatchingService
import com.prologue.backend.dailymeet.application.service.ProfileAccessService
import com.prologue.backend.dailymeet.application.service.HeartService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.interfaces.rest.dto.AnswerRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.HeartRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.HeartResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.MyAnswersResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.PastPeersResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.PeerProfileResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.PeersResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReceivedHeartsResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.TodayResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.UnlockPeerResponse
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 오늘의 문답. 인증 필요(JWT).
 */
@RestController
@RequestMapping("/daily")
class DailyMeetController(
    private val dailyAnswerService: DailyAnswerService,
    private val peerMatchingService: PeerMatchingService,
    private val heartService: HeartService,
    private val profileAccessService: ProfileAccessService,
    private val answerAccessService: AnswerAccessService,
) {
    /** 오늘의 질문 + 내 답변 여부. */
    @GetMapping("/today")
    fun today(authentication: Authentication): TodayResponse {
        val accountId = UUID.fromString(authentication.name)
        return TodayResponse.from(dailyAnswerService.today(accountId))
    }

    /** 오늘의 상대 목록 (매일 정오 공개, 최대 2명, 답변은 내가 먼저 답해야 열람 가능). */
    @GetMapping("/today/peers")
    fun peers(authentication: Authentication): PeersResponse {
        val accountId = UUID.fromString(authentication.name)
        return PeersResponse.from(peerMatchingService.todayPeers(accountId))
    }

    /** 지난 상대 — 최근 3일 동안 공개됐던 상대(오늘 제외), 최신 공개 순. */
    @GetMapping("/past-peers")
    fun pastPeers(authentication: Authentication): PastPeersResponse {
        val accountId = UUID.fromString(authentication.name)
        return PastPeersResponse.from(peerMatchingService.pastPeers(accountId))
    }

    /** 답변 id로 상대 프로필 상세 — 편지함(받은 하트)에서 프로필로 들어갈 때. */
    @GetMapping("/peers/{peerAnswerId}")
    fun peerProfile(
        authentication: Authentication,
        @PathVariable peerAnswerId: String,
    ): PeerProfileResponse {
        val accountId = UUID.fromString(authentication.name)
        val answerId = try {
            UUID.fromString(peerAnswerId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("상대 답변 식별자가 올바르지 않습니다")
        }
        return PeerProfileResponse.from(peerMatchingService.peerProfile(accountId, answerId))
    }

    /**
     * 잉크 한 장으로 닫힌 프로필을 다시 연다. 한 번 열면 다시 닫히지 않는다.
     * 이미 열려 있으면 잉크를 쓰지 않고 성공으로 답한다 — 재시도가 두 장을 쓰지 않도록.
     */
    @PostMapping("/peers/{peerAnswerId}/unlock")
    fun unlockPeer(
        authentication: Authentication,
        @PathVariable peerAnswerId: String,
    ): UnlockPeerResponse {
        val accountId = UUID.fromString(authentication.name)
        val answerId = try {
            UUID.fromString(peerAnswerId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("상대 답변 식별자가 올바르지 않습니다")
        }
        val result = profileAccessService.unlock(accountId, answerId)
        return UnlockPeerResponse(
            spent = result.spent,
            balance = result.balance,
            peer = PeerProfileResponse.from(peerMatchingService.peerProfile(accountId, answerId)).peer,
        )
    }

    /**
     * 답하지 않은 날의 상대 답을 잉크로 연다(질문 하루치 단위).
     *
     * 규칙은 그대로다 — 답하면 공짜로 읽는다. 이건 답하지 않은 날에 값을 매기는 길이다.
     * 이미 답했거나 이미 산 질문이면 잉크를 쓰지 않고 성공으로 답한다(멱등).
     */
    @PostMapping("/questions/{questionId}/unlock")
    fun unlockAnswers(
        authentication: Authentication,
        @PathVariable questionId: Long,
    ): UnlockAnswersResponse {
        val accountId = UUID.fromString(authentication.name)
        val result = answerAccessService.unlock(accountId, questionId)
        return UnlockAnswersResponse(spent = result.spent, balance = result.balance)
    }

    /** 내가 남긴 답 — 역대 답변 전부(질문 포함), 최신순. 본인 전용. */
    @GetMapping("/my-answers")
    fun myAnswers(authentication: Authentication): MyAnswersResponse {
        val accountId = UUID.fromString(authentication.name)
        return MyAnswersResponse.from(dailyAnswerService.myAnswers(accountId))
    }

    /** 오늘의 질문에 답변(작성/수정). 답변 후 갱신된 현황 + 이번에 고인 잉크를 반환. */
    @PostMapping("/today/answer")
    fun answer(
        authentication: Authentication,
        @Valid @RequestBody request: AnswerRequest,
    ): TodayResponse {
        val accountId = UUID.fromString(authentication.name)
        val result = dailyAnswerService.answerToday(accountId, request.content)
        return TodayResponse.from(dailyAnswerService.today(accountId), inkEarned = result.inkEarned)
    }

    /** 익명 상대 답변에 하트. 상호 하트면 매칭 성립. */
    @PostMapping("/today/heart")
    fun heart(
        authentication: Authentication,
        @Valid @RequestBody request: HeartRequest,
    ): HeartResponse {
        val accountId = UUID.fromString(authentication.name)
        val peerAnswerId = try {
            UUID.fromString(request.peerAnswerId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("상대 답변 식별자가 올바르지 않습니다")
        }
        return HeartResponse.from(heartService.heart(accountId, peerAnswerId))
    }

    /** 나에게 하트를 보낸 사람들 — 상호가 된 사람도 남는다. 되보내기는 프로필 상세에서. */
    @GetMapping("/hearts/received")
    fun receivedHearts(authentication: Authentication): ReceivedHeartsResponse {
        val accountId = UUID.fromString(authentication.name)
        return ReceivedHeartsResponse.from(heartService.receivedHearts(accountId))
    }

    /** 내가 하트를 보낸 사람들 — 답이 온 사람(상호)도, 아직인 사람도. 받은 하트와 같은 모양. */
    @GetMapping("/hearts/sent")
    fun sentHearts(authentication: Authentication): ReceivedHeartsResponse {
        val accountId = UUID.fromString(authentication.name)
        return ReceivedHeartsResponse.from(heartService.sentHearts(accountId))
    }
}

/** 문답 열람권 구매 결과 — [spent]가 false면 이미 열려 있어 잉크를 쓰지 않았다는 뜻. */
data class UnlockAnswersResponse(
    val spent: Boolean,
    val balance: Int,
)
