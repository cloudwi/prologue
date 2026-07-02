-- dailymeet: 대화 신청(요청→수락) + 대화

create table conversation_requests (
    id                   uuid        primary key,
    requester_account_id uuid        not null,
    addressee_account_id uuid        not null,
    question_id          bigint      not null references questions (id),
    status               varchar(10) not null,
    created_at           timestamptz not null,
    responded_at         timestamptz,
    constraint uq_conv_req unique (requester_account_id, addressee_account_id, question_id)
);
create index idx_conv_req_addressee on conversation_requests (addressee_account_id, status);

create table conversations (
    id           uuid        primary key,
    account_low  uuid        not null,
    account_high uuid        not null,
    created_at   timestamptz not null,
    constraint uq_conversation_pair unique (account_low, account_high)
);
create index idx_conversation_low on conversations (account_low);
create index idx_conversation_high on conversations (account_high);
