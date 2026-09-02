-- 생활 습관 — 흡연·음주·만나는 빈도.
--
-- 소개팅에서 "만나기 전에 알았으면" 소리가 가장 많이 나오는 항목들이다. 담배와 술은 함께 사는
-- 시간의 모양을 바꾸고, 만나는 빈도는 연애의 속도를 정한다 — 셋 다 나중에 알면 서로의 시간을
-- 쓴 뒤가 된다. 셋 다 선택이고, 안 고르면 null이라 프로필에 아무것도 표시하지 않는다.
--
-- 민감정보가 아니라 별도 동의는 필요 없다(종교·정치와 그 점이 다르다). 그런데도 저장 경로를
-- 프로필과 분리한 이유는 하나뿐이다: 프로필 저장(PUT /members/me)은 전체 덮어쓰기라,
-- 이 항목을 모르는 화면이 저장 한 번으로 조용히 지워버린다.
alter table members
    add column smoking        varchar(20),
    add column drinking       varchar(20),
    add column meet_frequency varchar(20);

comment on column members.smoking is 'NONE(안 피움)/QUITTING(끊는 중)/SOMETIMES/REGULAR. null은 안 고름';
comment on column members.drinking is 'NONE/RARELY/SOMETIMES/OFTEN. null은 안 고름';
comment on column members.meet_frequency is '만나고 싶은 빈도 ONCE/TWO_TO_THREE/FOUR_PLUS/FLEXIBLE. null은 안 고름';
