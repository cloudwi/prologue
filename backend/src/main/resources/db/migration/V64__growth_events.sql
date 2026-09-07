-- First-party, server-confirmed growth ledger. No free-form properties or relationship payloads.
create table growth_collection (
    id integer primary key check (id = 1),
    started_at timestamptz not null default now()
);
insert into growth_collection (id) values (1);
create table growth_events (
    id uuid primary key,
    account_id uuid not null references accounts(id) on delete cascade,
    event_name varchar(40) not null,
    dedup_key varchar(64) not null,
    occurred_at timestamptz not null,
    service_day date not null,
    schema_version integer not null default 1,
    unique (account_id, event_name, dedup_key)
);
create index ix_growth_event_time on growth_events(event_name, occurred_at, account_id);
create index ix_growth_account_day on growth_events(account_id, service_day, event_name);

create index ix_growth_connection_dedup on growth_events(dedup_key) where event_name = 'CONTACTS_EXCHANGED';
create index ix_growth_mail_time on mails(created_at);
