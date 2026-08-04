package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class SendMailResult(
    val mailId: UUID,
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
 * 한 통에 우표 1장 — 상호 하트여도 마찬가지(하트는 신호일 뿐, 부치는 값은 같다).
 * 전화번호는 위조를 막기 위해 요청이 아니라 프로필에서 읽는다.
 */
@Service
class MailService(
    private val answerRepository: AnswerRepository,
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
        return sendTo(senderAccountId, peerAnswer.accountId, content, includePhone, kakaoId)
    }

    /** 받은 편지에 답장한다 — 상대는 원본 편지의 발신인. 답장도 한 통의 편지라 값은 같다. */
    @Transactional
    fun reply(
        accountId: UUID,
        mailId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
    ): SendMailResult {
        val original = mailRepository.findById(mailId)
            ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (original.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지에만 답장할 수 있어요")
        return sendTo(accountId, original.senderAccountId, content, includePhone, kakaoId)
    }

    private fun sendTo(
        senderAccountId: UUID,
        recipientId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
    ): SendMailResult {
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

        // 검증을 모두 통과한 뒤에 소모 — 같은 트랜잭션이라 저장이 실패하면 우표도 돌아간다.
        stampService.spendOne(senderAccountId, StampService.REASON_MAIL)

        val saved = mailRepository.save(
            Mail.write(senderAccountId, recipientId, content, phone, kakaoId),
        )
        return SendMailResult(mailId = requireNotNull(saved.id))
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
