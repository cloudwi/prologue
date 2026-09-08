alter table members
    add column contact_frequency varchar(20);

comment on column members.contact_frequency is '선호 연락 빈도 FREQUENT/DAILY/FEW_TIMES_WEEK/FLEXIBLE. null은 안 고름';
