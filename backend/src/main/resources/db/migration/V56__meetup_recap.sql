-- 모임 후기 — 끝난 뒤에 모임장이 남기는 기록.
--
-- 지금까지 지난 모임은 앱에서 한 줄이었다: 제목 / 날짜·장소 / N명 참여. 그건 "열리긴 했다"는
-- 사실일 뿐이고, 손들지 말지 고민하는 사람이 알고 싶은 것 — 가면 무엇을 하게 되는가 — 은
-- 거기 없다. 후기는 그 자리를 메운다.
--
-- 소개(description)와 같은 평문+표시 문법을 쓴다. `[사진1]`, `[사진1:50]`, `[사진1:50:1200x900]`.
-- 그래서 콘솔의 편집기도, 초대장의 조판도 그대로 재사용된다.
alter table meetups add column if not exists recap text;
alter table meetups add column if not exists recap_image_urls text;

-- 후기도 심사를 받는다.
--
-- 모임 본문을 심사하는 이유가 그대로 여기에도 있다. 후기는 우리 이름으로 나가는 공개 글이고,
-- 사람 얼굴이 담긴 사진이 붙는다. 모임 개설을 다른 사람에게 여는 순간 특히 그렇다.
--
-- 모임의 status와 따로 두는 이유: 끝난 모임을 심사 대기로 되돌릴 수는 없다. 개최된 사실은
-- 심사 대상이 아니고, 심사 대상은 그 뒤에 붙는 글이다.
--
-- NONE(아직 안 썼음) → PENDING(심사 중) → APPROVED(공개) / REJECTED(반려).
-- 고쳐 쓰면 다시 PENDING이 된다 — 승인은 그때 읽은 그 글에 준 것이다.
alter table meetups add column if not exists recap_status varchar(20) not null default 'NONE';
alter table meetups add column if not exists recap_review_note varchar(300);

comment on column meetups.recap is '모임 후기 글(평문). [사진N] 표시는 recap_image_urls를 가리킨다';
comment on column meetups.recap_image_urls is '후기 사진 URL 목록(쉼표 구분)';
comment on column meetups.recap_status is 'NONE|PENDING|APPROVED|REJECTED — 승인된 후기만 공개된다';
comment on column meetups.recap_review_note is '후기 반려 사유';
