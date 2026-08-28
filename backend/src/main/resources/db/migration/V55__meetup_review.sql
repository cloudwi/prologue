-- 모임 심사 — 모든 모임이 PENDING에서 시작해 운영자 승인을 거친다(2026-08-28).
--
-- 이미 열려 있는 모임은 건드리지 않는다. 사람이 이미 신청한 자리를 소급해서 닫으면
-- 신청자에게는 모임이 사라진 것으로 보인다.
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS review_note VARCHAR(300);

-- status 길이 확인 — PENDING(7)·REJECTED(8) 모두 기존 12자 안에 든다.
