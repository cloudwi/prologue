-- 정오에 새 10장. 이미 발급한 묶음은 다음 묶음을 시작하기 전까지 유효하다.
create table taste_sessions (
    id uuid primary key,
    account_id uuid not null,
    deck_day date not null,
    reward_key integer generated always as identity unique,
    started_at timestamptz not null,
    superseded_at timestamptz,
    unique (account_id, deck_day)
);
create table taste_session_cards (
    session_id uuid not null references taste_sessions(id),
    card_id bigint not null references taste_cards(id),
    position integer not null check (position between 0 and 9),
    choice varchar(1) check (choice in ('A','B','C','D')),
    note varchar(100),
    answered_at timestamptz,
    primary key (session_id, card_id),
    unique (session_id, position)
);
-- 통계는 반복 참여 횟수가 아니라 카드별 고유 응답자의 최신 선택을 집계한다.
create index idx_taste_choices_card_choice on taste_choices (card_id, choice);
comment on column taste_sessions.reward_key is '음수로 taste_rewards.milestone에 연결. 기존 양수 누적 이정표와 분리';
