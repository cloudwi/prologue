-- 성비 게이트 — 남성 대기열.
--
-- 소개팅 앱은 성비가 생사다. 남초로 기울면 여성 한 명이 하루에 여러 번 소개되고,
-- 하트와 알림이 쌓여 여성이 먼저 떠난다. 여성이 떠나면 남성도 아무도 못 만난다.
-- 그래서 여성은 바로 들이고, 신규 남성은 활성 성비가 기준을 넘을 때까지 이 표에서 기다린다.
--
-- members에 열을 더하지 않고 별도 표로 둔다 — MemberPersistenceAdapter.save가 엔티티를
-- 통째로 다시 만들어, 프로필 저장 한 번에 상태가 덮이는 사고를 피하려고.
-- 행이 없으면 입장 상태다(fail-open). 기존 회원은 백필하지 않고, 스위치(GENDER_GATE)가
-- 꺼져 있으면 WAITING 행이 있어도 무시된다 — 표는 기록이고 결정은 설정이 한다.
create table member_gate (
    account_id  uuid primary key,
    status      varchar(20) not null,
    queued_at   timestamptz not null default now(),
    admitted_at timestamptz,
    admitted_by varchar(40),
    constraint member_gate_status_check check (status in ('WAITING', 'ADMITTED'))
);

-- 자동 입장이 "대기 중인 사람을 오래된 순으로 N명" 읽는 쿼리.
create index member_gate_waiting_idx on member_gate (status, queued_at);

comment on table member_gate is '성비 게이트 남성 대기열. 행이 없으면 입장 상태, 스위치가 꺼져 있으면 무시';
comment on column member_gate.status is 'WAITING(매칭 풀에서 제외) / ADMITTED(입장)';
comment on column member_gate.queued_at is '대기열에 들어온 시각 — 자동 입장 순서의 기준';
comment on column member_gate.admitted_by is '누가 들였나 — ADMIN(수동) / AUTO(스케줄러)';
