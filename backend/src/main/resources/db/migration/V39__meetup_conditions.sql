-- 모임 조건·성별별 참가비 — 모임장이 참가 대상과 값을 조율할 수 있게.
-- 조건은 프로필로 검증 가능한 것만 받는다(성별·나이·키). 전부 null이면 제한 없음.
alter table meetups add column fee_female    int;        -- null이면 fee(공통)와 동일
alter table meetups add column gender_limit  varchar(6); -- MALE/FEMALE, null = 모두
alter table meetups add column min_age       int;
alter table meetups add column max_age       int;
alter table meetups add column min_height_cm int;
