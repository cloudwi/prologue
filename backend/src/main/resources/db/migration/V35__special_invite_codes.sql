-- 특별 초대 코드 — 운영자가 만든 코드 하나를 여러 사람에게 뿌린다(지인 초대). 보상은 코드에 적힌 값.
-- 개인 코드는 보상 열이 null이라 코드의 기본값(InkPrice.REFERRAL)을 쓴다.
-- 한 계정이 개인 코드와 특별 코드를 함께 가질 수 있으므로 기본키를 account_id에서 id로 옮긴다.
alter table invite_codes add column id uuid;
update invite_codes set id = gen_random_uuid();
alter table invite_codes alter column id set not null;
alter table invite_codes drop constraint invite_codes_pkey;
alter table invite_codes add primary key (id);
create index invite_codes_account_idx on invite_codes (account_id);

alter table invite_codes
    add column kind           varchar(16) not null default 'PERSONAL',
    add column invitee_reward integer,
    add column inviter_reward integer,
    add column max_uses       integer;
alter table invite_codes alter column code type varchar(20);

-- 어떤 코드로 들어왔는지 — 특별 코드의 사용 횟수를 세고, 나중에 어느 경로가 사람을 데려왔는지 본다.
alter table referrals add column code varchar(20);
create index referrals_code_idx on referrals (code);
