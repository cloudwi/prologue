-- 편지 개봉 선택 — 받은 편지는 봉투(PENDING)로 도착하고, 열어야(OPENED) 내용·연락처가 보인다.
-- 거절(DECLINED)하면 받은 목록에서 조용히 사라진다. 보낸 사람에게는 알리지 않는다.
alter table mails add column status varchar(10) not null default 'PENDING';
-- 기능 도입 전에 이미 도착한 편지는 받은 쪽이 이미 읽었으므로 열린 상태로 남긴다.
update mails set status = 'OPENED';
