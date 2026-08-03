-- 우표 이벤트 제출 — 블로그 후기 링크를 남기면 운영자가 검토 후 우표를 지급한다.
-- 승인/반려는 웹 어드민에서, 지급 기록은 stamp_ledger(reason=EVENT)에 남는다.

create table stamp_event_submissions (
    id             uuid         primary key,
    account_id     uuid         not null,
    url            varchar(500) not null,
    status         varchar(20)  not null, -- PENDING / APPROVED / REJECTED
    granted_amount int,                   -- 승인 시 지급한 우표 수
    created_at     timestamptz  not null,
    decided_at     timestamptz
);
create index idx_stamp_event_account on stamp_event_submissions (account_id, created_at desc);
create index idx_stamp_event_status on stamp_event_submissions (status, created_at);
