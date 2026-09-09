package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.dailymeet.domain.repository.TasteCardRepository
import com.prologue.backend.dailymeet.domain.repository.TasteChoiceRepository
import com.prologue.backend.dailymeet.domain.repository.ReportRepository
import com.prologue.backend.dailymeet.domain.model.Report
import com.prologue.backend.member.application.service.BlockService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

enum class FeedSourceType { DAILY, TASTE }

data class FeedPostView(
    val id: UUID,
    val sourceType: FeedSourceType,
    val nickname: String,
    val gender: Gender,
    val prompt: String,
    val content: String,
    val createdAt: Instant,
    val heartCount: Int,
    val hearted: Boolean,
    val mine: Boolean,
    val profileUnlocked: Boolean,
    /** 아직 열지 않은 프로필의 흐린 미리보기. 연 프로필에는 없다. */
    val photoPreview: String?,
    /** 잉크로 연(또는 내) 프로필의 선명한 사진 주소. 잠긴 프로필에는 없다. */
    val photoUrl: String?,
)

@Service
class FeedService(
    private val jdbc: JdbcTemplate,
    private val answers: AnswerRepository,
    private val questions: QuestionRepository,
    private val tasteChoices: TasteChoiceRepository,
    private val tasteCards: TasteCardRepository,
    private val members: MemberQueryService,
    private val blockService: BlockService,
    private val profileAccessService: ProfileAccessService,
    private val reports: ReportRepository,
    private val photoPreviews: FeedPhotoPreviewService,
) {
    @Transactional(readOnly = true)
    fun latest(accountId: UUID, sort: String = "latest"): List<FeedPostView> {
        val me = members.findProfile(accountId) ?: throw DailyMeetException("프로필을 먼저 완성해주세요")
        val exclusion = blockService.exclusionFor(accountId, me.phone)
        val unlocked = profileAccessService.unlockedPeers(accountId)
        val orderBy = if (sort == "hearts") "heart_count desc, p.created_at desc, p.id desc" else "p.created_at desc, p.id desc"
        val posts = jdbc.query(
            """
            select p.id, p.author_account_id, p.source_type, p.prompt, p.content, p.created_at,
                   m.nickname, m.gender,
                   (select count(*) from feed_post_hearts h where h.post_id = p.id) as heart_count,
                   exists(select 1 from feed_post_hearts h where h.post_id = p.id and h.account_id = ?) as hearted
            from feed_posts p
            join members m on m.account_id = p.author_account_id
            join accounts a on a.id = p.author_account_id and a.status = 'ACTIVE'
            order by $orderBy
            limit 50
            """.trimIndent(),
            { rs, _ ->
                val authorId = rs.getObject("author_account_id", UUID::class.java)
                RawFeedPost(
                    id = rs.getObject("id", UUID::class.java), authorId = authorId,
                    sourceType = FeedSourceType.valueOf(rs.getString("source_type")),
                    nickname = rs.getString("nickname"), gender = Gender.valueOf(rs.getString("gender")),
                    prompt = rs.getString("prompt"), content = rs.getString("content"),
                    createdAt = rs.getTimestamp("created_at").toInstant(), heartCount = rs.getInt("heart_count"),
                    hearted = rs.getBoolean("hearted"),
                )
            }, accountId,
        )
        val visible = posts.mapNotNull { raw ->
            val author = members.findProfile(raw.authorId) ?: return@mapNotNull null
            if (raw.authorId != accountId && exclusion.excludes(author)) return@mapNotNull null
            raw to author.photoUrls.firstOrNull()
        }
        val opened = { authorId: UUID -> authorId == accountId || authorId in unlocked }
        val previews = photoPreviews.previewDataUris(
            visible.filterNot { (raw, _) -> opened(raw.authorId) }.mapNotNull { it.second },
        )
        return visible.map { (raw, photoUrl) ->
            val open = opened(raw.authorId)
            raw.toView(
                viewer = accountId,
                unlocked = raw.authorId in unlocked,
                photoPreview = if (open) null else photoUrl?.let(previews::get),
                photoUrl = if (open) photoPreviews.unlockedPhotoUrl(photoUrl) else null,
            )
        }
    }

    @Transactional
    fun publishDaily(accountId: UUID, questionId: Long) {
        val answer = answers.findByAccountIdAndQuestionId(accountId, questionId)
            ?: throw DailyMeetException("내 답변을 찾을 수 없어요")
        val prompt = questions.findAllOrdered().firstOrNull { it.id == answer.questionId }?.content
            ?: throw DailyMeetException("질문을 찾을 수 없어요")
        publish(accountId, FeedSourceType.DAILY, questionId.toString(), prompt, answer.content)
    }

    @Transactional
    fun publishTaste(accountId: UUID, cardId: Long) {
        val choice = tasteChoices.findByAccountIdAndCardId(accountId, cardId)
            ?: throw DailyMeetException("내 취향 답변을 찾을 수 없어요")
        val card = tasteCards.findAllOrdered().firstOrNull { it.id == cardId }
            ?: throw DailyMeetException("취향 카드를 찾을 수 없어요")
        val selected = card.labelOf(choice.option)
        val content = choice.note?.let { "$selected\n$it" } ?: selected
        publish(accountId, FeedSourceType.TASTE, cardId.toString(), card.prompt, content)
    }

    private fun publish(accountId: UUID, type: FeedSourceType, key: String, prompt: String, content: String) {
        jdbc.update(
            """
            insert into feed_posts (id, author_account_id, source_type, source_key, prompt, content)
            values (?, ?, ?, ?, ?, ?)
            on conflict (author_account_id, source_type, source_key)
            do update set prompt = excluded.prompt, content = excluded.content, updated_at = now()
            """.trimIndent(), UUID.randomUUID(), accountId, type.name, key, prompt, content,
        )
    }

    @Transactional
    fun setHeart(accountId: UUID, postId: UUID, liked: Boolean) {
        ensurePost(postId)
        if (liked) jdbc.update(
            "insert into feed_post_hearts (post_id, account_id) values (?, ?) on conflict do nothing", postId, accountId,
        ) else jdbc.update("delete from feed_post_hearts where post_id = ? and account_id = ?", postId, accountId)
    }

    @Transactional
    fun delete(accountId: UUID, postId: UUID) {
        val changed = jdbc.update("delete from feed_posts where id = ? and author_account_id = ?", postId, accountId)
        if (changed == 0) throw DailyMeetException("내 피드 글을 찾을 수 없어요")
    }

    @Transactional
    fun report(accountId: UUID, postId: UUID, reason: String) {
        val target = jdbc.query(
            "select author_account_id, prompt, content from feed_posts where id = ?",
            { rs, _ -> Triple(rs.getObject(1, UUID::class.java), rs.getString(2), rs.getString(3)) }, postId,
        ).firstOrNull() ?: throw DailyMeetException("신고할 피드 글을 찾을 수 없어요")
        reports.save(Report.file(accountId, target.first, "FEED", reason, "[질문] ${target.second}\n[답변] ${target.third}"))
    }

    @Transactional(readOnly = true)
    fun visibleAuthorOf(accountId: UUID, postId: UUID): UUID {
        val authorId = ensurePost(postId)
        if (authorId == accountId) return authorId
        val me = members.findProfile(accountId) ?: throw DailyMeetException("프로필을 먼저 완성해주세요")
        val author = members.findProfile(authorId) ?: throw DailyMeetException("프로필을 찾을 수 없어요")
        if (blockService.exclusionFor(accountId, me.phone).excludes(author)) {
            throw DailyMeetException("볼 수 없는 프로필이에요")
        }
        return authorId
    }

    private fun ensurePost(postId: UUID): UUID = jdbc.query(
        "select author_account_id from feed_posts where id = ?",
        { rs, _ -> rs.getObject(1, UUID::class.java) }, postId,
    ).firstOrNull() ?: throw DailyMeetException("피드 글을 찾을 수 없어요")

    private data class RawFeedPost(
        val id: UUID, val authorId: UUID, val sourceType: FeedSourceType, val nickname: String,
        val gender: Gender, val prompt: String, val content: String, val createdAt: Instant,
        val heartCount: Int, val hearted: Boolean,
    ) {
        fun toView(viewer: UUID, unlocked: Boolean, photoPreview: String?, photoUrl: String?) = FeedPostView(
            id, sourceType, nickname, gender, prompt, content, createdAt, heartCount, hearted,
            mine = authorId == viewer, profileUnlocked = authorId == viewer || unlocked,
            photoPreview = photoPreview, photoUrl = photoUrl,
        )
    }
}
