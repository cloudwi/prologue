-- auth 컨텍스트: 계정(Account) 애그리거트 스키마

create table accounts (
    id            uuid         primary key,
    email         varchar(255) not null,
    password_hash varchar(255) not null,
    status        varchar(20)  not null,
    created_at    timestamptz  not null,
    -- 이메일이 전 시스템에서 한 계정을 가리키는 자연키 (정규화된 소문자 형태로 저장)
    constraint uq_accounts_email unique (email)
);

-- 계정 권한
create table account_roles (
    account_id uuid        not null references accounts (id) on delete cascade,
    role       varchar(20) not null,
    constraint pk_account_roles primary key (account_id, role)
);
