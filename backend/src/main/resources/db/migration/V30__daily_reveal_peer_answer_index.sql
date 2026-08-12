-- "한 번 이어진 사람은 다시 소개하지 않는다"를 양방향으로 확인하려면
-- "내 답변이 누구에게 소개됐나"를 peer_answer_id로 되짚어야 한다.
--
-- 기존 idx_daily_reveal_peer는 (question_id, peer_answer_id) 순서라 question_id 없이는 쓰이지 못해,
-- 이 조회가 daily_reveals 전체를 훑는다. 소개 기록은 하루하루 쌓이기만 하는 표라 그대로 두면
-- 매칭이 느려지는 방향으로만 간다.
create index idx_daily_reveal_peer_answer on daily_reveals (peer_answer_id);
