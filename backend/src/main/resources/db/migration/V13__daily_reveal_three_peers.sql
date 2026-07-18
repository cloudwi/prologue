-- dailymeet: 오늘의 상대를 하루 1명 → 하루 최대 3명(정오 공개)으로 확장
-- (viewer, question) 유니크 제약을 (viewer, question, peer_answer)로 완화해 한 사용자가 하루 여러 상대를 고정할 수 있게 한다.

alter table daily_reveals drop constraint uq_daily_reveal_viewer_question;
alter table daily_reveals
    add constraint uq_daily_reveal_viewer_question_peer unique (viewer_account_id, question_id, peer_answer_id);
