-- 피드 하트는 같은 날 한 번만 묶어 알린다.
create table feed_heart_digest_deliveries (
    author_account_id uuid primary key,
    last_heart_at timestamptz not null,
    heart_count integer not null,
    sent_at timestamptz not null default now()
);

-- Expo가 접수한 푸시 ticket을 receipt 조회까지 따라가 실제 전달 실패를 확인한다.
create table push_delivery_tickets (
    ticket_id varchar(80) primary key,
    device_token varchar(255) not null,
    status varchar(20) not null default 'PENDING',
    error varchar(80),
    created_at timestamptz not null default now(),
    checked_at timestamptz,
    constraint push_delivery_status_check check (status in ('PENDING', 'DELIVERED', 'FAILED', 'EXPIRED'))
);

create index push_delivery_pending_idx on push_delivery_tickets (status, created_at);
