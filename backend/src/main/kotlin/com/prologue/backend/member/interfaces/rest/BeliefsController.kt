package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.BeliefsService
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Religion
import jakarta.validation.constraints.Size
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 종교·정치 성향. 인증 필요(JWT).
 *
 * 프로필의 일부지만 경로를 따로 둔다 — 프로필 저장은 전체 덮어쓰기라, 이 항목을 모르는 옛 앱이
 * 저장 한 번으로 지워버리기 때문이다. 민감정보라 동의도 여기서 함께 받는다([BeliefsService]).
 */
@RestController
@RequestMapping("/members/me/beliefs")
class BeliefsController(
    private val beliefsService: BeliefsService,
) {
    @GetMapping
    fun view(authentication: Authentication): BeliefsResponse =
        BeliefsResponse.from(beliefsService.view(UUID.fromString(authentication.name)))

    /**
     * 적거나 지운다. 둘 다 null이면 지우는 것 — 그때는 동의를 묻지 않는다.
     * 부분 수정이 아니다: 보낸 두 값이 그대로 저장된다(종교만 지우려면 종교에 null, 성향은 그대로).
     */
    @PutMapping
    fun update(
        authentication: Authentication,
        @RequestBody request: BeliefsRequest,
    ): BeliefsResponse {
        val accountId = UUID.fromString(authentication.name)
        return BeliefsResponse.from(
            beliefsService.update(
                accountId = accountId,
                religion = request.religion,
                politicalLeaning = request.politicalLeaning,
                consented = request.consent,
                legalVersion = request.legalVersion,
            ),
        )
    }
}

data class BeliefsRequest(
    val religion: Religion? = null,
    val politicalLeaning: PoliticalLeaning? = null,
    /** 이번 요청에서 민감정보 수집에 동의했는지. 이미 동의한 사람은 보내지 않아도 된다. */
    val consent: Boolean = false,
    /** 동의 시점의 약관 버전. 새 동의를 남길 때만 쓰인다. */
    @field:Size(max = 20)
    val legalVersion: String? = null,
)

data class BeliefsResponse(
    val religion: Religion?,
    val politicalLeaning: PoliticalLeaning?,
    /** 이미 동의 기록이 있는지 — 화면이 동의 체크박스를 다시 보여줄지 정한다. */
    val consented: Boolean,
) {
    companion object {
        fun from(view: BeliefsService.BeliefsView): BeliefsResponse =
            BeliefsResponse(view.religion, view.politicalLeaning, view.consented)
    }
}
