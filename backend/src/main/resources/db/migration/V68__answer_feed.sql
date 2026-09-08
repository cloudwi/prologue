create table feed_posts (
    id uuid primary key,
    author_account_id uuid not null,
    source_type varchar(20) not null,
    source_key varchar(80) not null,
    prompt varchar(500) not null,
    content varchar(1000) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint feed_posts_source_type_check check (source_type in ('DAILY', 'TASTE')),
    constraint feed_posts_author_source_unique unique (author_account_id, source_type, source_key)
);

create index feed_posts_latest_idx on feed_posts (created_at desc, id desc);
create index feed_posts_author_idx on feed_posts (author_account_id);

create table feed_post_hearts (
    post_id uuid not null references feed_posts(id) on delete cascade,
    account_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (post_id, account_id)
);

create index feed_post_hearts_account_idx on feed_post_hearts (account_id);
