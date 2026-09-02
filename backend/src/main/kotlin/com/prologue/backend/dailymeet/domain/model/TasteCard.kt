package com.prologue.backend.dailymeet.domain.model

/**
 * 취향 카드 — 둘 중 하나를 고르는 문답.
 *
 * 오늘의 질문([Question])과 **다른 더미**다. 로테이션에 섞지 않는 이유는 두 가지다.
 * ① 어떤 날은 탭 한 번으로 끝난다면 다음 날 서술형 앞에서 사람은 "어제는 안 써도 됐는데"를
 * 떠올린다 — 값싼 답이 비싼 답을 몰아내고, 상대의 글을 읽는 재미가 마른다.
 * ② 같은 날 모두가 같은 질문을 받는 게 소개의 전제라, 그날 질문이 객관식이면 옛 앱은
 * 그날 아무것도 하지 못한다.
 *
 * 그래서 카드는 날짜와 무관하다. 언제든, 몇 장이든 넘길 수 있고, 하루의 리듬을 건드리지 않는다.
 * 이 더미가 맡는 일은 셋이다 — 가입 직후의 백지를 없애는 것, 매칭이 쓸 수 있는 **구조화된**
 * 취향을 모으는 것([TasteAffinity]), 그리고 한 줄 덧붙이기로 쓰는 일로 건너가는 사다리가 되는 것.
 */
class TasteCard(
    val id: Long,
    /** 카드의 물음 — "주말의 나는?" 처럼 짧게. 두 선택지가 무엇을 가르는지 말해준다. */
    val prompt: String,
    val optionA: String,
    val optionB: String,
) {
    fun labelOf(option: TasteOption): String = when (option) {
        TasteOption.A -> optionA
        TasteOption.B -> optionB
    }
}

/** 카드의 두 선택지. 고르지 않는 것(건너뛰기)은 답이 아니라 부재라 값을 두지 않는다. */
enum class TasteOption { A, B }
