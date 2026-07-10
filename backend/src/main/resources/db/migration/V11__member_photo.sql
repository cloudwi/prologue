-- member: 대표 프로필 사진 (신원 공개형 피벗). 사진은 전용 업로드 엔드포인트에서 갱신.
alter table members add column photo_url varchar(500);
