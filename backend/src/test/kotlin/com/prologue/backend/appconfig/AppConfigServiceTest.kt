package com.prologue.backend.appconfig

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import java.util.Optional

/**
 * 앱 부팅 설정 — **틀리면 앱이 안 열린다.**
 *
 * 여기 담긴 값은 "이 버전 미만은 못 쓴다"는 선언이다. 잘못 읽거나 잘못 물러서면 그 순간부터
 * 아무도 프롤로그를 못 연다. 그래서 확인하는 것은 값 자체가 아니라 **틀렸을 때 어느 쪽으로
 * 넘어지는가**이다 — 언제나 여는 쪽이어야 한다.
 */
class AppConfigServiceTest {

    /** 최소한의 가짜 저장소 — 행을 들고 있고, 시키면 터진다. */
    private class FakeRepo(
        var rows: MutableMap<String, String> = mutableMapOf(),
        var boom: Boolean = false,
    ) : AppSettingRepository {
        var reads = 0
        override fun findAll(): List<AppSettingJpaEntity> {
            reads += 1
            if (boom) throw IllegalStateException("DB가 없어요")
            return rows.map { AppSettingJpaEntity(it.key, it.value) }
        }
        override fun findById(id: String): Optional<AppSettingJpaEntity> =
            Optional.ofNullable(rows[id]?.let { AppSettingJpaEntity(id, it) })
        override fun <S : AppSettingJpaEntity> save(entity: S): S {
            rows[entity.key] = entity.value
            return entity
        }
        override fun deleteById(id: String) { rows.remove(id) }

        // 쓰지 않는 나머지.
        override fun findAll(sort: org.springframework.data.domain.Sort) = findAll()
        override fun findAll(pageable: org.springframework.data.domain.Pageable) = throw NotImplementedError()
        override fun findAllById(ids: MutableIterable<String>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> saveAll(entities: MutableIterable<S>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> saveAllAndFlush(entities: MutableIterable<S>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> saveAndFlush(entity: S) = save(entity)
        override fun count() = rows.size.toLong()
        override fun existsById(id: String) = rows.containsKey(id)
        override fun delete(entity: AppSettingJpaEntity) { rows.remove(entity.key) }
        override fun deleteAll() { rows.clear() }
        override fun deleteAll(entities: MutableIterable<AppSettingJpaEntity>) = throw NotImplementedError()
        override fun deleteAllById(ids: MutableIterable<String>) = throw NotImplementedError()
        override fun deleteAllByIdInBatch(ids: MutableIterable<String>) = throw NotImplementedError()
        override fun deleteAllInBatch() = throw NotImplementedError()
        override fun deleteAllInBatch(entities: MutableIterable<AppSettingJpaEntity>) = throw NotImplementedError()
        override fun flush() {}
        override fun getById(id: String) = throw NotImplementedError()
        override fun getOne(id: String) = throw NotImplementedError()
        override fun getReferenceById(id: String) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> findAll(example: org.springframework.data.domain.Example<S>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> findAll(example: org.springframework.data.domain.Example<S>, sort: org.springframework.data.domain.Sort) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> findAll(example: org.springframework.data.domain.Example<S>, pageable: org.springframework.data.domain.Pageable) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> findOne(example: org.springframework.data.domain.Example<S>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> count(example: org.springframework.data.domain.Example<S>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity> exists(example: org.springframework.data.domain.Example<S>) = throw NotImplementedError()
        override fun <S : AppSettingJpaEntity, R> findBy(
            example: org.springframework.data.domain.Example<S>,
            queryFunction: java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R>,
        ) = throw NotImplementedError()
    }

    private fun service(repo: FakeRepo) = AppConfigService(repo, "1.0.0", "1.0.0")

    @Test
    fun `행이 없으면 기본값을 쓴다 — 아무도 막지 않는다`() {
        val s = service(FakeRepo()).settings()

        assertEquals("1.0.0", s.minSupportedVersion)
        assertEquals("1.0.0", s.latestVersion)
    }

    @Test
    fun `DB에 있으면 그 값이 이긴다`() {
        val s = service(FakeRepo(mutableMapOf("min-supported-version" to "1.3.0"))).settings()

        assertEquals("1.3.0", s.minSupportedVersion)
        assertEquals("1.0.0", s.latestVersion) // 안 정한 것은 그대로 기본값
    }

    /*
     * 여기가 이 파일의 핵심이다.
     *
     * DB가 잠깐 흔들렸다고 세상의 모든 프롤로그가 열리지 않는 앱이 되면 안 된다. 못 읽으면
     * 기본값(1.0.0)으로 물러서고, 그건 아무도 막지 않는 값이다 — 넘어지는 방향이 곧 여는 방향.
     */
    @Test
    fun `DB를 못 읽으면 기본값으로 물러선다 — 설정 하나가 앱을 세우면 안 된다`() {
        val s = service(FakeRepo(boom = true)).settings()

        assertEquals("1.0.0", s.minSupportedVersion)
    }

    @Test
    fun `한 번 읽은 값이 있으면 DB가 죽어도 그걸 쓴다`() {
        val repo = FakeRepo(mutableMapOf("min-supported-version" to "1.3.0"))
        val service = service(repo)
        assertEquals("1.3.0", service.settings().minSupportedVersion)

        repo.boom = true
        assertEquals("1.3.0", service.settings().minSupportedVersion)
    }

    @Test
    fun `부팅마다 DB를 두드리지 않는다 — 로그인 전에 부르는 길이다`() {
        val repo = FakeRepo()
        val service = service(repo)
        repeat(5) { service.settings() }

        assertEquals(1, repo.reads)
    }

    @Test
    fun `값을 바꾸면 캐시를 버린다 — 되돌릴 때 30초를 기다릴 수 없다`() {
        val repo = FakeRepo()
        val service = service(repo)
        assertEquals("1.0.0", service.settings().minSupportedVersion)

        service.put("min-supported-version", "1.3.0")

        assertEquals("1.3.0", service.settings().minSupportedVersion)
    }

    @Test
    fun `지우면 기본값으로 돌아간다`() {
        val repo = FakeRepo(mutableMapOf("min-supported-version" to "1.3.0"))
        val service = service(repo)
        assertEquals("1.3.0", service.settings().minSupportedVersion)

        service.clear("min-supported-version")

        assertEquals("1.0.0", service.settings().minSupportedVersion)
    }

    @Test
    fun `모르는 키는 받지 않는다 — 오타가 조용히 저장되면 안 된다`() {
        assertFailsWith<IllegalArgumentException> { service(FakeRepo()).put("min-version", "1.3.0") }
    }

    @Test
    fun `버전 꼴이 아니면 받지 않는다`() {
        val service = service(FakeRepo())

        assertFailsWith<IllegalArgumentException> { service.put("min-supported-version", "최신") }
        assertFailsWith<IllegalArgumentException> { service.put("min-supported-version", "1.3") }
    }

    @Test
    fun `앞뒤 공백은 떼고 저장한다`() {
        val repo = FakeRepo()
        service(repo).put("min-supported-version", "  1.3.0  ")

        assertTrue(repo.rows["min-supported-version"] == "1.3.0")
    }
}
