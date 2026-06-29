-- auth 컨텍스트: 계정(Account) 애그리거트 스키마

create table accounts (
    id         uuid        primary key,
    status     varchar(20) not null,
    created_at timestamptz not null
);

-- 소셜 연결: (provider, provider_user_id)가 전 시스템 유일 → 한 계정으로 매핑
create table account_social_connections (
    account_id       uuid        not null references accounts (id) on delete cascade,
    provider         varchar(20) not null,
    provider_user_id varchar(255) not null,
    constraint uq_account_social_connection unique (provider, provider_user_id)
);
create index idx_asc_account_id on account_social_connections (account_id);

-- 계정 권한
create table account_roles (
    account_id uuid        not null references accounts (id) on delete cascade,
    role       varchar(20) not null,
    constraint pk_account_roles primary key (account_id, role)
);
