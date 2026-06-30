-- dailymeet: 오늘의 문답 (질문 시드 + 답변)

create table questions (
    id      bigint       primary key,
    content varchar(500) not null
);

insert into questions (id, content) values
    (1, '요즘 가장 마음을 쓰고 있는 일은 무엇인가요?'),
    (2, '사랑하는 사람에게 가장 듣고 싶은 말은 무엇인가요?'),
    (3, '혼자만의 시간에는 주로 무엇을 하나요?'),
    (4, '최근에 누군가에게 진심으로 고마웠던 순간은?'),
    (5, '삶에서 절대 양보할 수 없는 가치는 무엇인가요?'),
    (6, '10년 후의 나는 어떤 모습이면 좋겠어요?'),
    (7, '아주 작은 행복을 느끼는 순간은 언제인가요?'),
    (8, '관계에서 가장 중요하게 생각하는 한 가지는?'),
    (9, '요즘 빠져 있는 것이 있다면 무엇인가요?'),
    (10, '스스로가 조금 자랑스러웠던 최근의 일은?');

create table answers (
    id          uuid         primary key,
    account_id  uuid         not null,
    question_id bigint       not null references questions (id),
    content     varchar(1000) not null,
    created_at  timestamptz  not null,
    constraint uq_answer_account_question unique (account_id, question_id)
);
create index idx_answer_question on answers (question_id);
