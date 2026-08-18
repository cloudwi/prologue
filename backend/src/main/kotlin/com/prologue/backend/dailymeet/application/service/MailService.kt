package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.model.MailStatus
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.notification.application.service.NotificationService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class SendMailResult(
    val mailId: UUID,
    /** 실제로 쓴 잉크 — 정가인지 상호 하트 할인가인지 화면이 그대로 말해줄 수 있게. */
    val inkSpent: Int,
)

/** 편지값이 정가에서 내려간 이유. 화면이 "왜 싼지"를 말해줄 수 있게 값과 함께 준다. */
enum class MailDiscount {
    /** 서로 하트를 주고받은 사이 — [InkPrice.MAIL_MUTUAL]. */
    MUTUAL,
    /** 받은 편지에 답장 — [InkPrice.MAIL_REPLY]. 상호 하트보다 우선한다(더 낮다). */
    REPLY,
}

/**
 * 편지값 견적 — 부치기 전에 화면이 "얼마가 드는지"를 물을 때.
 * 답장이면 [InkPrice.MAIL_REPLY], 상호 하트면 [InkPrice.MAIL_MUTUAL], 아니면 정가([InkPrice.MAIL]).
 */
data class MailQuote(
    val price: Int,
    /** 할인 이유. 정가면 null. */
    val discount: MailDiscount?,
) {
    companion object {
        val FULL = MailQuote(InkPrice.MAIL, null)
        val MUTUAL = MailQuote(InkPrice.MAIL_MUTUAL, MailDiscount.MUTUAL)
        val REPLY = MailQuote(InkPrice.MAIL_REPLY, MailDiscount.REPLY)
    }
}

/** 내가 보낸 편지 한 통 — 부친 뒤에는 고칠 수 없는 기록이라 읽기 전용이다. */
data class SentMailView(
    val mailId: UUID,
    val recipientNickname: String?,
    val content: String,
    val phone: String?,
    val kakaoId: String?,
    /** 상대가 열었는지. 봉투(PENDING)인 동안에만 회수할 수 있다. */
    val status: MailStatus,
    /** 지금 회수할 수 있는지 — 화면이 버튼을 미리 감출 수 있도록 서버가 판정해 준다. */
    val recallable: Boolean,
    /** 회수하면 돌아올 잉크 — 부친 값의 절반이라 편지마다 다르다. 화면이 값표에서 셈하지 않도록 서버가 준다. */
    val recallRefund: Int,
    val createdAt: Instant,
)

/**
 * 받은 편지 한 통 — 봉투(PENDING) 상태에서는 보낸 사람 요약만 보이고
 * 내용·연락처는 null. 열어야(OPENED) 채워진다.
 */
data class ReceivedMailView(
    val mailId: UUID,
    val nickname: String,
    val age: Int,
    val region: String,
    val avatarId: Int?,
    val photoUrl: String?,
    val status: MailStatus,
    val content: String?,
    val phone: String?,
    val kakaoId: String?,
    /** 보낸 사람의 최근 답변 id — 프로필 상세로 들어가는 손잡이. 답이 없으면 null(진입 불가). */
    val peerAnswerId: UUID?,
    /** 내가 이 사람에게 이미 편지를 보냈는지 — true면 답장 대신 보낸 편지 확인. */
    val replied: Boolean,
    val createdAt: Instant,
)

/**
 * 편지 유스케이스 — 인앱 채팅 대신 연락처(전화번호/카카오톡 ID)를 건넨다.
 * 한 통에 잉크 50, 서로 하트를 주고받은 상대에게는 35(30% 할인), 받은 편지에 답장은 25(50% 할인).
 * 값은 "어떤 관계에서 부치는가"로 정해진다 — 먼저 다가가는 편지가 가장 무겁고, 이미 값을 치른
 * 마음에 답하는 편지가 가장 가볍다.
 * 전화번호는 위조를 막기 위해 요청이 아니라 프로필에서 읽는다.
 *
 * 읽히지 않은 편지는 사흘 뒤 되찾아갈 수 있고, 그때 부친 잉크의 절반이 돌아온다.
 * 거절당한 편지는 돌려주지 않는다 — 잉크가 돌아오는 것만으로 거절당한 사실이 드러나서,
 * "조용히 거절한다"는 약속이 깨진다.
 */
@Service
class MailService(
    private val answerRepository: AnswerRepository,
    private val mailRepository: MailRepository,
    private val heartRepository: HeartRepository,
    private val memberQueryService: MemberQueryService,
    private val inkService: InkService,
    private val notificationService: NotificationService,
) {
    /** 상대 답변(peerAnswerId)의 주인에게 부칠 때 드는 값. */
    @Transactional(readOnly = true)
    fun quoteFor(senderAccountId: UUID, peerAnswerId: UUID): MailQuote {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        return quoteBetween(senderAccountId, peerAnswer.accountId)
    }

    /** 받은 편지(mailId)에 답장할 때 드는 값 — 답장은 늘 [InkPrice.MAIL_REPLY]. */
    @Transactional(readOnly = true)
    fun quoteForReply(accountId: UUID, mailId: UUID): MailQuote {
        val original = mailRepository.findById(mailId)
            ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (original.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지에만 답장할 수 있어요")
        return MailQuote.REPLY
    }

    /** 첫 편지의 값 — 서로 하트를 주고받은 사이면 할인, 아니면 정가. */
    private fun quoteBetween(senderAccountId: UUID, recipientId: UUID): MailQuote {
        val mutual = heartRepository.existsFromTo(senderAccountId, recipientId) &&
            heartRepository.existsFromTo(recipientId, senderAccountId)
        return if (mutual) MailQuote.MUTUAL else MailQuote.FULL
    }

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
        return sendTo(senderAccountId, recipientId, content, includePhone, kakaoId, quoteBetween(senderAccountId, recipientId))
    }

    /** 받은 편지에 답장한다 — 상대는 원본 편지의 발신인. 답장은 절반값([InkPrice.MAIL_REPLY]). */
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
        return sendTo(accountId, original.senderAccountId, content, includePhone, kakaoId, MailQuote.REPLY)
    }

    private fun sendTo(
        senderAccountId: UUID,
        recipientId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
        quote: MailQuote,
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

        // 검증을 모두 통과한 뒤에 소모 — 같은 트랜잭션이라 저장이 실패하면 잉크도 돌아간다.
        val price = quote.price
        inkService.spend(senderAccountId, price, InkService.REASON_MAIL)

        val saved = mailRepository.save(
            Mail.write(senderAccountId, recipientId, content, phone, kakaoId, inkPaid = price),
        )
        // 받는 사람이 모르고 지나가면 보낸 사람의 잉크가 헛되이 사라진다.
        notificationService.letterArrived(recipientId)
        return SendMailResult(mailId = requireNotNull(saved.id), inkSpent = price)
    }

    /** 받은 편지 목록, 최신순. 봉투는 요약만, 열린 편지는 내용·연락처까지. 거절한 편지는 아예 없다. */
    @Transactional(readOnly = true)
    fun received(accountId: UUID): List<ReceivedMailView> =
        mailRepository.findAllByRecipient(accountId).mapNotNull { mail -> receivedView(accountId, mail) }

    /** 봉투를 연다 — 열린 편지 뷰를 돌려준다(멱등). */
    @Transactional
    fun open(accountId: UUID, mailId: UUID): ReceivedMailView {
        val mail = mailRepository.findById(mailId) ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (mail.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지만 열 수 있어요")
        mail.open()
        val saved = mailRepository.save(mail)
        return receivedView(accountId, saved) ?: throw DailyMeetException("보낸 사람의 프로필을 찾을 수 없어요")
    }

    /**
     * 읽히지 않은 편지를 되찾아간다 — 부친 잉크의 절반이 돌아온다.
     *
     * 절반인 데는 이유가 있다. 전액이면 아무에게나 보내고 되거두는 게 공짜가 되어
     * 편지가 신중한 한 통이길 그만두고, 한 푼도 안 주면 상대가 읽지도 않은 값을 그대로 잃는다.
     *
     * 회수해도 같은 상대에게 다시 보낼 수는 없다(기록은 RECALLED로 남는다).
     * 되찾을 수 있게 한 건 값을 돌려주려는 것이지, 다시 시도할 기회를 주려는 게 아니다.
     */
    @Transactional
    fun recall(accountId: UUID, mailId: UUID) {
        val mail = mailRepository.findById(mailId) ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (mail.senderAccountId != accountId) throw DailyMeetException("내가 보낸 편지만 회수할 수 있어요")
        mail.recall()
        mailRepository.save(mail)
        inkService.grantTo(accountId, InkPrice.recallRefund(mail.inkPaid), InkService.REASON_MAIL_RECALL)
    }

    /**
     * 이 사람에게 온 봉투들을 보낸 사람에게 되돌린다 — 탈퇴 직전에 호출한다.
     *
     * 탈퇴하면 편지가 통째로 지워져서 회수할 대상 자체가 사라진다. 그대로 두면
     * 보낸 사람은 아무 통보 없이 잉크만 잃는다. 받는 쪽이 없어진 편지는 전해질 수 없으니
     * 사흘을 기다릴 것도 없이 바로 돌려준다.
     *
     * 열어본 편지는 돌려주지 않는다 — 이미 전해졌고, 그게 잉크를 쓴 이유다.
     */
    @Transactional
    fun refundPendingMailsTo(recipientAccountId: UUID) {
        mailRepository.findPendingTo(recipientAccountId).forEach { mail ->
            inkService.grantTo(mail.senderAccountId, InkPrice.recallRefund(mail.inkPaid), InkService.REASON_MAIL_RECALL)
        }
    }

    /** 조용히 거절한다 — 목록에서 사라지고, 보낸 사람에게는 알리지 않는다. */
    @Transactional
    fun decline(accountId: UUID, mailId: UUID) {
        val mail = mailRepository.findById(mailId) ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (mail.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지만 거절할 수 있어요")
        mail.decline()
        mailRepository.save(mail)
    }

    private fun receivedView(accountId: UUID, mail: Mail): ReceivedMailView? {
        val sender = memberQueryService.findProfile(mail.senderAccountId) ?: return null
        val opened = mail.status == MailStatus.OPENED
        val replied = mailRepository.existsBySenderAndRecipient(accountId, mail.senderAccountId)
        return ReceivedMailView(
            mailId = requireNotNull(mail.id),
            nickname = sender.nickname,
            age = sender.age(),
            region = sender.region,
            avatarId = sender.avatarId,
            photoUrl = sender.photoUrls.firstOrNull(),
            status = mail.status,
            // 봉투 상태에서는 내용을 감춘다 — 여는 선택이 의미를 가지려면.
            content = if (opened) mail.content else null,
            // 연락처는 답장해야 열린다 — 내 연락처를 건네야 상대의 연락처도 받는 교환.
            // 먼저 보낸 쪽은 이미 건넸으므로(replied=true) 답장을 열면 바로 보인다.
            phone = if (opened && replied) mail.phone else null,
            kakaoId = if (opened && replied) mail.kakaoId else null,
            peerAnswerId = answerRepository.findAllByAccountId(mail.senderAccountId).firstOrNull()?.id,
            replied = replied,
            createdAt = mail.createdAt,
        )
    }

    /** 내가 이 상대(답변 주인)에게 보낸 편지 — 없으면 null. */
    @Transactional(readOnly = true)
    fun sentTo(accountId: UUID, peerAnswerId: UUID): SentMailView? {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val mail = mailRepository.findBySenderAndRecipient(accountId, peerAnswer.accountId) ?: return null
        return SentMailView(
            mailId = requireNotNull(mail.id),
            recipientNickname = memberQueryService.findProfile(mail.recipientAccountId)?.nickname,
            content = mail.content,
            phone = mail.phone,
            kakaoId = mail.kakaoId,
            status = mail.status,
            recallable = mail.isRecallableAt(),
            recallRefund = InkPrice.recallRefund(mail.inkPaid),
            createdAt = mail.createdAt,
        )
    }
}
