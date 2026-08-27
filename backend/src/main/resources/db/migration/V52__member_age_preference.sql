-- 소개받고 싶은 나이대. 비워두면 상관없다는 뜻이다.
--
-- 지금까지 나이는 점수에만 쓰였다(PeerScore.ageScore — 나이 차가 벌어질수록 뒤로 밀린다).
-- 그건 "누가 먼저인가"를 정할 뿐이라, 스물아홉이 마흔을 소개받는 날은 여전히 생긴다.
-- 본인이 정한 범위는 순서의 문제가 아니라 자격의 문제다 — 그래서 여기에 칸을 낸다.
--
-- 기존 회원은 전부 null로 들어간다. 아무 조건도 걸지 않던 어제와 똑같이 동작한다.
alter table members
    add column min_age int,
    add column max_age int;

comment on column members.min_age is '소개받고 싶은 최소 만 나이. null이면 하한 없음';
comment on column members.max_age is '소개받고 싶은 최대 만 나이. null이면 상한 없음';
