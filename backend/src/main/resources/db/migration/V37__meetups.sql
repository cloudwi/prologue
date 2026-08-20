-- 오프라인 모임 — 모임장이 웹(/host)에서 만들고, 회원이 앱에서 신청한다.
-- 참가비 입금과 확정은 모임장의 카카오(오픈채팅)에서 이뤄지고,
-- 모임장이 확정 표시만 여기로 되돌린다. 우리는 돈을 만지지 않는다.
create table meetups
(
    id              uuid primary key,
    host_account_id uuid          not null,
    title           varchar(80)   not null,
    description     varchar(1000),
    meet_at         timestamptz   not null,
    place           varchar(120)  not null,
    capacity        int           not null,
    fee             int           not null default 0,
    -- 모임장의 오픈채팅 링크 — 신청자에게만 내려간다
    kakao_link      varchar(300)  not null,
    -- OPEN(모집 중) → CLOSED(모집 마감) → DONE(개최 완료) | CANCELED(취소)
    status          varchar(12)   not null default 'OPEN',
    created_at      timestamptz   not null default now()
);

create index idx_meetups_status_meet_at on meetups (status, meet_at);
create index idx_meetups_host on meetups (host_account_id);

create table meetup_applications
(
    id                   uuid primary key,
    meetup_id            uuid        not null references meetups (id) on delete cascade,
    applicant_account_id uuid        not null,
    -- APPLIED(신청) → CONFIRMED(모임장이 입금 확인 후 확정) | DECLINED(모임장이 거절) | CANCELED(신청자가 취소)
    status               varchar(12) not null default 'APPLIED',
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    unique (meetup_id, applicant_account_id)
);

create index idx_meetup_apps_applicant on meetup_applications (applicant_account_id);
