-- 잉크로 산 하루치 문답 열람권.
--
-- 블라인드 규칙은 "그 질문에 답해야 그 질문의 상대 답이 열린다"였다. 이 표는 그 규칙을
-- 없애는 게 아니라 **값을 매긴다** — 답하지 않은 날은 잉크를 내면 그날 몫이 열린다.
-- 값(InkPrice.ANSWER_UNLOCK=5)은 쓰면 고이는 잉크(2)보다 언제나 무겁다. 그 차이가 없으면
-- 아무도 쓰지 않고, 아무도 쓰지 않으면 살 답도 없어진다.
--
-- 단위가 사람이 아니라 **질문**인 이유: 답을 쓰면 그 질문에 달린 상대 답이 전부 열린다.
-- 열람권도 같은 단위여야 '산 것'과 '쓴 것'이 같은 값이 된다. 사람 단위로 팔면 같은 하루를
-- 여러 번 사게 되는데, 그건 값을 받는 게 아니라 같은 것을 두 번 파는 일이다.
--
-- 유니크 인덱스가 자물쇠다(profile_unlocks와 같은 이유). 여기서 막는 건 중복 '차감'이라,
-- 놓치면 유저가 손해를 본다.
create table answer_unlocks (
    id         uuid        primary key,
    account_id uuid        not null,
    question_id bigint     not null,
    created_at timestamptz not null
);

create unique index ux_answer_unlocks_pair on answer_unlocks (account_id, question_id);
