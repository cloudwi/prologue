-- 직장 인증 — 회사 이메일로 코드를 받아 확인하면 도메인만 남긴다.
-- 서류 검수 대신 자동 인증: 무료 메일 도메인은 서비스가 거절한다.
create table job_verifications
(
    account_id   uuid primary key,
    email_domain varchar(120) not null,
    verified_at  timestamptz  not null default now()
);

-- 모임 조건: 직장 인증 필수
alter table meetups add column require_job_verified boolean not null default false;
