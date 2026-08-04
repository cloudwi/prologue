-- 연락처 — 편지(연락처 교환)의 재료.
-- 전화번호는 신규 가입부터 필수(온보딩에서 검증), 이전 회원 행이 남아 있어 컬럼은 nullable.
alter table members add column phone varchar(20);
alter table members add column kakao_id varchar(30);
