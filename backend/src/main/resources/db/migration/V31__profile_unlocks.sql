-- 우표를 써서 다시 연 프로필.
--
-- 소개와 하트는 사흘이 지나면 프로필이 닫힌다. 다시 보려면 우표 한 장을 쓰고,
-- 한 번 열면 다시 닫히지 않는다 — 같은 사람을 두 번 사게 만들지 않기 위해.
--
-- 유니크 인덱스가 그 자물쇠다. 결제 기록과 달리 여기서 막는 건 중복 '차감'이라,
-- 놓치면 유저가 손해를 본다 — 앱이 재시도하든 두 요청이 같은 순간에 들어오든 한 번만 나간다.
create table profile_unlocks (
    id              uuid        primary key,
    account_id      uuid        not null,
    peer_account_id uuid        not null,
    created_at      timestamptz not null
);

create unique index ux_profile_unlocks_pair on profile_unlocks (account_id, peer_account_id);
