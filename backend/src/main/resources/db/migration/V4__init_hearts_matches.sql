-- dailymeet: 하트(호감)와 매칭(상호 하트)

create table hearts (
    id              uuid        primary key,
    from_account_id uuid        not null,
    to_account_id   uuid        not null,
    question_id     bigint      not null references questions (id),
    created_at      timestamptz not null,
    constraint uq_heart_from_to_question unique (from_account_id, to_account_id, question_id)
);
create index idx_heart_to on hearts (to_account_id, question_id);

create table matches (
    id           uuid        primary key,
    account_low  uuid        not null,
    account_high uuid        not null,
    question_id  bigint      not null references questions (id),
    created_at   timestamptz not null,
    constraint uq_match_pair_question unique (account_low, account_high, question_id)
);
create index idx_match_low on matches (account_low);
create index idx_match_high on matches (account_high);
