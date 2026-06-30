-- member 컨텍스트: 프로필(Member) 스키마. account_id로 계정과 1:1.

create table members (
    account_id       uuid         primary key,
    nickname         varchar(30)  not null,
    gender           varchar(10)  not null,
    birth_year       int          not null,
    preferred_gender varchar(10)  not null,
    region           varchar(50)  not null,
    created_at       timestamptz  not null
);
