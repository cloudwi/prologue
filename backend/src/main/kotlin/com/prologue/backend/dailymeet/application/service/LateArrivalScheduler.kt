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

/** 정오에 새 질문의 도착을 알리고, 이후 매시간 후보 부족으로 미뤄진 소개를 재시도한다. */
@Component
class LateArrivalScheduler(
    private val peerMatchingService: PeerMatchingService,
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val notificationService: NotificationService,
    private val deviceTokenRepository: DeviceTokenRepository,
) {
    /**
     * 정오 — 하루가 갈리는 순간. 새 질문이 열렸다고 알린다.
     *
     * 이제 소개는 시계가 아니라 답변이 연다. 그래서 정오에 보낼 것은 도착이 아니라 초대다 —
     * 오늘의 질문이 바뀌었고, 답을 남기면 사람이 온다는 말.
     *
     * 경계보다 1분 늦게 도는 이유가 있다. [ServiceDay]의 하루도 정오에 넘어가므로 정각에
     * 돌면 스케줄러가 어제의 질문을 집을 수 있다. 1분이면 그 애매함이 사라진다.
     */
    @Scheduled(cron = "0 1 12 * * *", zone = KST_ID)
    fun announceNewQuestion() {
        if (questionRepository.findAllOrdered().isEmpty()) return
        var invited = 0
        deviceTokenRepository.findAllAccountIds().distinct().forEach { accountId ->
            try {
                notificationService.newQuestionArrived(accountId)
                invited++
            } catch (e: RuntimeException) {
                // 한 사람의 실패가 나머지의 알림을 막으면 안 된다
                log.warn("새 질문 알림 실패 — account={}", accountId, e)
            }
        }
        if (invited > 0) log.info("정오에 {}명에게 새 질문을 알렸다", invited)
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
