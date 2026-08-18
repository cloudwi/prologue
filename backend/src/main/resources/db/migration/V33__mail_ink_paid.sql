-- 편지에 "얼마를 내고 부쳤는지"를 남긴다.
--
-- 서로 하트를 주고받은 상대에게는 편지가 할인된다(50 → 35). 회수 환급은 부친 값의 절반이라,
-- 편지마다 낸 값이 달라지는 순간 환급액도 편지에 적힌 값에서 계산해야 한다.
-- 값표 상수(50)에서 계산하면 할인받은 편지를 회수할 때 낸 것보다 많이 돌려주게 된다.
--
-- 기존 편지는 모두 정가 50으로 부쳐졌다.

alter table mails add column ink_paid integer not null default 50;
alter table mails alter column ink_paid drop default;
