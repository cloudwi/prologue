-- dailymeet: 블라인드 상대 노출 고정(하루 1명 비독점, 성별·선호 일치)
-- 한 사용자가 특정 질문에 대해 '오늘 본 상대 답변'을 하루 동안 고정한다.

create table daily_reveals (
    id                uuid        primary key,
    viewer_account_id uuid        not null,
    question_id       bigint      not null references questions (id),
    peer_answer_id    uuid        not null references answers (id),
    created_at        timestamptz not null,
    constraint uq_daily_reveal_viewer_question unique (viewer_account_id, question_id)
);
create index idx_daily_reveal_peer on daily_reveals (question_id, peer_answer_id);
