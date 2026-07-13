-- 생년(연도)만 받던 것을 생년월일로 확장. 만 나이 계산에 월일이 필요하다.
-- 기존 회원은 1월 1일로 근사 backfill (프로필 수정 시 실제 생일로 갱신됨).

alter table members add column birth_date date;
update members set birth_date = make_date(birth_year, 1, 1);
alter table members alter column birth_date set not null;
alter table members drop column birth_year;
