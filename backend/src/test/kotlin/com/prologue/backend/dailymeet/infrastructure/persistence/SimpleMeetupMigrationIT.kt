package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import org.flywaydb.core.Flyway
import java.sql.DriverManager
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** 기존 모임이 든 V72 스키마를 실제 PostgreSQL에서 새 버전으로 올려본다. 운영 DB에는 접근하지 않는다. */
class SimpleMeetupMigrationIT : PostgresRepositoryTest() {
    @Test fun `기존 조건과 신청 구독 기록을 유지하고 연락 링크만 선택으로 바꾼다`() {
        val schema = "meetup_upgrade_" + UUID.randomUUID().toString().replace("-", "")
        fun flyway(target: String? = null): Flyway {
            val config = Flyway.configure().dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
                .schemas(schema).defaultSchema(schema)
            if (target != null) config.target(target)
            return config.load()
        }
        flyway("72").migrate()
        DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password).use { connection ->
            connection.createStatement().use { sql ->
                sql.execute("set search_path to $schema")
                val id = UUID.randomUUID()
                val host = UUID.randomUUID()
                val applicant = UUID.randomUUID()
                sql.execute("""insert into meetups (id, series_id, host_account_id, title, meet_at, place, capacity, fee, kakao_link,
                    capacity_male, capacity_female, fee_female, min_height_male_cm, body_image_urls)
                    values ('$id', '$id', '$host', '기존 모임', '2030-10-17T09:00:00Z', '서로서가', 8, 10000,
                    'https://open.kakao.com/o/old', 4, 4, 8000, 170, 'https://cdn/body.jpg')""")
                sql.execute("insert into meetup_applications (id, meetup_id, applicant_account_id, status) values ('${UUID.randomUUID()}', '$id', '$applicant', 'CONFIRMED')")
                sql.execute("insert into meetup_follows (account_id, series_id) values ('$applicant', '$id')")
                flyway().migrate()
                sql.executeQuery("select kakao_link, capacity_male, fee_female, min_height_male_cm, body_image_urls from meetups where id = '$id'").use { rs ->
                    assertTrue(rs.next())
                    assertEquals("https://open.kakao.com/o/old", rs.getString(1))
                    assertEquals(4, rs.getInt(2)); assertEquals(8000, rs.getInt(3)); assertEquals(170, rs.getInt(4))
                    assertEquals("https://cdn/body.jpg", rs.getString(5))
                }
                for (table in listOf("meetup_applications", "meetup_follows")) {
                    sql.executeQuery("select count(*) from $table").use { rs -> rs.next(); assertEquals(1, rs.getInt(1)) }
                }
                sql.execute("""insert into meetups (id, series_id, host_account_id, title, meet_at, place, capacity, kakao_link)
                    values ('${UUID.randomUUID()}', '${UUID.randomUUID()}', '$host', '간단한 모임', '2030-10-18T09:00:00Z', '양재', 8, null)""")
                sql.executeQuery("select count(*) from pg_indexes where schemaname = '$schema' and indexname in ('idx_meetups_host_created', 'idx_meetup_apps_meetup_created', 'idx_meetup_apps_meetup_status', 'idx_meetup_follows_series_account')").use { rs -> rs.next(); assertEquals(4, rs.getInt(1)) }
            }
        }
    }
}
