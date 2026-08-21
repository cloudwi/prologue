-- 참가 조건을 성별별로 — 남/녀의 나이·키 기준이 다른 모임이 보통이라.
-- V39의 공통 조건 컬럼은 데이터가 실리기 전에 성별별로 교체한다.
alter table meetups drop column min_age;
alter table meetups drop column max_age;
alter table meetups drop column min_height_cm;

alter table meetups add column min_age_male        int;
alter table meetups add column max_age_male        int;
alter table meetups add column min_age_female      int;
alter table meetups add column max_age_female      int;
alter table meetups add column min_height_male_cm  int;
alter table meetups add column min_height_female_cm int;
