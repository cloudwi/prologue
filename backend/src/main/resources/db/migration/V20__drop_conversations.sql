-- 편지 모델 전환(2026-08-04)으로 인앱 채팅을 접었다 — 대화·메시지·대화 신청을 걷어낸다.
-- matches는 하트 초기 설계의 유물로 코드가 쓴 적이 없다. 출시 전이라 데이터 미련 없이 버린다.
drop table if exists messages;
drop table if exists conversations;
drop table if exists conversation_requests;
drop table if exists matches;
