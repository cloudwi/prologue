package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Meetup
import com.prologue.backend.dailymeet.domain.model.MeetupApplication
import com.prologue.backend.dailymeet.domain.model.MeetupApplicationStatus
import com.prologue.backend.dailymeet.domain.model.MeetupStatus
import com.prologue.backend.dailymeet.domain.repository.MeetupApplicationRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupFollowRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupRepository
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.application.service.JobVerificationService
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
    val placeUrl: String?,
    val placeAddress: String?,
    val capacity: Int,
    val fee: Int,
    /** 여성 참가비 — null이면 fee와 동일. */
    val feeFemale: Int?,
    /** 참가 조건 — null이면 제한 없음. 남/녀 기준이 달라 성별별로 내려간다. */
    val genderLimit: String?,
    val minAgeMale: Int?,
    val maxAgeMale: Int?,
    val minAgeFemale: Int?,
    val maxAgeFemale: Int?,
    val minHeightMaleCm: Int?,
    val minHeightFemaleCm: Int?,
    val requireJobVerified: Boolean,
    /** 커버 — 사진 여러 장(첫 장이 메인). 없으면 이모지+색, 그마저 없으면 기본 모양. */
    val emoji: String?,
    val color: String?,
    val coverUrls: List<String>,
    val status: String,
    val hostNickname: String?,
    /** 이 모임장이 지금까지 개최를 완료한 횟수 — 신뢰 신호. */
    val hostDoneCount: Int,
    val confirmedCount: Int,
    /** 내 신청 상태(APPLIED/CONFIRMED/DECLINED). 신청 전·취소 후엔 null. */
    val myStatus: String?,
    /** 모임장의 오픈채팅 — 신청(APPLIED/CONFIRMED)한 사람에게만. 입금·대화는 카카오에서. */
    val kakaoLink: String?,
    /** 확정된 참가자 — 누가 오는지 보여야 모임에 속한 느낌이 든다. 탭하면 모임 프로필로. */
    val participants: List<MeetupParticipantView>,
    /** 모임장 프로필로 가는 열쇠. */
    val hostAccountId: UUID,
    /** 내가 여는 모임인지 — 앱이 '관리' 동선을 보여줄 때. */
    val isMine: Boolean,
    /** 회차 묶음 id — '이 모임 다시 열기'가 회차를 이을 때 그대로 돌려보낸다. */
    val seriesId: UUID? = null,
    /** 이 모임이 몇 번째 만남인지(1부터). 단발이면 1. */
    val occurrence: Int = 1,
    /** 이 회차 묶음의 전체 만남 수 — 2 이상이면 앱이 "3번째 만남"을 그린다. */
    val occurrenceTotal: Int = 1,
    /** 내가 이 모임을 따라가는지 — 다음 회차가 열리면 알림을 받는다. */
    val following: Boolean = false,
)

/** 확정 참가자 한 명 — 모임 프로필로 이어진다. */
data class MeetupParticipantView(val accountId: UUID, val nickname: String?)

/** 모임 멤버의 모임 이력 한 줄. */
data class MeetupMemberHistoryRow(val title: String, val meetAt: Instant, val confirmedCount: Int)

/**
 * 모임 멤버 프로필 — 모임 세계의 평판.
 * 프로필(닉네임·성별·나이·지역·아바타·소개)과 모임 이력까지만 공개한다.
 * 문답 답변·편지는 여기 없다 — 화면에서 숨기는 게 아니라 응답에 아예 싣지 않는다.
 */
data class MeetupMemberProfileView(
    val nickname: String?,
    val gender: String?,
    val age: Int?,
    val region: String?,
    val avatarId: Int?,
    val bio: String?,
    /** 직장 인증 여부. */
    val jobVerified: Boolean,
    /**
     * 인증한 회사 이메일 도메인 — 배지에 그대로 노출한다(유저 결정 2026-08-24).
     * 인증은 본인이 스스로 하는 것이고, 도메인 없는 "직장 인증"은 신뢰 신호로서 반쪽이라서다.
     * 약관·개인정보 처리방침에 노출 사실을 고지한다. 이메일 주소 자체는 여전히 저장하지 않는다.
     */
    val jobDomain: String?,
    /** 개최 완료 횟수와 최근 개최 목록. */
    val hostedCount: Int,
    val hostedRecent: List<MeetupMemberHistoryRow>,
    /** 확정 참여로 끝난 모임 횟수와 최근 참여 목록. */
    val participatedCount: Int,
    val participatedRecent: List<MeetupMemberHistoryRow>,
)

/** 어드민 모임 한 줄 — 운영자가 전체를 훑고 문제 모임을 처리한다. */
data class AdminMeetupView(
    val meetupId: UUID,
    val title: String,
    val place: String,
    val meetAt: Instant,
    val status: String,
    val fee: Int,
    val feeFemale: Int?,
    val capacity: Int,
    val confirmedCount: Int,
    val appliedCount: Int,
    val hostNickname: String?,
    val coverUrls: List<String>,
    val createdAt: Instant,
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
    val placeUrl: String?,
    val placeAddress: String?,
    val capacity: Int,
    val fee: Int,
    val feeFemale: Int?,
    val genderLimit: String?,
    val minAgeMale: Int?,
    val maxAgeMale: Int?,
    val minAgeFemale: Int?,
    val maxAgeFemale: Int?,
    val minHeightMaleCm: Int?,
    val minHeightFemaleCm: Int?,
    val requireJobVerified: Boolean,
    val emoji: String?,
    val color: String?,
    val coverUrls: List<String>,
    val kakaoLink: String,
    val status: String,
    val confirmedCount: Int,
    val applications: List<HostApplicationView>,
)

/**
 * 오프라인 모임 유스케이스.
 *
 * 회원은 앱에서 모임을 보고 신청한다. 다만 **여는 건 아직 운영자만** 할 수 있다([MeetupHostPolicy]) —
 * 초창기 기능이라 처음 몇 번은 직접 치러 보며 규칙을 배우는 편이 낫다.
 * 모임장 = 만든 사람이라는 구조는 그대로다: 제한이 풀리면 그날부터 누구나 모임장이 된다.
 * 모임장은 앱(또는 웹 콘솔 /host)에서 입금을 확인해 확정한다.
 * 돈은 카카오에서 오간다 — 여기에는 신청·확정·개최의 기록만 남고,
 * 그 기록이 모임장의 신뢰 신호(개최 횟수·확정 인원)로 공개된다.
 */
@Service
class MeetupService(
    private val meetupRepository: MeetupRepository,
    private val applicationRepository: MeetupApplicationRepository,
    private val memberQueryService: MemberQueryService,
    private val jobVerificationService: JobVerificationService,
    private val notificationService: NotificationService,
    private val photoStorage: PhotoStorage,
    private val hostPolicy: MeetupHostPolicy,
    private val followRepository: MeetupFollowRepository,
) {
    /** 이 사람이 모임을 열 수 있는지 — 앱이 '모임 열기' 버튼을 그릴지 정할 때 묻는다. */
    fun canHost(accountId: UUID): Boolean = hostPolicy.canHost(accountId)

    // ── 회원(앱) ──

    /** 다가오는 모임 — 가까운 날짜순. */
    @Transactional(readOnly = true)
    fun upcoming(accountId: UUID): List<MeetupView> {
        val meetups = meetupRepository.findUpcoming(Instant.now())
        val mine = applicationRepository.findAllByApplicant(accountId).associateBy { it.meetupId }
        // 목록이 모임 수만큼 되묻지 않도록 한 번에 읽는다.
        val followed = followRepository.findSeriesIdsByAccount(accountId)
        val seriesCounts = mutableMapOf<UUID, List<Meetup>>()
        return meetups.map { m ->
            val siblings = seriesCounts.getOrPut(m.seriesId) { meetupRepository.findAllBySeries(m.seriesId) }
            val my = mine[m.id]?.takeIf { it.status != MeetupApplicationStatus.CANCELED }
            val confirmedApps = applicationRepository.findAllByMeetup(requireNotNull(m.id))
                .filter { it.status == MeetupApplicationStatus.CONFIRMED }
            MeetupView(
                meetupId = requireNotNull(m.id),
                title = m.title,
                description = m.description,
                meetAt = m.meetAt,
                place = m.place,
                placeUrl = m.placeUrl,
                placeAddress = m.placeAddress,
                capacity = m.capacity,
                fee = m.fee,
                feeFemale = m.feeFemale,
                genderLimit = m.genderLimit,
                minAgeMale = m.minAgeMale,
                maxAgeMale = m.maxAgeMale,
                minAgeFemale = m.minAgeFemale,
                maxAgeFemale = m.maxAgeFemale,
                minHeightMaleCm = m.minHeightMaleCm,
                minHeightFemaleCm = m.minHeightFemaleCm,
                requireJobVerified = m.requireJobVerified,
                emoji = m.emoji,
                color = m.color,
                coverUrls = m.coverUrls,
                status = m.status.name,
                hostNickname = memberQueryService.findProfile(m.hostAccountId)?.nickname,
                hostDoneCount = meetupRepository.countDoneByHost(m.hostAccountId),
                confirmedCount = confirmedApps.size,
                myStatus = my?.status?.name,
                // 링크는 손든 사람에게만 — 입금 안내가 오픈채팅에서 이뤄지므로 신청이 곧 입장권이다.
                kakaoLink = if (my != null && my.status != MeetupApplicationStatus.DECLINED) m.kakaoLink else null,
                participants = confirmedApps.map {
                    MeetupParticipantView(it.applicantAccountId, memberQueryService.findProfile(it.applicantAccountId)?.nickname)
                },
                hostAccountId = m.hostAccountId,
                isMine = m.hostAccountId == accountId,
                seriesId = m.seriesId,
                occurrence = siblings.indexOfFirst { it.id == m.id }.let { if (it < 0) siblings.size else it } + 1,
                occurrenceTotal = maxOf(siblings.size, 1),
                following = m.seriesId in followed,
            )
        }
    }

    /**
     * 이 모임을 따라간다 — 다음 회차가 열리면 알림을 받는다.
     *
     * 따라가는 대상은 회차가 아니라 모임(series)이다. 오늘 모임이 끝나도 구독은 남아야
     * 다음 달 모임을 알릴 수 있다. 멱등 — 버튼이 두 번 눌려도 같은 상태다.
     */
    @Transactional
    fun follow(accountId: UUID, meetupId: UUID, on: Boolean) {
        val meetup = meetupRepository.findById(meetupId) ?: throw DailyMeetException("모임을 찾을 수 없어요")
        if (on) followRepository.follow(accountId, meetup.seriesId) else followRepository.unfollow(accountId, meetup.seriesId)
    }

    /** 모임 멤버 프로필 — 프로필과 모임 이력까지만. 문답·편지는 응답에 싣지 않는다. */
    @Transactional(readOnly = true)
    fun memberProfile(accountId: UUID): MeetupMemberProfileView {
        val profile = memberQueryService.findProfile(accountId)
        val hosted = meetupRepository.findAllByHost(accountId)
            .filter { it.status == MeetupStatus.DONE }
            .sortedByDescending { it.meetAt }
        val hostedCounts = applicationRepository.countConfirmedByMeetup(hosted.mapNotNull { it.id })
        val participated = applicationRepository.findAllByApplicant(accountId)
            .filter { it.status == MeetupApplicationStatus.CONFIRMED }
            .mapNotNull { meetupRepository.findById(it.meetupId) }
            .filter { it.status == MeetupStatus.DONE }
            .sortedByDescending { it.meetAt }
        val participatedCounts = applicationRepository.countConfirmedByMeetup(participated.mapNotNull { it.id })
        val jobDomain = jobVerificationService.verifiedDomain(accountId)
        return MeetupMemberProfileView(
            nickname = profile?.nickname,
            gender = profile?.gender?.name,
            age = profile?.age(),
            region = profile?.region,
            avatarId = profile?.avatarId,
            bio = profile?.bio,
            jobVerified = jobDomain != null,
            jobDomain = jobDomain,
            hostedCount = hosted.size,
            hostedRecent = hosted.take(HISTORY_LIMIT).map {
                MeetupMemberHistoryRow(it.title, it.meetAt, hostedCounts[it.id] ?: 0)
            },
            participatedCount = participated.size,
            participatedRecent = participated.take(HISTORY_LIMIT).map {
                MeetupMemberHistoryRow(it.title, it.meetAt, participatedCounts[it.id] ?: 0)
            },
        )
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
        checkConditions(meetup, accountId)
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
        placeUrl: String?,
        placeAddress: String?,
        capacity: Int,
        fee: Int,
        feeFemale: Int?,
        genderLimit: String?,
        minAgeMale: Int?,
        maxAgeMale: Int?,
        minAgeFemale: Int?,
        maxAgeFemale: Int?,
        minHeightMaleCm: Int?,
        minHeightFemaleCm: Int?,
        requireJobVerified: Boolean,
        emoji: String?,
        color: String?,
        coverUrls: List<String>,
        kakaoLink: String,
        /** 이어 여는 회차면 그 모임의 seriesId. 내가 연 모임의 회차만 이을 수 있다. */
        seriesId: UUID? = null,
    ): UUID {
        // 서버가 막아야 실효가 있다 — 앱은 버튼을 숨길 뿐이고, 옛 앱과 직접 호출은 여기서 걸린다.
        if (!hostPolicy.canHost(hostAccountId)) {
            throw DailyMeetException("모임은 아직 운영자만 열 수 있어요. 열고 싶은 모임이 있다면 알려주세요.")
        }
        // 남의 모임 회차에 끼어들 수 없다 — 회차는 그 모임을 열어온 사람의 것이다.
        if (seriesId != null && meetupRepository.findAllBySeries(seriesId).none { it.hostAccountId == hostAccountId }) {
            throw DailyMeetException("이어 열 수 있는 모임이 아니에요")
        }
        val saved = meetupRepository.save(
            Meetup.create(
                hostAccountId, title, description, meetAt, place, placeUrl, placeAddress, capacity,
                fee, feeFemale, genderLimit,
                minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
                requireJobVerified, emoji, color, coverUrls, kakaoLink, seriesId,
            ),
        )
        // 이어 여는 회차면 따라가던 사람들에게 알린다 — 이게 '다시 참여하고 싶다'는 마음이 돌아오는 길이다.
        if (seriesId != null) {
            followRepository.findAccountIdsBySeries(seriesId)
                .filter { it != hostAccountId }
                .forEach { notificationService.meetupSeriesOpened(it, saved.title) }
        }
        return requireNotNull(saved.id)
    }

    /** 모임 수정 — 모임장 본인만. 내용 검증은 도메인이 create와 동일하게 한다. */
    @Transactional
    fun updateMeetup(
        hostAccountId: UUID,
        meetupId: UUID,
        title: String,
        description: String?,
        meetAt: Instant,
        place: String,
        placeUrl: String?,
        placeAddress: String?,
        capacity: Int,
        fee: Int,
        feeFemale: Int?,
        genderLimit: String?,
        minAgeMale: Int?,
        maxAgeMale: Int?,
        minAgeFemale: Int?,
        maxAgeFemale: Int?,
        minHeightMaleCm: Int?,
        minHeightFemaleCm: Int?,
        requireJobVerified: Boolean,
        emoji: String?,
        color: String?,
        coverUrls: List<String>,
        kakaoLink: String,
    ) {
        val existing = owned(hostAccountId, meetupId)
        meetupRepository.save(
            Meetup.update(
                existing, title, description, meetAt, place, placeUrl, placeAddress,
                capacity, fee, feeFemale, genderLimit,
                minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
                requireJobVerified, emoji, color, coverUrls, kakaoLink,
            ),
        )
    }

    /** 참가 조건 검사 — 프로필의 성별·나이·키로 문 앞에서 거른다. 내 성별의 기준만 본다. */
    private fun checkConditions(meetup: Meetup, accountId: UUID) {
        val hasCondition = meetup.genderLimit != null ||
            meetup.minAgeMale != null || meetup.maxAgeMale != null ||
            meetup.minAgeFemale != null || meetup.maxAgeFemale != null ||
            meetup.minHeightMaleCm != null || meetup.minHeightFemaleCm != null ||
            meetup.requireJobVerified
        if (!hasCondition) return
        if (meetup.requireJobVerified && jobVerificationService.verifiedDomain(accountId) == null) {
            throw DailyMeetException("직장 인증을 마친 사람만 신청할 수 있는 모임이에요. MY 탭에서 회사 이메일로 인증해주세요.")
        }
        val profile = memberQueryService.findProfile(accountId)
            ?: throw DailyMeetException("프로필을 먼저 완성해주세요")
        meetup.genderLimit?.let {
            if (profile.gender.name != it) {
                throw DailyMeetException(if (it == "MALE") "남성만 신청할 수 있는 모임이에요" else "여성만 신청할 수 있는 모임이에요")
            }
        }
        val isMale = profile.gender.name == "MALE"
        val minAge = if (isMale) meetup.minAgeMale else meetup.minAgeFemale
        val maxAge = if (isMale) meetup.maxAgeMale else meetup.maxAgeFemale
        val minHeight = if (isMale) meetup.minHeightMaleCm else meetup.minHeightFemaleCm
        val age = profile.age()
        minAge?.let { if (age < it) throw DailyMeetException("${it}세 이상만 신청할 수 있는 모임이에요") }
        maxAge?.let { if (age > it) throw DailyMeetException("${it}세 이하만 신청할 수 있는 모임이에요") }
        minHeight?.let { min ->
            val height = profile.heightCm
                ?: throw DailyMeetException("키 조건이 있는 모임이에요 — 프로필에 키를 먼저 등록해주세요")
            if (height < min) throw DailyMeetException("키 ${min}cm 이상만 신청할 수 있는 모임이에요")
        }
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
                placeUrl = m.placeUrl,
                placeAddress = m.placeAddress,
                capacity = m.capacity,
                fee = m.fee,
                feeFemale = m.feeFemale,
                genderLimit = m.genderLimit,
                minAgeMale = m.minAgeMale,
                maxAgeMale = m.maxAgeMale,
                minAgeFemale = m.minAgeFemale,
                maxAgeFemale = m.maxAgeFemale,
                minHeightMaleCm = m.minHeightMaleCm,
                minHeightFemaleCm = m.minHeightFemaleCm,
                requireJobVerified = m.requireJobVerified,
                emoji = m.emoji,
                color = m.color,
                coverUrls = m.coverUrls,
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
    fun complete(hostAccountId: UUID, meetupId: UUID) {
        val meetup = owned(hostAccountId, meetupId)
        // 확정 인원은 도메인이 알 수 없다 — 신청은 별개 애그리거트라 세어서 넘긴다.
        val confirmed = applicationRepository.findAllByMeetup(meetupId)
            .count { it.status == MeetupApplicationStatus.CONFIRMED }
        meetup.complete(confirmed)
        meetupRepository.save(meetup)
    }

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

    // ── 어드민 ──

    /** 전체 모임, 최신순. */
    @Transactional(readOnly = true)
    fun adminMeetups(): List<AdminMeetupView> = meetupRepository.findAll().map { m ->
        val apps = applicationRepository.findAllByMeetup(requireNotNull(m.id))
        AdminMeetupView(
            meetupId = requireNotNull(m.id),
            title = m.title,
            place = m.place,
            meetAt = m.meetAt,
            status = m.status.name,
            fee = m.fee,
            feeFemale = m.feeFemale,
            capacity = m.capacity,
            confirmedCount = apps.count { it.status == MeetupApplicationStatus.CONFIRMED },
            appliedCount = apps.count { it.status == MeetupApplicationStatus.APPLIED },
            hostNickname = memberQueryService.findProfile(m.hostAccountId)?.nickname,
            coverUrls = m.coverUrls,
            createdAt = m.createdAt,
        )
    }

    /** 어드민 강제 취소 — 소유권 없이. 신청자(신청·확정)에게 취소 푸시가 간다. */
    @Transactional
    fun adminCancelMeetup(meetupId: UUID) {
        val meetup = meetupRepository.findById(meetupId) ?: throw DailyMeetException("모임을 찾을 수 없어요")
        meetup.cancel()
        meetupRepository.save(meetup)
        applicationRepository.findAllByMeetup(meetupId)
            .filter { it.status == MeetupApplicationStatus.APPLIED || it.status == MeetupApplicationStatus.CONFIRMED }
            .forEach { notificationService.meetupCanceled(it.applicantAccountId, meetup.title) }
    }

    /** 어드민 완전 삭제 — 부적절 모임 등. 커버 사진은 저장소에서도 지운다(베스트 에포트). */
    @Transactional
    fun adminDeleteMeetup(meetupId: UUID) {
        val meetup = meetupRepository.findById(meetupId) ?: throw DailyMeetException("모임을 찾을 수 없어요")
        meetup.coverUrls.forEach { photoStorage.deleteProfilePhoto(it) }
        meetupRepository.delete(meetupId)
    }

    companion object {
        private const val HISTORY_LIMIT = 30
    }
}
