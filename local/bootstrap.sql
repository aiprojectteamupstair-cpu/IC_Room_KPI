-- Only for a standalone local development cluster. Hosted Supabase supplies these roles/schema.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(),email text not null unique,password_hash text not null,session_version integer not null default 1);
alter table auth.users add column if not exists failed_attempts integer not null default 0;
alter table auth.users add column if not exists last_failed_at timestamptz;
alter table auth.users add column if not exists locked_until timestamptz;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create schema if not exists extensions;
