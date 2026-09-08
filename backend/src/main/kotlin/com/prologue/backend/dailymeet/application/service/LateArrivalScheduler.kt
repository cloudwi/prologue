package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.model.ServiceDay
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.notification.application.service.NotificationService
import com.prologue.backend.notification.domain.repository.DeviceTokenRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/** 정오에 기본 소개, 이후 매시간 후보 부족으로 미뤄진 소개를 재시도한다. */
@Component
class LateArrivalScheduler(
    private val peerMatchingService: PeerMatchingService,
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val notificationService: NotificationService,
    private val deviceTokenRepository: DeviceTokenRepository,
) {
    /** 새 상대가 실제로 도착한 계정에만 알린다. */
    @Scheduled(cron = "0 0 12 * * *", zone = KST_ID)
    fun revealAndNotifyUnanswered() {
        val questions = questionRepository.findAllOrdered()
        if (questions.isEmpty()) return
        val today = QuestionRotation.of(questions, ServiceDay.now())
        val answered = answerRepository.findAllByQuestionId(today.id).map { it.accountId }.toSet()
        var arrived = 0
        deviceTokenRepository.findAllAccountIds().distinct().forEach { accountId ->
            try {
                if (peerMatchingService.fillLockedArrival(accountId)) {
                    if (accountId in answered) notificationService.peerArrived(accountId)
                    else notificationService.lockedPeerArrived(accountId)
                    arrived++
                }
            } catch (e: RuntimeException) {
                // 프로필이 없거나(온보딩 중단) 한 사람의 실패가 나머지의 도착을 막으면 안 된다
                log.warn("정오 도착 채우기 실패 — account={}", accountId, e)
            }
        }
        if (arrived > 0) log.info("정오에 {}명에게 오늘의 상대를 보냈다", arrived)
    }

    /** 새 상대가 실제로 도착한 계정에만 알린다. */
    @Scheduled(cron = "0 0 13-22 * * *", zone = KST_ID)
    fun fillAndNotify() {
        // 답변자와 기기 등록자의 미완료 소개를 다시 시도한다.
        val questions = questionRepository.findAllOrdered()
        if (questions.isEmpty()) return
        val today = QuestionRotation.of(questions, ServiceDay.now())
        var arrived = 0
        (answerRepository.findAllByQuestionId(today.id).map { it.accountId } + deviceTokenRepository.findAllAccountIds()).distinct().forEach { accountId ->
            try {
                if (peerMatchingService.fillLateArrival(accountId)) {
                    notificationService.peerArrived(accountId)
                    arrived++
                }
            } catch (e: RuntimeException) {
                // 한 사람의 실패가 나머지의 도착을 막으면 안 된다
                log.warn("늦은 도착 채우기 실패 — account={}", accountId, e)
            }
        }
        if (arrived > 0) log.info("늦은 도착 {}명에게 오늘의 상대를 채우고 알렸다", arrived)
    }

    private companion object {
        const val KST_ID = "Asia/Seoul"
        val log = LoggerFactory.getLogger(LateArrivalScheduler::class.java)
    }
}
