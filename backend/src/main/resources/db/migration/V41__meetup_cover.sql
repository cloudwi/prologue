-- 모임 꾸미기 — 이모지 + 색 커버. 사진 업로드는 검수 부담이 생겨 받지 않는다.
-- 색은 앱이 큐레이션한 팔레트에서 고르지만, 저장은 hex 형식이면 허용한다.
alter table meetups add column emoji varchar(8);
alter table meetups add column color varchar(7);
