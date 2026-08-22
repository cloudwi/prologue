-- 커버 사진 여러 장 — 첫 장이 목록에 보이는 메인. 프로필 사진과 같은 콤마 조인 저장.
alter table meetups add column cover_urls text;
update meetups set cover_urls = cover_url where cover_url is not null;
alter table meetups drop column cover_url;
