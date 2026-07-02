-- member: 프로필 풍부화 (자기소개·키·체형·취미/관심사/장점 키워드)
-- 키워드는 콤마 구분 문자열로 저장.

alter table members add column bio        varchar(200);
alter table members add column height_cm  int;
alter table members add column body_type  varchar(10);
alter table members add column hobbies    varchar(500);
alter table members add column interests  varchar(500);
alter table members add column strengths  varchar(500);
