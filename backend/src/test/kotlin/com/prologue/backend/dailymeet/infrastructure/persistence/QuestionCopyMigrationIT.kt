package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import org.flywaydb.core.Flyway
import java.sql.DriverManager
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** 기존 문답·편지가 든 V74 DB를 실제 PostgreSQL에서 올린다. 운영 DB에는 접근하지 않는다. */
class QuestionCopyMigrationIT : PostgresRepositoryTest() {
    @Test
    fun `기록이 있는 질문은 주제를 지키고 빈 질문에만 새 취향을 섞는다`() {
        val schema = "question_upgrade_" + UUID.randomUUID().toString().replace("-", "")
        fun flyway(target: String): Flyway = Flyway.configure()
            .dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
            .schemas(schema).defaultSchema(schema).target(target).load()

        flyway("74").migrate()
        DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password).use { connection ->
            connection.createStatement().use { sql ->
                sql.execute("set search_path to $schema")
                val recordedIds = listOf(5, 15, 25)
                val originalQuestions = mutableMapOf<Int, String>()
                sql.executeQuery("select id, content from questions where id in (${recordedIds.joinToString()})").use { rs ->
                    while (rs.next()) originalQuestions[rs.getInt(1)] = rs.getString(2)
                }
                val account = UUID.randomUUID()
                val peer = UUID.randomUUID()
                val answer = UUID.randomUUID()
                sql.execute("insert into answers (id, account_id, question_id, content, created_at) values ('$answer', '$account', 5, '함께 살아도 내 가치는 지켜요', now())")
                sql.execute("insert into profile_letters (id, account_id, question_id, content, created_at, updated_at) values ('${UUID.randomUUID()}', '$account', 15, '밥을 차릴 때 채소를 준비해요', now(), now())")
                sql.execute("insert into hearts (id, from_account_id, to_account_id, question_id, created_at) values ('${UUID.randomUUID()}', '$account', '$peer', 25, now())")
                sql.execute("insert into daily_reveals (id, viewer_account_id, question_id, peer_answer_id, created_at) values ('${UUID.randomUUID()}', '$peer', 5, '$answer', now())")
                // 긴 문장은 답변이 있어도 같은 의미로 줄일 수 있다.
                sql.execute("insert into answers (id, account_id, question_id, content, created_at) values ('${UUID.randomUUID()}', '$account', 3, '혼자 있으면 에너지가 채워져요', now())")

                flyway("75").migrate()

                sql.executeQuery("select id, content from questions where id in (${recordedIds.joinToString()})").use { rs ->
                    while (rs.next()) assertEquals(originalQuestions.getValue(rs.getInt(1)), rs.getString(2))
                }
                sql.executeQuery("select id, content from questions where id in (3, 55)").use { rs ->
                    val expected = mapOf(
                        3 to "연애 중 혼자만의 시간은 무엇을 채워주나요?",
                        55 to "러닝이나 산책에 딱 맞는 노래는 무엇인가요?",
                    )
                    var count = 0
                    while (rs.next()) { assertEquals(expected.getValue(rs.getInt(1)), rs.getString(2)); count++ }
                    assertEquals(2, count)
                }
                sql.executeQuery("select question_id, content from answers order by question_id").use { rs ->
                    assertTrue(rs.next()); assertEquals(3, rs.getInt(1)); assertEquals("혼자 있으면 에너지가 채워져요", rs.getString(2))
                    assertTrue(rs.next()); assertEquals(5, rs.getInt(1)); assertEquals("함께 살아도 내 가치는 지켜요", rs.getString(2))
                }
                for (table in listOf("profile_letters", "hearts", "daily_reveals")) {
                    sql.executeQuery("select count(*) from $table").use { rs -> rs.next(); assertEquals(1, rs.getInt(1)) }
                }
                sql.executeQuery("select count(*), min(id), max(id) from questions").use { rs ->
                    assertTrue(rs.next()); assertEquals(1000, rs.getInt(1)); assertEquals(1, rs.getInt(2)); assertEquals(1000, rs.getInt(3))
                }
            }
        }
    }
}
