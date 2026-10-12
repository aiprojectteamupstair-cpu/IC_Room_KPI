-- Preserve UUID foreign keys; expose a short, stable code to people and URLs.
alter table public.rooms add column room_number bigint generated always as identity;
alter table public.rooms add column room_code text generated always as
 ('IC-' || lpad(room_number::text, greatest(3,length(room_number::text)), '0')) stored;
alter table public.rooms add constraint rooms_room_code_unique unique(room_code);
grant usage,select on sequence public.rooms_room_number_seq to authenticated,service_role;

-- Legacy bookings retain NULL rather than inventing customer addresses.
alter table public.bookings add column email text;
alter table public.bookings add constraint bookings_email_valid check
 (email is null or (length(email)<=254 and email=lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

create table public.booking_emails (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 recipient text not null,
 decision text not null check(decision in ('approved','rejected')),
 payload jsonb not null,
 state text not null default 'pending' check(state in ('pending','processing','sent','failed')),
 attempts integer not null default 0,
 lease_token uuid, locked_at timestamptz, sent_at timestamptz, last_error text,
 created_at timestamptz not null default now(),
 unique(booking_id,decision)
);
alter table public.booking_emails enable row level security;
revoke all on public.booking_emails from public,anon,authenticated;
grant select on public.booking_emails to authenticated;
create policy booking_emails_admin_read on public.booking_emails for select to authenticated using(private.is_admin());
grant select,insert,update,delete on public.booking_emails to service_role;

-- Transactional outbox: only genuine decisions with an address queue a message.
create function private.queue_booking_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare changed boolean;
begin
 if TG_OP='INSERT' then changed:=true;
 else changed:=new.status is distinct from old.status or (old.email is null and new.email is not null);
 end if;
 if changed and new.status in ('approved','rejected') and new.email is not null then
   insert into public.booking_emails(booking_id,recipient,decision,payload)
   select new.id,new.email,new.status::text,jsonb_build_object(
     'reference',new.reference,'full_name',new.full_name,'room_name',r.name,'room_code',r.room_code,
     'booking_date',new.booking_date,'start_time',new.start_time,'end_time',new.end_time,'number_of_people',new.number_of_people)
   from public.rooms r where r.id=new.room_id
   on conflict(booking_id,decision) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.queue_booking_email() from public,anon,authenticated,service_role;
create trigger queue_booking_email after insert or update on public.bookings
for each row execute function private.queue_booking_email();

-- Keep the existing nine-argument RPC for older deployments during rollout.
-- The new ten-argument overload validates email and updates it in the same transaction.
create function public.create_booking_request(
 p_room_id uuid,p_full_name text,p_phone text,p_people integer,p_date date,p_start time,
 p_minutes integer,p_purpose text,p_notes text,p_email text)
returns table(reference text,booking_date date,start_time time,end_time time,duration_minutes integer,number_of_people integer,status public.booking_status)
language plpgsql security definer set search_path='' as $$
declare receipt record; normalized text:=lower(trim(p_email));
begin
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
   raise exception 'Enter a valid email address';
 end if;
 select * into receipt from public.create_booking_request(p_room_id,p_full_name,p_phone,p_people,p_date,p_start,p_minutes,p_purpose,p_notes);
 update public.bookings b set email=normalized where b.reference=receipt.reference;
 return query select receipt.reference,receipt.booking_date,receipt.start_time,receipt.end_time,receipt.duration_minutes,receipt.number_of_people,receipt.status;
end;
$$;
revoke all on function public.create_booking_request(uuid,text,text,integer,date,time,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.create_booking_request(uuid,text,text,integer,date,time,integer,text,text,text) to service_role;

-- Only the trusted server can lease and acknowledge delivery jobs.
create function public.claim_booking_emails(p_booking_id uuid) returns setof public.booking_emails
language sql volatile security invoker set search_path='' as $$
 with candidates as (
   select id from public.booking_emails
   where booking_id=p_booking_id and (state in ('pending','failed') or (state='processing' and locked_at<now()-interval '5 minutes'))
   order by created_at limit 1 for update skip locked
 )
 update public.booking_emails e set state='processing',lease_token=gen_random_uuid(),locked_at=now(),attempts=attempts+1
 from candidates c where e.id=c.id returning e.*;
$$;
create function public.finish_booking_email(p_id uuid,p_token uuid,p_sent boolean,p_error text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 update public.booking_emails set state=case when p_sent then 'sent' else 'failed' end,
 sent_at=case when p_sent then now() else null end,last_error=case when p_sent then null else left(p_error,30) end,
 lease_token=null,locked_at=null where id=p_id and lease_token=p_token and state='processing';
 if not found then raise exception 'Email lease expired'; end if;
end;
$$;
revoke all on function public.claim_booking_emails(uuid),public.finish_booking_email(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_booking_emails(uuid),public.finish_booking_email(uuid,uuid,boolean,text) to service_role;
