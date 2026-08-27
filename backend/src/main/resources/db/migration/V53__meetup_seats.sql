-- 자리를 성별로 나누고, 대기 줄에 끝을 둔다.
--
-- 지금까지 정원은 통합 하나뿐이었다. 그런데 오프라인 모임에서 실제로 세는 단위는 "8명"이
-- 아니라 "남 4, 여 4"다. 통합 정원만으로는 한쪽 성별로만 여덟 명이 차는 걸 막을 수 없고,
-- 모임장은 그걸 오픈채팅에서 손으로 세고 있었다.
--
-- 대기자도 마찬가지다. 신청은 무한정 쌓였다. 여덟 자리에 마흔 명이 손을 들면 서른두 명은
-- 언젠가 거절당할 사람인데, 그걸 알면서 계속 받는 건 기다리게 하는 것이 아니라 속이는 것에 가깝다.
--
-- 셋 다 null이 기본이다. 나누지 않은 모임은 어제와 똑같이 동작한다.
alter table meetups
    add column capacity_male     int,
    add column capacity_female   int,
    add column waitlist_capacity int;

comment on column meetups.capacity_male is '남성 정원. null이면 성별로 나누지 않은 모임';
comment on column meetups.capacity_female is '여성 정원. null이면 성별로 나누지 않은 모임';
comment on column meetups.waitlist_capacity is '확정 대기(신청) 인원 상한. null이면 제한 없음';
