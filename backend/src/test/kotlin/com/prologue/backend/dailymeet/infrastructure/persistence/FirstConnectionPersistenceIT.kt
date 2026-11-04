package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.member.infrastructure.persistence.MemberPersistenceAdapter
import com.prologue.backend.support.PostgresRepositoryTest
import jakarta.persistence.EntityManager
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@Import(DailyRevealPersistenceAdapter::class, MemberPersistenceAdapter::class)
class FirstConnectionPersistenceIT : PostgresRepositoryTest() {
    @Autowired private lateinit var reveals: DailyRevealPersistenceAdapter
    @Autowired private lateinit var answers: AnswerJpaRepository
    @Autowired private lateinit var members: MemberPersistenceAdapter
    @Autowired private lateinit var jdbc: JdbcTemplate
    @Autowired private lateinit var em: EntityManager

    @Test
    fun `노출 횟수를 질문별로 묶어 가져오고 노출 없는 답변과 빈 입력을 처리한다`() {
        val questions = jdbc.queryForList("select id from questions order by id limit 2", Long::class.java).filterNotNull()
        val answer = answers.saveAndFlush(AnswerJpaEntity(accountId = UUID.randomUUID(), questionId = questions[0], content = "합성 답변", createdAt = Instant.now()))
        val unseen = answers.saveAndFlush(AnswerJpaEntity(accountId = UUID.randomUUID(), questionId = questions[0], content = "미노출 합성 답변", createdAt = Instant.now()))
        repeat(2) { reveals.save(DailyReveal.create(UUID.randomUUID(), questions[0], answer.id!!)) }
        reveals.save(DailyReveal.create(UUID.randomUUID(), questions[1], answer.id!!))
        em.flush()
        assertEquals(mapOf(answer.id!! to 2L), reveals.countByQuestionAndPeerAnswers(questions[0], listOf(answer.id!!, unseen.id!!)))
        assertEquals(emptyMap(), reveals.countByQuestionAndPeerAnswers(questions[0], emptyList()))
    }

    @Test
    fun `기존 형식의 회원은 완료 상태이고 새 가입 진행 상태도 DB 왕복에서 유지된다`() {
        val id = UUID.randomUUID()
        jdbc.update("insert into members (account_id,nickname,gender,birth_date,preferred_gender,region,created_at) values (?, '합성회원', 'MALE', DATE '1995-01-01', 'FEMALE', '서울', CURRENT_TIMESTAMP)", id)
        val member = members.findByAccountId(id)!!
        assertTrue(member.onboardingComplete)
        member.beginOnboarding()
        members.save(member)
        em.flush(); em.clear()
        val pending = members.findByAccountId(id)!!
        assertFalse(pending.onboardingComplete)
        pending.finishOnboarding()
        members.save(pending)
        em.flush(); em.clear()
        assertTrue(members.findByAccountId(id)!!.onboardingComplete)
    }
}
