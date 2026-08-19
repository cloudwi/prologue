-- 친구 초대 — 내 초대 코드와, 누가 누구의 코드로 들어왔는지.
-- invite_codes: 계정당 하나, 처음 물을 때 만든다. 코드는 유일.
-- referrals: 초대받은 사람(invitee)당 한 줄 — 코드는 한 번만 쓸 수 있다. 보상은 잉크 원장(REFERRAL)에 남는다.
create table invite_codes (
    account_id uuid primary key,
    code       varchar(12) not null unique,
    created_at timestamptz not null
);

create table referrals (
    id                 uuid primary key,
    inviter_account_id uuid not null,
    invitee_account_id uuid not null unique,
    created_at         timestamptz not null
);
create index referrals_inviter_idx on referrals (inviter_account_id);
