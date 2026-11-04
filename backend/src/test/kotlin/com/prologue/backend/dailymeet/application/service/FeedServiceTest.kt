package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.application.service.BlockService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class FeedServiceTest {
    @Test
    fun `피드 작성자는 한 번에 읽고 외부 사진은 DB 트랜잭션이 끝난 뒤 가져온다`() {
        val db = EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build()
        try {
            val jdbc = JdbcTemplate(db)
            jdbc.execute("create table accounts(id uuid primary key, status varchar(20))")
            jdbc.execute("create table members(account_id uuid primary key, nickname varchar(30), gender varchar(10), onboarding_complete boolean)")
            jdbc.execute("create table feed_posts(id uuid primary key, author_account_id uuid, source_type varchar(10), prompt varchar(200), content varchar(400), created_at timestamp with time zone)")
            jdbc.execute("create table feed_post_hearts(post_id uuid, account_id uuid)")
            val me = UUID.randomUUID()
            val author = UUID.randomUUID()
            val pending = UUID.randomUUID()
            listOf(author, pending).forEach { id ->
                jdbc.update("insert into accounts values (?, 'ACTIVE')", id)
                jdbc.update("insert into members values (?, '합성회원', 'FEMALE', ?)", id, id != pending)
                repeat(2) { jdbc.update("insert into feed_posts values (?, ?, 'DAILY', '합성질문', '합성답변', CURRENT_TIMESTAMP)", UUID.randomUUID(), id) }
            }
            fun member(id: UUID) = Member.reconstitute(id, "합성회원", Gender.FEMALE, LocalDate.of(1995, 1, 1), Gender.MALE, "서울", Instant.now(), photoUrls = listOf("https://example.test/photo"))
            val members = mockk<MemberQueryService> {
                every { findProfile(me) } returns member(me)
                every { findProfiles(listOf(author)) } returns mapOf(author to member(author))
            }
            val blocks = mockk<BlockService> { every { exclusionFor(any(), any()) } returns BlockService.Exclusion.NONE }
            val access = mockk<ProfileAccessService> { every { unlockedPeers(me) } returns emptySet() }
            val photos = mockk<FeedPhotoPreviewService> {
                every { previewDataUris(any()) } answers {
                    assertFalse(TransactionSynchronizationManager.isActualTransactionActive())
                    mapOf("https://example.test/photo" to "data:image/jpeg;base64,c3ludGhldGlj")
                }
            }
            val service = FeedService(jdbc, mockk(), mockk(), mockk(), mockk(), members, blocks, access, mockk(), photos, DataSourceTransactionManager(db))
            val result = service.latest(me)
            assertEquals(2, result.size)
            assertEquals(setOf("data:image/jpeg;base64,c3ludGhldGlj"), result.map { it.photoPreview }.toSet())
            assertEquals(setOf(null), result.map { it.photoUrl }.toSet())
            verify(exactly = 1) { members.findProfiles(listOf(author)) }
            verify(exactly = 0) { members.findProfile(author) }
        } finally { db.shutdown() }
    }
}
