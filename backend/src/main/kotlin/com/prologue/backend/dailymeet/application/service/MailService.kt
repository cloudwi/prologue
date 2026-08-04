package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 보낸 결과 — 상호 하트면 우표를 쓰지 않는다. */
data class SendMailResult(
    val mailId: UUID,
    val freeByMatch: Boolean,
)

/** 받은 편지 한 통 — 보낸 사람 요약과 내용·연락처가 바로 보인다. */
data class ReceivedMailView(
    val mailId: UUID,
    val nickname: String,
    val age: Int,
    val region: String,
    val avatarId: Int?,
    val photoUrl: String?,
    val content: String,
    val phone: String?,
    val kakaoId: String?,
    val createdAt: Instant,
)

/**
 * 편지 유스케이스 — 인앱 채팅 대신 연락처(전화번호/카카오톡 ID)를 건넨다.
 * 상호 하트면 무료, 아니면 우표 1장. 전화번호는 위조를 막기 위해 요청이 아니라 프로필에서 읽는다.
 */
@Service
class MailService(
    private val answerRepository: AnswerRepository,
    private val heartRepository: HeartRepository,
    private val mailRepository: MailRepository,
    private val memberQueryService: MemberQueryService,
    private val stampService: StampService,
) {
    /** 상대 답변(peerAnswerId)의 주인에게 편지를 보낸다. */
    @Transactional
    fun send(
        senderAccountId: UUID,
        peerAnswerId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
    ): SendMailResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val recipientId = peerAnswer.accountId
        if (senderAccountId == recipientId) throw DailyMeetException("자신에게는 편지를 보낼 수 없어요")
        if (mailRepository.existsBySenderAndRecipient(senderAccountId, recipientId)) {
            throw DailyMeetException("이미 편지를 보낸 상대예요")
        }

        val phone = if (includePhone) {
            memberQueryService.findProfile(senderAccountId)?.phone
                ?: throw DailyMeetException("프로필에 전화번호가 없어요. 기본 정보에서 먼저 등록해주세요")
        } else {
            null
        }

        val mutualHeart = heartRepository.existsFromTo(senderAccountId, recipientId) &&
            heartRepository.existsFromTo(recipientId, senderAccountId)
        // 검증을 모두 통과한 뒤에 소모 — 같은 트랜잭션이라 저장이 실패하면 우표도 돌아간다.
        if (!mutualHeart) stampService.spendOne(senderAccountId, StampService.REASON_MAIL)

        val saved = mailRepository.save(
            Mail.write(senderAccountId, recipientId, content, phone, kakaoId),
        )
        return SendMailResult(mailId = requireNotNull(saved.id), freeByMatch = mutualHeart)
    }

    /** 받은 편지 목록, 최신순. 연락처는 바로 보인다 — 보낸 사람이 스스로 건넨 것이라서. */
    @Transactional(readOnly = true)
    fun received(accountId: UUID): List<ReceivedMailView> =
        mailRepository.findAllByRecipient(accountId).mapNotNull { mail ->
            val sender = memberQueryService.findProfile(mail.senderAccountId) ?: return@mapNotNull null
            ReceivedMailView(
                mailId = requireNotNull(mail.id),
                nickname = sender.nickname,
                age = sender.age(),
                region = sender.region,
                avatarId = sender.avatarId,
                photoUrl = sender.photoUrls.firstOrNull(),
                content = mail.content,
                phone = mail.phone,
                kakaoId = mail.kakaoId,
                createdAt = mail.createdAt,
            )
        }
}
