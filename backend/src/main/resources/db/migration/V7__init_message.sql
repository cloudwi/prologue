-- dailymeet: 대화방 메시지(1:1 문답)

create table messages (
    id                uuid          primary key,
    conversation_id   uuid          not null references conversations (id),
    sender_account_id uuid          not null,
    content           varchar(1000) not null,
    created_at        timestamptz   not null
);
create index idx_message_conversation on messages (conversation_id, created_at);
