package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.notification.application.service.NotificationService
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.ZoneId

/**
 * 늦게 도착하는 인연 — 정오에 비었던 자리를 오후 동안 채우고, 채워지면 알린다.
 *
 * 오늘의 상대는 조회할 때 채워진다. 그래서 정오에 후보가 없던 사람은 저녁에 누가 답을 남겨도
 * 앱을 다시 열어야만 만난다 — 그리고 빈 화면을 본 사람은 다시 열지 않는다. 이 스케줄러가
 * 오늘 답한 사람 전원의 빈자리를 한 시간에 한 번 채워 보고, 새로 채워진 사람에게만 알린다.
 * 밤에는 돌지 않는다 — 자정 직전의 도착은 내일 정오의 도착보다 반갑지 않다.
 */
@Component
class LateArrivalScheduler(
    private val peerMatchingService: PeerMatchingService,
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val notificationService: NotificationService,
) {
    /** 13시~21시(KST) 매시 정각. 정오는 공개 알림이 따로 가므로 뺀다. */
    @Scheduled(cron = "0 0 13-21 * * *", zone = KST_ID)
    fun fillAndNotify() {
        val questions = questionRepository.findAllOrdered()
        if (questions.isEmpty()) return
        val today = QuestionRotation.of(questions, LocalDate.now(KST))
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
        val KST: ZoneId = ZoneId.of(KST_ID)
        val log = LoggerFactory.getLogger(LateArrivalScheduler::class.java)
    }
}
