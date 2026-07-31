-- 우표(재화): 대화 신청 1건 = 우표 1장. "편지를 부치는 값".
-- 충전(IAP)은 출시 직전에 붙는다 — 지금 지급 경로는 지갑 첫 생성 시 환영 3장뿐.

create table stamp_wallets (
    account_id uuid        primary key,
    balance    int         not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint ck_stamp_balance_non_negative check (balance >= 0)
);

-- 증감 내역 원장 — 잔액의 출처를 언제든 설명할 수 있게. (IAP 정산·CS 대비)
create table stamp_ledger (
    id         uuid        primary key,
    account_id uuid        not null,
    amount     int         not null,
    reason     varchar(30) not null,
    created_at timestamptz not null
);
create index idx_stamp_ledger_account on stamp_ledger (account_id, created_at desc);
