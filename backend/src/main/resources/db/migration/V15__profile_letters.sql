-- 프로필 편지: 질문 풀에서 골라 미리 써두는 자기소개 (계정당 최대 3개, 400자)
-- 자기소개 입력칸을 없앤 자리 — 소개는 문답(편지) 형식으로만 쌓인다.

create table profile_letters (
    id          uuid          primary key,
    account_id  uuid          not null,
    question_id bigint        not null references questions (id),
    content     varchar(400)  not null,
    created_at  timestamptz   not null,
    updated_at  timestamptz   not null,
    constraint uq_profile_letter_account_question unique (account_id, question_id)
);
create index idx_profile_letter_account on profile_letters (account_id);
