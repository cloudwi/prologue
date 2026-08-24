package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * 지인 차단 — 아는 사람이 "오늘의 상대"로 오가지 않게 한다.
 *
 * 두 갈래다. ① 전화번호: 아는 사람의 번호를 등록해 막는다. 번호 원문은 저장하지 않고
 * HMAC 해시만 남긴다 — 차단 목록에는 회원이 아닌 사람의 번호도 들어올 수 있어서,
 * 유출 시 남의 번호가 새면 안 된다. 화면 표시용 마스킹(010****1234)만 따로 둔다.
 * ② 같은 회사: 직장 인증 도메인이 같은 사람을 서로에게서 숨긴다 — 회사 사람에게
 * 소개팅 프로필이 보이는 것이 가장 흔한 가입 망설임이라서다.
 *
 * 차단은 언제나 양방향이다 — 내가 안 보고 싶은 사람에게는 나도 보이면 안 된다.
 * 상대는 차단 사실을 알 수 없다(그저 소개가 일어나지 않을 뿐).
 * 거르는 지점은 오늘의 상대 후보 선정([exclusionFor]) — 이미 이어진 인연은 건드리지 않는다.
 */
@Service
class BlockService(
    private val jdbc: JdbcTemplate,
    private val jobVerificationService: JobVerificationService,
    /**
     * 전화번호 해시 페퍼. 번호는 경우의 수가 1억뿐이라 맨 SHA-256은 몇 초면 역산된다 —
     * 서버만 아는 값을 섞어야 해시가 의미 있다. 따로 정하지 않으면 JWT 시크릿을 빌려 쓴다.
     * 주의: 이 값이 바뀌면 기존 차단 해시가 전부 무효가 된다.
     */
    @param:Value("\${block.phone-pepper:\${jwt.secret}}") private val pepper: String,
) {
    data class PhoneBlockView(val phoneHash: String, val phoneMasked: String)
    data class BlocksView(val sameCompany: Boolean, val jobDomain: String?, val phones: List<PhoneBlockView>)

    @Transactional(readOnly = true)
    fun view(accountId: UUID): BlocksView = BlocksView(
        sameCompany = sameCompanyEnabled(accountId),
        jobDomain = jobVerificationService.verifiedDomain(accountId),
        phones = jdbc.query(
            "select phone_hash, phone_masked from phone_blocks where account_id = ? order by created_at desc",
            { rs, _ -> PhoneBlockView(rs.getString(1), rs.getString(2)) },
            accountId,
        ),
    )

    @Transactional
    fun addPhone(accountId: UUID, rawPhone: String) {
        val digits = normalize(rawPhone)
        val myPhone = jdbc.query(
            "select phone from members where account_id = ?", { rs, _ -> rs.getString(1) }, accountId,
        ).firstOrNull()
        if (digits == myPhone) throw MemberDomainException("내 번호는 차단할 수 없어요")
        val count = jdbc.queryForObject("select count(*) from phone_blocks where account_id = ?", Int::class.java, accountId) ?: 0
        if (count >= PHONE_LIMIT) throw MemberDomainException("차단 번호는 ${PHONE_LIMIT}개까지 등록할 수 있어요")
        jdbc.update(
            """
            insert into phone_blocks (account_id, phone_hash, phone_masked) values (?, ?, ?)
            on conflict (account_id, phone_hash) do nothing
            """.trimIndent(),
            accountId, hash(digits), mask(digits),
        )
    }

    @Transactional
    fun removePhone(accountId: UUID, phoneHash: String) {
        jdbc.update("delete from phone_blocks where account_id = ? and phone_hash = ?", accountId, phoneHash)
    }

    @Transactional
    fun setSameCompany(accountId: UUID, enabled: Boolean) {
        if (enabled && jobVerificationService.verifiedDomain(accountId) == null) {
            throw MemberDomainException("직장 인증을 먼저 해주세요. 같은 회사인지 알려면 회사 도메인이 필요해요.")
        }
        jdbc.update(
            """
            insert into block_settings (account_id, block_same_company, updated_at) values (?, ?, now())
            on conflict (account_id) do update set block_same_company = excluded.block_same_company, updated_at = now()
            """.trimIndent(),
            accountId, enabled,
        )
    }

    private fun sameCompanyEnabled(accountId: UUID): Boolean =
        jdbc.query(
            "select block_same_company from block_settings where account_id = ?", { rs, _ -> rs.getBoolean(1) }, accountId,
        ).firstOrNull() ?: false

    /**
     * 매칭에서 걸러야 하는 상대 — 후보 선정 전에 한 번 계산해 두고 후보마다 물어본다.
     * 세 갈래를 모두 본다: 내가 번호로 차단한 사람, 내 번호를 차단한 사람,
     * 같은 회사(어느 한쪽이라도 스위치를 켰으면 서로 숨긴다).
     */
    @Transactional(readOnly = true)
    fun exclusionFor(accountId: UUID, myPhone: String?): Exclusion {
        val myBlockedHashes = jdbc.query(
            "select phone_hash from phone_blocks where account_id = ?", { rs, _ -> rs.getString(1) }, accountId,
        ).toSet()
        val blockedMeIds = myPhone?.let { phone ->
            jdbc.query(
                "select account_id from phone_blocks where phone_hash = ?",
                { rs, _ -> UUID.fromString(rs.getString(1)) },
                hash(phone),
            ).toSet()
        } ?: emptySet()
        val myDomain = jobVerificationService.verifiedDomain(accountId)
        val sameCompanyIds = if (myDomain == null) {
            emptySet()
        } else {
            val mineOn = sameCompanyEnabled(accountId)
            jdbc.query(
                """
                select jv.account_id, coalesce(bs.block_same_company, false)
                from job_verifications jv
                left join block_settings bs on bs.account_id = jv.account_id
                where jv.email_domain = ? and jv.account_id <> ?
                """.trimIndent(),
                { rs, _ -> UUID.fromString(rs.getString(1)) to rs.getBoolean(2) },
                myDomain, accountId,
            ).filter { (_, theirsOn) -> mineOn || theirsOn }.map { it.first }.toSet()
        }
        if (myBlockedHashes.isEmpty() && blockedMeIds.isEmpty() && sameCompanyIds.isEmpty()) return Exclusion.NONE
        return Exclusion(myBlockedHashes, blockedMeIds + sameCompanyIds, ::hash)
    }

    /** 미리 계산한 차단 집합 — 후보 하나를 걸러야 하는지 O(1)로 답한다. */
    class Exclusion internal constructor(
        private val blockedPhoneHashes: Set<String>,
        private val excludedIds: Set<UUID>,
        private val hash: (String) -> String,
    ) {
        fun excludes(peer: Member): Boolean {
            if (peer.accountId in excludedIds) return true
            if (blockedPhoneHashes.isEmpty()) return false
            val phone = peer.phone ?: return false
            return hash(phone) in blockedPhoneHashes
        }

        companion object {
            /** 아무도 거르지 않는다 — 차단이 하나도 없는 대부분의 유저가 받는 값. */
            val NONE = Exclusion(emptySet(), emptySet()) { it }
        }
    }

    private fun hash(digits: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(pepper.toByteArray(), "HmacSHA256"))
        return mac.doFinal(digits.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    private fun mask(digits: String): String = digits.take(3) + "****" + digits.takeLast(4)

    /** 회원 가입의 전화번호 규칙과 같은 정규화 — 저장된 번호와 같은 꼴이어야 해시가 만난다. */
    private fun normalize(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        if (!digits.matches(Regex("^01[016789]\\d{7,8}$"))) throw MemberDomainException("휴대폰 번호 형태가 아니에요")
        return digits
    }

    companion object {
        private const val PHONE_LIMIT = 100
    }
}
