-- member: 대표 사진 1장 → 사진 목록(최소 2장·최대 6장, 콤마 조인)으로 확장
-- 기존 단일 photo_url 데이터는 목록의 첫 항목으로 이관한다.

alter table members add column photo_urls text;
update members set photo_urls = photo_url where photo_url is not null;
alter table members drop column photo_url;
