-- 최근 접속 — 발견에서 "오늘 활동" 신호로 노출(정확한 시각 대신 버킷으로 뭉갬), 활성 지표 집계용.
-- 인증 필터가 시간 단위 스로틀로 갱신한다. 가입 이래 접속 기록이 없으면 null.
alter table accounts add column last_seen_at timestamptz;
