-- 지인 차단 — 아는 사람이 "오늘의 상대"로 오가지 않게 한다.
--
-- phone_blocks: 번호로 차단. 원문 대신 HMAC 해시만 저장한다 — 차단 목록에는 회원이 아닌
-- 사람의 번호도 들어올 수 있어서, 유출 시 남의 번호가 새는 걸 막는다. 표시용 마스킹만 따로 둔다.
-- block_settings: 같은 회사(직장 인증 도메인) 차단 스위치.
create table phone_blocks
(
    account_id   uuid        not null,
    phone_hash   varchar(64) not null,
    phone_masked varchar(20) not null,
    created_at   timestamptz not null default now(),
    primary key (account_id, phone_hash)
);

-- 역방향 조회("내 번호를 차단한 사람")가 매칭 때마다 돈다.
create index idx_phone_blocks_hash on phone_blocks (phone_hash);

create table block_settings
(
    account_id         uuid        primary key,
    block_same_company boolean     not null default false,
    updated_at         timestamptz not null default now()
);
