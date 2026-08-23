-- 도로명 주소 — 주소 검색으로만 입력받는다. 지도 링크(네이버·카카오)는
-- 저장하지 않고 이 주소로 화면이 그때그때 만든다(딥링크는 결정적이다).
alter table meetups add column place_address varchar(200);
