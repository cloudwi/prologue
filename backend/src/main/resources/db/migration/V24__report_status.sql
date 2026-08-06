-- 신고 처리 상태 — 어드민 검토 흐름: PENDING(대기) → DISMISSED(기각) | RESOLVED(조치 완료).
alter table reports add column status varchar(10) not null default 'PENDING';
alter table reports add column resolved_at timestamptz;
