package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Meetup
import com.prologue.backend.dailymeet.domain.model.MeetupApplication
import com.prologue.backend.dailymeet.domain.model.MeetupApplicationStatus
import com.prologue.backend.dailymeet.domain.repository.MeetupApplicationRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.notification.application.service.NotificationService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 앱 목록의 모임 한 줄 — 카카오 링크는 신청한 사람에게만 담긴다. */
data class MeetupView(
    val meetupId: UUID,
    val title: String,
    val description: String?,
    val meetAt: Instant,
    val place: String,
    val capacity: Int,
    val fee: Int,
    val status: String,
    val hostNickname: String?,
    /** 이 모임장이 지금까지 개최를 완료한 횟수 — 신뢰 신호. */
    val hostDoneCount: Int,
    val confirmedCount: Int,
    /** 내 신청 상태(APPLIED/CONFIRMED/DECLINED). 신청 전·취소 후엔 null. */
    val myStatus: String?,
    /** 모임장의 오픈채팅 — 신청(APPLIED/CONFIRMED)한 사람에게만. 입금·대화는 카카오에서. */
    val kakaoLink: String?,
    /** 확정된 참가자 닉네임 — 누가 오는지 보여야 모임에 속한 느낌이 든다. */
    val participants: List<String>,
    /** 내가 여는 모임인지 — 앱이 '관리' 동선을 보여줄 때. */
    val isMine: Boolean,
)

/** 지난 모임 한 줄 — 잘 운영되고 있다는 공개 기록. */
data class MeetupHistoryView(
    val title: String,
    val meetAt: Instant,
    val place: String,
    val confirmedCount: Int,
    val hostNickname: String?,
)

/** 모임장 콘솔의 신청자 한 줄. */
data class HostApplicationView(
    val applicationId: UUID,
    val nickname: String?,
    val gender: String?,
    val age: Int?,
    val region: String?,
    val status: String,
    val appliedAt: Instant,
)

/** 모임장 콘솔의 모임 한 장 — 신청자 목록까지. */
data class HostMeetupView(
    val meetupId: UUID,
    val title: String,
    val description: String?,
    val meetAt: Instant,
    val place: String,
    val capacity: Int,
    val fee: Int,
    val kakaoLink: String,
    val status: String,
    val confirmedCount: Int,
    val applications: List<HostApplicationView>,
)

/**
 * 오프라인 모임 유스케이스.
 *
 * 누구나 앱에서 모임을 열 수 있고(모임장 = 만든 사람), 회원은 앱에서 신청한다.
 * 모임장은 앱(또는 웹 콘솔 /host)에서 입금을 확인해 확정한다.
 * 돈은 카카오에서 오간다 — 여기에는 신청·확정·개최의 기록만 남고,
 * 그 기록이 모임장의 신뢰 신호(개최 횟수·확정 인원)로 공개된다.
 */
@Service
class MeetupService(
    private val meetupRepository: MeetupRepository,
    private val applicationRepository: MeetupApplicationRepository,
    private val memberQueryService: MemberQueryService,
    private val notificationService: NotificationService,
) {
    // ── 회원(앱) ──

    /** 다가오는 모임 — 가까운 날짜순. */
    @Transactional(readOnly = true)
    fun upcoming(accountId: UUID): List<MeetupView> {
        val meetups = meetupRepository.findUpcoming(Instant.now())
        val mine = applicationRepository.findAllByApplicant(accountId).associateBy { it.meetupId }
        return meetups.map { m ->
            val my = mine[m.id]?.takeIf { it.status != MeetupApplicationStatus.CANCELED }
            val confirmedApps = applicationRepository.findAllByMeetup(requireNotNull(m.id))
                .filter { it.status == MeetupApplicationStatus.CONFIRMED }
            MeetupView(
                meetupId = requireNotNull(m.id),
                title = m.title,
                description = m.description,
                meetAt = m.meetAt,
                place = m.place,
                capacity = m.capacity,
                fee = m.fee,
                status = m.status.name,
                hostNickname = memberQueryService.findProfile(m.hostAccountId)?.nickname,
                hostDoneCount = meetupRepository.countDoneByHost(m.hostAccountId),
                confirmedCount = confirmedApps.size,
                myStatus = my?.status?.name,
                // 링크는 손든 사람에게만 — 입금 안내가 오픈채팅에서 이뤄지므로 신청이 곧 입장권이다.
                kakaoLink = if (my != null && my.status != MeetupApplicationStatus.DECLINED) m.kakaoLink else null,
                participants = confirmedApps.mapNotNull { memberQueryService.findProfile(it.applicantAccountId)?.nickname },
                isMine = m.hostAccountId == accountId,
            )
        }
    }

    /** 지난 모임 — 개최 완료 기록, 최신순. */
    @Transactional(readOnly = true)
    fun history(): List<MeetupHistoryView> {
        val done = meetupRepository.findDone(HISTORY_LIMIT)
        val confirmed = applicationRepository.countConfirmedByMeetup(done.mapNotNull { it.id })
        return done.map { m ->
            MeetupHistoryView(
                title = m.title,
                meetAt = m.meetAt,
                place = m.place,
                confirmedCount = confirmed[m.id] ?: 0,
                hostNickname = memberQueryService.findProfile(m.hostAccountId)?.nickname,
            )
        }
    }

    /** 손들기 — 취소했던 모임이면 신청이 되살아난다(모임당 한 줄). */
    @Transactional
    fun apply(accountId: UUID, meetupId: UUID) {
        val meetup = meetupRepository.findById(meetupId) ?: throw DailyMeetException("모임을 찾을 수 없어요")
        if (!meetup.isOpen()) throw DailyMeetException("모집이 끝난 모임이에요")
        if (meetup.hostAccountId == accountId) throw DailyMeetException("내가 여는 모임이에요")
        val existing = applicationRepository.findByMeetupAndApplicant(meetupId, accountId)
        if (existing == null) {
            applicationRepository.save(MeetupApplication.apply(meetupId, accountId))
        } else {
            existing.reapply()
            applicationRepository.save(existing)
        }
        // 모임장에게 알린다 — 오픈채팅에서 새 신청자를 맞이하는 게 다음 할 일이라서.
        notificationService.meetupApplied(
            meetup.hostAccountId,
            meetup.title,
            memberQueryService.findProfile(accountId)?.nickname,
        )
    }

    /** 신청 취소 — 확정 뒤에도 물릴 수 있다. 모임장이 목록에서 본다. */
    @Transactional
    fun cancel(accountId: UUID, meetupId: UUID) {
        val application = applicationRepository.findByMeetupAndApplicant(meetupId, accountId)
            ?: throw DailyMeetException("신청한 적 없는 모임이에요")
        application.cancelByApplicant()
        applicationRepository.save(application)
    }

    // ── 모임장(웹 콘솔) ──

    @Transactional
    fun create(
        hostAccountId: UUID,
        title: String,
        description: String?,
        meetAt: Instant,
        place: String,
        capacity: Int,
        fee: Int,
        kakaoLink: String,
    ): UUID {
        val saved = meetupRepository.save(
            Meetup.create(hostAccountId, title, description, meetAt, place, capacity, fee, kakaoLink),
        )
        return requireNotNull(saved.id)
    }

    /** 내 모임 전부 — 신청자 목록까지 한 번에(콘솔은 화면 하나로 끝낸다). */
    @Transactional(readOnly = true)
    fun hostMeetups(hostAccountId: UUID): List<HostMeetupView> =
        meetupRepository.findAllByHost(hostAccountId).map { m ->
            val applications = applicationRepository.findAllByMeetup(requireNotNull(m.id))
            HostMeetupView(
                meetupId = requireNotNull(m.id),
                title = m.title,
                description = m.description,
                meetAt = m.meetAt,
                place = m.place,
                capacity = m.capacity,
                fee = m.fee,
                kakaoLink = m.kakaoLink,
                status = m.status.name,
                confirmedCount = applications.count { it.status == MeetupApplicationStatus.CONFIRMED },
                applications = applications.map { app ->
                    val profile = memberQueryService.findProfile(app.applicantAccountId)
                    HostApplicationView(
                        applicationId = requireNotNull(app.id),
                        nickname = profile?.nickname,
                        gender = profile?.gender?.name,
                        age = profile?.age(),
                        region = profile?.region,
                        status = app.status.name,
                        appliedAt = app.createdAt,
                    )
                },
            )
        }

    /** 입금 확인 후 확정 — 신청자에게 푸시가 간다. */
    @Transactional
    fun confirmApplication(hostAccountId: UUID, applicationId: UUID) {
        val (meetup, application) = ownedApplication(hostAccountId, applicationId)
        application.confirm()
        applicationRepository.save(application)
        notificationService.meetupConfirmed(application.applicantAccountId, meetup.title)
    }

    @Transactional
    fun declineApplication(hostAccountId: UUID, applicationId: UUID) {
        val (_, application) = ownedApplication(hostAccountId, applicationId)
        application.decline()
        applicationRepository.save(application)
    }

    @Transactional
    fun close(hostAccountId: UUID, meetupId: UUID) = withOwned(hostAccountId, meetupId) { it.close() }

    @Transactional
    fun reopen(hostAccountId: UUID, meetupId: UUID) = withOwned(hostAccountId, meetupId) { it.reopen() }

    @Transactional
    fun complete(hostAccountId: UUID, meetupId: UUID) = withOwned(hostAccountId, meetupId) { it.complete() }

    /** 모임 취소 — 기다리던 신청자(신청·확정)에게 푸시로 알린다. */
    @Transactional
    fun cancelMeetup(hostAccountId: UUID, meetupId: UUID) {
        val meetup = owned(hostAccountId, meetupId)
        meetup.cancel()
        meetupRepository.save(meetup)
        applicationRepository.findAllByMeetup(meetupId)
            .filter { it.status == MeetupApplicationStatus.APPLIED || it.status == MeetupApplicationStatus.CONFIRMED }
            .forEach { notificationService.meetupCanceled(it.applicantAccountId, meetup.title) }
    }

    private fun withOwned(hostAccountId: UUID, meetupId: UUID, action: (Meetup) -> Unit) {
        val meetup = owned(hostAccountId, meetupId)
        action(meetup)
        meetupRepository.save(meetup)
    }

    private fun owned(hostAccountId: UUID, meetupId: UUID): Meetup {
        val meetup = meetupRepository.findById(meetupId) ?: throw DailyMeetException("모임을 찾을 수 없어요")
        if (meetup.hostAccountId != hostAccountId) throw DailyMeetException("내 모임이 아니에요")
        return meetup
    }

    private fun ownedApplication(hostAccountId: UUID, applicationId: UUID): Pair<Meetup, MeetupApplication> {
        val application = applicationRepository.findById(applicationId) ?: throw DailyMeetException("신청을 찾을 수 없어요")
        val meetup = owned(hostAccountId, application.meetupId)
        return meetup to application
    }

    companion object {
        private const val HISTORY_LIMIT = 30
    }
}
