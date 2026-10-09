-- Run with the migration owner (postgres). All times represent Asia/Yangon wall time.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path to public,extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create type public.booking_status as enum ('pending','approved','rejected','cancelled','completed');
create type public.app_role as enum ('admin','super_admin','staff','member');
create table public.rooms (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 2 and 100),
 description text not null default '' check(length(description)<=2000), capacity integer not null check(capacity>0),
 opening_time time not null, closing_time time not null,
 minimum_booking_minutes integer not null check(minimum_booking_minutes>0),
 maximum_booking_minutes integer not null,
 booking_interval_minutes integer not null check(booking_interval_minutes between 5 and 120),
 approval_mode text not null default 'manual' check(approval_mode in ('manual','automatic')),
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(opening_time<closing_time), check(maximum_booking_minutes>=minimum_booking_minutes),
 check(maximum_booking_minutes<=extract(epoch from (closing_time-opening_time))/60),
 check(minimum_booking_minutes % booking_interval_minutes = 0),
 check(maximum_booking_minutes % booking_interval_minutes = 0)
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null, role public.app_role not null default 'member',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create sequence private.booking_reference_seq;
create table public.bookings (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('IC-' || to_char(timezone('Asia/Yangon',now()),'YYYYMMDD') || '-' || upper(lpad(to_hex(nextval('private.booking_reference_seq')),6,'0'))),
 room_id uuid not null references public.rooms(id) on delete restrict,
 full_name text not null check(length(trim(full_name)) between 2 and 100),
 phone text not null check(phone ~ '^\+?[0-9][0-9 ()-]{6,19}$' and length(regexp_replace(phone,'[^0-9]','','g')) between 7 and 15),
 number_of_people integer not null check(number_of_people>0), booking_date date not null,
 start_time time not null, end_time time not null, duration_minutes integer not null check(duration_minutes>0),
 purpose text not null default 'Other' check(purpose in ('Startup Meeting','Workshop','Technical Training','Community Meeting','Presentation','Interview','Project Discussion','Other')),
 notes text not null default '' check(length(notes)<=1000), status public.booking_status not null default 'pending',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 approved_at timestamptz, approved_by uuid references auth.users(id), rejected_at timestamptz, cancelled_at timestamptz,
 check(start_time<end_time), check(duration_minutes=extract(epoch from (end_time-start_time))/60)
);
create table public.room_blocks (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete restrict,
 block_date date not null, start_time time not null, end_time time not null,
 reason text not null check(length(reason) between 2 and 100), notes text not null default '' check(length(notes)<=1000),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), check(start_time<end_time)
);
create table public.booking_history (
 id bigint generated always as identity primary key, booking_id uuid not null references public.bookings(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, action text not null,
 old_data jsonb, new_data jsonb, created_at timestamptz not null default now()
);
-- Shared ledger guarantees cross-table conflicts are impossible. Half-open intervals allow adjacent bookings.
create table private.reservations (
 source_id uuid primary key, source_type text not null check(source_type in ('booking','block')),
 room_id uuid not null references public.rooms(id), occupied tsrange not null,
 exclude using gist (room_id with =, occupied with &&)
);
create index bookings_date_idx on public.bookings(booking_date);
create index bookings_status_idx on public.bookings(status);
create index bookings_phone_idx on public.bookings(phone);
create index bookings_room_date_status_idx on public.bookings(room_id,booking_date,status);
create index bookings_created_idx on public.bookings(created_at desc);
create index blocks_room_date_idx on public.room_blocks(room_id,block_date);
create index history_booking_idx on public.booking_history(booking_id,created_at desc);

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('admin','super_admin'));
$$;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create function private.touch_updated() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger rooms_updated before update on public.rooms for each row execute function private.touch_updated();
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated();

create function private.booking_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.rooms; should_validate boolean;
begin
 -- Lock settings before checking to serialize configuration changes and reservation writes.
 if TG_OP='UPDATE' then
   perform id from public.rooms where id in (old.room_id,new.room_id) order by id for update;
 else perform id from public.rooms where id=new.room_id for update; end if;
 select * into r from public.rooms where id=new.room_id;
 if not found then raise exception 'Room not found'; end if;
 if TG_OP='UPDATE' then
   if old.status<>new.status and not (
     (old.status='pending' and new.status in ('approved','rejected','cancelled')) or
     (old.status='approved' and new.status in ('completed','cancelled'))
   ) then raise exception 'Invalid booking status transition'; end if;
   if old.status in ('completed','rejected','cancelled') and new is distinct from old then raise exception 'This booking is read-only'; end if;
   should_validate = (old.room_id,old.booking_date,old.start_time,old.end_time,old.number_of_people) is distinct from (new.room_id,new.booking_date,new.start_time,new.end_time,new.number_of_people);
 else should_validate=true; end if;
 if should_validate then
   if not r.is_active then raise exception 'Room is inactive'; end if;
   if new.number_of_people>r.capacity then raise exception 'Room capacity exceeded'; end if;
   if new.start_time<r.opening_time or new.end_time>r.closing_time then raise exception 'Outside room operating hours'; end if;
   if new.duration_minutes<r.minimum_booking_minutes or new.duration_minutes>r.maximum_booking_minutes or new.duration_minutes % r.booking_interval_minutes<>0 then raise exception 'Invalid booking duration'; end if;
   if mod(extract(epoch from (new.start_time-r.opening_time))::integer, r.booking_interval_minutes*60)<>0 then raise exception 'Invalid booking interval'; end if;
   if new.status in ('pending','approved') and (new.booking_date+new.start_time)<=timezone('Asia/Yangon',now()) then raise exception 'Cannot book in the past'; end if;
 end if;
 if new.status='completed' and (new.booking_date+new.end_time)>timezone('Asia/Yangon',now()) then raise exception 'Booking has not ended yet'; end if;
 if TG_OP='UPDATE' then
   if new.status='approved' and old.status<>'approved' then new.approved_at=now(); new.approved_by=auth.uid(); end if;
   if new.status='rejected' and old.status<>'rejected' then new.rejected_at=now(); end if;
   if new.status='cancelled' and old.status<>'cancelled' then new.cancelled_at=now(); end if;
 end if;
 if TG_OP='INSERT' and new.status='approved' then new.approved_at=now(); new.approved_by=auth.uid(); end if;
 new.updated_at=now();
 delete from private.reservations where source_id=new.id;
 if new.status in ('pending','approved','completed') then
   insert into private.reservations values(new.id,'booking',new.room_id,tsrange(new.booking_date+new.start_time,new.booking_date+new.end_time,'[)'));
 end if;
 return new;
end;
$$;
create trigger booking_guard before insert or update on public.bookings for each row execute function private.booking_guard();

create function private.booking_deleted() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from private.reservations where source_id=old.id; return old; end;
$$;
create trigger booking_deleted after delete on public.bookings for each row execute function private.booking_deleted();

create function private.block_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.rooms;
begin
 if TG_OP='DELETE' then delete from private.reservations where source_id=old.id; return old; end if;
 if TG_OP='UPDATE' then perform id from public.rooms where id in(old.room_id,new.room_id) order by id for update;
 else perform id from public.rooms where id=new.room_id for update; end if;
 select * into r from public.rooms where id=new.room_id;
 if new.start_time<r.opening_time or new.end_time>r.closing_time then raise exception 'Block must be within operating hours'; end if;
 delete from private.reservations where source_id=new.id;
 insert into private.reservations values(new.id,'block',new.room_id,tsrange(new.block_date+new.start_time,new.block_date+new.end_time,'[)'));
 return new;
end;
$$;
create trigger block_guard before insert or update or delete on public.room_blocks for each row execute function private.block_guard();

create function private.audit_booking() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.booking_history(booking_id,actor_id,action,old_data,new_data)
 values(new.id,auth.uid(),case when TG_OP='INSERT' then 'created' when old.status<>new.status then new.status::text else 'edited' end,
 case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end;
$$;
create trigger audit_booking after insert or update on public.bookings for each row execute function private.audit_booking();

create function private.room_settings_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.bookings b where b.room_id=new.id and b.booking_date >= timezone('Asia/Yangon',now())::date and b.status in ('pending','approved') and
 (b.start_time<new.opening_time or b.end_time>new.closing_time or b.number_of_people>new.capacity or b.duration_minutes<new.minimum_booking_minutes or b.duration_minutes>new.maximum_booking_minutes or b.duration_minutes%new.booking_interval_minutes<>0 or mod(extract(epoch from(b.start_time-new.opening_time))::integer,new.booking_interval_minutes*60)<>0))
 then raise exception 'Settings conflict with existing upcoming reservations'; end if;
 if exists(select 1 from public.room_blocks b where b.room_id=new.id and b.block_date>=timezone('Asia/Yangon',now())::date and (b.start_time<new.opening_time or b.end_time>new.closing_time)) then raise exception 'Settings conflict with upcoming blocks'; end if;
 return new;
end;
$$;
create trigger settings_guard before update on public.rooms for each row execute function private.room_settings_guard();

alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.room_blocks enable row level security;
alter table public.profiles enable row level security;
alter table public.booking_history enable row level security;
alter table private.reservations enable row level security;
create policy rooms_public on public.rooms for select to anon,authenticated using(is_active);
create policy rooms_admin on public.rooms for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy bookings_admin_read on public.bookings for select to authenticated using(private.is_admin());
create policy bookings_admin_insert on public.bookings for insert to authenticated with check(private.is_admin());
create policy bookings_admin_update on public.bookings for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy blocks_admin on public.room_blocks for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy profiles_own_read on public.profiles for select to authenticated using(id=auth.uid() or private.is_admin());
create policy history_admin on public.booking_history for select to authenticated using(private.is_admin());
revoke all on public.bookings, public.room_blocks, public.profiles, public.booking_history from anon,authenticated;
grant select,insert,update on public.bookings to authenticated;
grant select,insert,update,delete on public.room_blocks to authenticated;
grant select on public.profiles,public.booking_history to authenticated;
grant select on public.rooms to anon,authenticated;
grant insert,update on public.rooms to authenticated;
-- Profiles can only be provisioned by an operator. No self-service role escalation.

-- Deliberately narrow SECURITY DEFINER RPCs; fixed search_path and explicit EXECUTE grants.
create function public.public_schedule(p_room_id uuid,p_from date,p_to date)
returns table(room_id uuid,booking_date date,start_time time,end_time time,purpose text,status text)
language sql stable security definer set search_path='' as $$
 select b.room_id,b.booking_date,b.start_time,b.end_time,b.purpose,b.status::text from public.bookings b
 join public.rooms r on r.id=b.room_id where r.is_active and b.room_id=p_room_id and b.booking_date between p_from and least(p_to,p_from+366) and b.status in ('approved','completed')
 union all
 select b.room_id,b.block_date,b.start_time,b.end_time,'Unavailable','blocked' from public.room_blocks b
 join public.rooms r on r.id=b.room_id where r.is_active and b.room_id=p_room_id and b.block_date between p_from and least(p_to,p_from+366);
$$;
create function public.busy_slots(p_room_id uuid,p_date date)
returns table(start_time time,end_time time) language sql stable security definer set search_path='' as $$
 select b.start_time,b.end_time from public.bookings b join public.rooms r on r.id=b.room_id
 where r.is_active and b.room_id=p_room_id and b.booking_date=p_date and b.status in('pending','approved','completed')
 union all select b.start_time,b.end_time from public.room_blocks b join public.rooms r on r.id=b.room_id where r.is_active and b.room_id=p_room_id and b.block_date=p_date;
$$;
create function public.create_booking_request(p_room_id uuid,p_full_name text,p_phone text,p_people integer,p_date date,p_start time,p_minutes integer,p_purpose text,p_notes text)
returns table(reference text,booking_date date,start_time time,end_time time,duration_minutes integer,number_of_people integer,status public.booking_status)
language plpgsql security definer set search_path='' as $$
declare b public.bookings; r public.rooms;
begin
 select * into r from public.rooms where id=p_room_id for update;
 if not found or not r.is_active then raise exception 'Room unavailable'; end if;
 if p_minutes is null or p_minutes<=0 or p_minutes>r.maximum_booking_minutes then raise exception 'Invalid booking duration'; end if;
 if p_date+ p_start <= timezone('Asia/Yangon',now()) then raise exception 'Cannot book in the past'; end if;
 if (select count(*) from public.bookings where regexp_replace(phone,'[^0-9]','','g')=regexp_replace(p_phone,'[^0-9]','','g') and created_at>now()-interval '10 minutes')>=3 then raise exception 'Too many requests. Please try again later'; end if;
 insert into public.bookings(room_id,full_name,phone,number_of_people,booking_date,start_time,end_time,duration_minutes,purpose,notes,status)
 values(p_room_id,trim(p_full_name),trim(p_phone),p_people,p_date,p_start,p_start+make_interval(mins=>p_minutes),p_minutes,p_purpose,coalesce(p_notes,''),case when r.approval_mode='automatic' then 'approved'::public.booking_status else 'pending'::public.booking_status end) returning * into b;
 return query select b.reference,b.booking_date,b.start_time,b.end_time,b.duration_minutes,b.number_of_people,b.status;
end;
$$;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_admin() to authenticated;
revoke all on function public.public_schedule(uuid,date,date),public.busy_slots(uuid,date),public.create_booking_request(uuid,text,text,integer,date,time,integer,text,text) from public,anon,authenticated;
grant execute on function public.public_schedule(uuid,date,date),public.busy_slots(uuid,date) to anon,authenticated;
-- Only the server may submit public requests; callers never receive private fields or UUIDs.
grant execute on function public.create_booking_request(uuid,text,text,integer,date,time,integer,text,text) to service_role;
grant usage on schema private to service_role;
grant usage,select on sequence private.booking_reference_seq to service_role,authenticated;

-- Admin-only row subscriptions obey SELECT RLS. Public clients use narrow RPC polling.
do $$
declare table_name text;
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach table_name in array array['bookings','room_blocks','rooms'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
    execute format('alter publication supabase_realtime add table public.%I',table_name);
   end if;
  end loop;
 end if;
end $$;
