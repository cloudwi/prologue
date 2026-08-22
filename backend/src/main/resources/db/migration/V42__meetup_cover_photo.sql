-- 모임 커버 사진 — 이모지/색 커버 위에 사진 선택지를 얹는다.
-- 업로드 시 선정성 검사(unsafe)만 건다. 얼굴 요구는 프로필 사진의 것.
alter table meetups add column cover_url varchar(500);
