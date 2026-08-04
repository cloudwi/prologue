-- 편지 — 인앱 채팅 대신 연락처를 건네는 한 통.
-- 내용(300자)과 함께 전화번호/카카오톡 ID 중 하나 이상을 반드시 싣는다.
create table mails (
    id                   uuid         primary key,
    sender_account_id    uuid         not null references accounts (id),
    recipient_account_id uuid         not null references accounts (id),
    content              varchar(300) not null,
    phone                varchar(20),
    kakao_id             varchar(30),
    created_at           timestamptz  not null,
    constraint chk_mail_contact check (phone is not null or kakao_id is not null),
    -- 한 상대에게는 한 통 — 연락처를 건넸으면 다음은 앱 밖의 일이다.
    constraint uq_mail_sender_recipient unique (sender_account_id, recipient_account_id)
);
create index idx_mails_recipient on mails (recipient_account_id, created_at desc);
