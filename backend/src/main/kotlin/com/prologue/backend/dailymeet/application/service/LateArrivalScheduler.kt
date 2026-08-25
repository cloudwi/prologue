package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.model.ServiceDay
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.notification.application.service.NotificationService
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 늦게 도착하는 인연 — 답할 때 비어 있던 자리를 낮 동안 채우고, 채워지면 알린다.
 *
 * 답을 남기면 그 자리에서 상대가 도착하지만, 그 시각에 자격을 갖춘 후보가 하나도 없으면
 * (노출 상한·성비·차단) 자리가 빈 채로 남는다. 그 사람은 저녁에 누가 답을 남겨도 앱을 다시
 * 열어야만 만나고, 빈 화면을 본 사람은 다시 열지 않는다. 이 스케줄러가 오늘 답한 사람 전원의
 * 빈자리를 한 시간에 한 번 채워 보고, 새로 채워진 사람에게만 알린다.
 * 밤에는 돌지 않는다 — 자정 직전의 도착은 내일의 도착보다 반갑지 않다.
 */
@Component
class LateArrivalScheduler(
    private val peerMatchingService: PeerMatchingService,
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val notificationService: NotificationService,
) {
    /**
     * 8시~22시(KST) 매시 정각. 공개 시각이 사라져 이른 아침에 답하는 사람이 생겼으므로
     * 예전(13~21시)보다 일찍 시작한다. 21시에는 미답변 안내가 따로 나가지만, 그건 답하지 않은
     * 사람에게 가는 것이라 여기(답한 사람의 빈자리)와 겹치지 않는다.
     */
    @Scheduled(cron = "0 0 8-22 * * *", zone = KST_ID)
    fun fillAndNotify() {
        val questions = questionRepository.findAllOrdered()
        if (questions.isEmpty()) return
        val today = QuestionRotation.of(questions, ServiceDay.now())
        var arrived = 0
        answerRepository.findAllByQuestionId(today.id).map { it.accountId }.distinct().forEach { accountId ->
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
