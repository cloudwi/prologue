package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.QuestionInputType
import com.prologue.backend.support.PostgresRepositoryTest
import org.flywaydb.core.Flyway
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import java.sql.DriverManager
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@Import(QuestionPersistenceAdapter::class, AnswerPersistenceAdapter::class)
class QuestionFormatsMigrationIT : PostgresRepositoryTest() {
    @Autowired private lateinit var questions: QuestionPersistenceAdapter
    @Autowired private lateinit var answers: AnswerPersistenceAdapter

    @Test
    fun `JPA가 네 형식과 짧은 선택 답변을 실제 DB에서 다시 읽는다`() {
        val pool = questions.findAllOrdered()
        for (type in listOf(QuestionInputType.OX, QuestionInputType.SINGLE_CHOICE, QuestionInputType.MULTIPLE_CHOICE)) {
            val question = pool.first { it.inputType == type }
            val ids = if (type == QuestionInputType.MULTIPLE_CHOICE) question.options.take(2).map { it.id } else listOf(question.options.first().id)
            val (selected, content) = question.selection(ids)
            val account = UUID.randomUUID()
            val saved = answers.save(Answer.write(account, question.id, content, selectedOptionIds = selected))
            val reread = answers.findById(saved.id!!)!!
            assertEquals(content, reread.content)
            assertEquals(selected, reread.selectedOptionIds)
        }
        assertTrue(pool.any { it.inputType == QuestionInputType.TEXT })
    }

    @Test
    fun `V75에서 올려도 기록 있는 질문과 답을 보존하고 나머지만 형식을 바꾼다`() {
        val schema = "formats_upgrade_" + UUID.randomUUID().toString().replace("-", "")
        fun flyway(target: String): Flyway = Flyway.configure()
            .dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
            .schemas(schema).defaultSchema(schema).target(target).load()
        flyway("75").migrate()
        DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password).use { connection ->
            connection.createStatement().use { sql ->
                sql.execute("set search_path to $schema")
                val original = mutableMapOf<Int, String>()
                sql.executeQuery("select id, content from questions where id in (901,921,941)").use { rs ->
                    while (rs.next()) original[rs.getInt(1)] = rs.getString(2)
                }
                val account = UUID.randomUUID()
                sql.execute("insert into answers (id,account_id,question_id,content,created_at) values ('${UUID.randomUUID()}','$account',901,'예전에 쓴 문답을 그대로 보존해요',now())")
                sql.execute("insert into profile_letters (id,account_id,question_id,content,created_at,updated_at) values ('${UUID.randomUUID()}','$account',921,'기존 프로필 문답을 보존해요',now(),now())")
                sql.execute("insert into answer_unlocks (id,account_id,question_id,created_at) values ('${UUID.randomUUID()}','$account',941,now())")
                flyway("76").migrate()
                sql.executeQuery("select id,content,input_type from questions where id in (901,921,941)").use { rs ->
                    while (rs.next()) {
                        assertEquals(original.getValue(rs.getInt(1)),rs.getString(2))
                        assertEquals("TEXT",rs.getString(3))
                    }
                }
                sql.executeQuery("select content,selected_option_ids from answers where question_id=901").use { rs ->
                    assertTrue(rs.next()); assertEquals("예전에 쓴 문답을 그대로 보존해요",rs.getString(1)); assertEquals("",rs.getString(2))
                }
                sql.executeQuery("select count(*) from questions where input_type<>'TEXT'").use { rs -> rs.next(); assertEquals(57,rs.getInt(1)) }
                sql.executeQuery("select count(*) from questions").use { rs -> rs.next(); assertEquals(1000,rs.getInt(1)) }
            }
        }
    }
}
