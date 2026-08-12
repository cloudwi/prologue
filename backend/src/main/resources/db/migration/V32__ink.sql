-- 재화를 우표에서 잉크로 바꾼다.
--
-- 우표는 "한 장 = 편지 한 통"이라 쪼갤 수 없었다. 편지를 회수할 때 절반만 돌려주려 해도
-- 0.5장은 셀 수 없고, 프로필 열기처럼 편지보다 훨씬 가벼운 행동에 값을 매길 자리도 없었다.
-- 잉크는 그냥 수라서 둘 다 자연히 풀린다 — 편지 50, 프로필 8, 회수 환급 25.
--
-- 우표라는 말과 그림은 편지 화면의 은유로 남는다. 세는 재화만 잉크로 바뀐다.
--
-- 기존 잔액은 우표 1장 = 잉크 50으로 환산한다(편지 한 통의 값이 그대로 유지되도록).
-- 원장도 같은 비율로 환산해야 한다 — 잔액만 올리면 내역의 합이 잔액을 설명하지 못한다.

alter table stamp_wallets rename to ink_wallets;
alter table ink_wallets rename column balance to ink;
update ink_wallets set ink = ink * 50;
alter table ink_wallets rename constraint ck_stamp_balance_non_negative to ck_ink_non_negative;

alter table stamp_ledger rename to ink_ledger;
update ink_ledger set amount = amount * 50;
alter index idx_stamp_ledger_account rename to idx_ink_ledger_account;

alter table stamp_purchases rename to ink_purchases;
alter table ink_purchases rename column stamps to ink;
update ink_purchases set ink = ink * 50;
alter index ux_stamp_purchases_txn rename to ux_ink_purchases_txn;
alter index idx_stamp_purchases_account rename to idx_ink_purchases_account;

alter table stamp_event_submissions rename to ink_event_submissions;
update ink_event_submissions set granted_amount = granted_amount * 50 where granted_amount is not null;
alter index idx_stamp_event_account rename to idx_ink_event_account;
alter index idx_stamp_event_status rename to idx_ink_event_status;
