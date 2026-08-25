-- 모임의 회차 — 단발성 모임에 연속성을 준다.
--
-- 같은 모임이 다시 열리면 같은 series_id를 단다("밑줄 모임 3번째 만남").
-- 참여자는 그 회차가 아니라 **모임을 따라간다**: 다음 회차가 열리면 알림을 받는다.
--
-- 그룹(당근식 모임 홈·멤버 목록·그룹 채팅)을 짓는 게 아니다. 지속의 그릇은 여전히
-- 카카오 오픈채팅이고, 여기서는 "이게 지난번 그 모임이다"와 "다음에 또 열리면 알려줘"만 맡는다.

-- 기존 모임은 저마다 하나짜리 회차로 둔다 — 지금까지의 모임은 전부 단발이었다.
alter table meetups
    add column series_id uuid;

update meetups
set series_id = id
where series_id is null;

alter table meetups
    alter column series_id set not null;

-- 목록·상세가 "이 회차가 몇 번째인지"를 셀 때마다 도는 조회.
create index idx_meetups_series on meetups (series_id, meet_at);

-- 모임 따라가기 — 회차가 아니라 모임(series)을 따라간다.
-- 회차 하나가 끝나도 구독은 남아야 다음 회차를 알릴 수 있다.
create table meetup_follows
(
    account_id uuid        not null,
    series_id  uuid        not null,
    created_at timestamptz not null default now(),
    primary key (account_id, series_id)
);

-- 새 회차가 열릴 때 "이 모임을 따라가는 사람들"을 한 번에 찾는다.
create index idx_meetup_follows_series on meetup_follows (series_id);
