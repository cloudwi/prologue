-- auth: 이메일 인증코드(passwordless) 전환
-- 비밀번호 제거 + 인증코드 저장 테이블 추가

alter table accounts drop column password_hash;

create table email_verification_codes (
    id          uuid         primary key,
    email       varchar(255) not null,
    code_hash   varchar(255) not null,
    expires_at  timestamptz  not null,
    attempts    int          not null default 0,
    consumed_at timestamptz,
    created_at  timestamptz  not null
);
-- 이메일별 최신 코드 조회가 잦음
create index idx_evc_email on email_verification_codes (email, created_at desc);
