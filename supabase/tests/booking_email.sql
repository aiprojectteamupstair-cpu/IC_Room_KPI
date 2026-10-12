-- Rollback-only verification; no email is sent by these SQL tests.
begin;
do $$
declare room uuid; receipt record; booking uuid; queued public.booking_emails; count_jobs integer;
begin
 insert into public.rooms(name,capacity,opening_time,closing_time,minimum_booking_minutes,maximum_booking_minutes,booking_interval_minutes)
 values('Email verification room',10,'09:00','17:00',60,360,30) returning id into room;
 select * into receipt from public.create_booking_request(room,'Email Test','09987654321',2,current_date+60,'09:00',60,'Other','',' TEST@EXAMPLE.COM ');
 select id into booking from public.bookings where reference=receipt.reference;
 if (select email from public.bookings where id=booking) <> 'test@example.com' then raise exception 'Email normalization failed'; end if;
 if exists(select 1 from public.booking_emails where booking_id=booking) then raise exception 'Pending request must not email a decision'; end if;
 update public.bookings set status='approved' where id=booking;
 update public.bookings set status='approved' where id=booking;
 select count(*) into count_jobs from public.booking_emails where booking_id=booking;
 if count_jobs<>1 then raise exception 'Duplicate or missing decision email'; end if;
 select * into queued from public.claim_booking_emails(booking);
 if queued.state<>'processing' or queued.lease_token is null then raise exception 'Missing delivery lease'; end if;
 if exists(select 1 from public.claim_booking_emails(booking)) then raise exception 'Concurrent worker can claim active lease'; end if;
 perform public.finish_booking_email(queued.id,queued.lease_token,false,'EAUTH');
 select * into queued from public.claim_booking_emails(booking);
 if queued.attempts<>2 then raise exception 'Failed job was not retryable'; end if;
 perform public.finish_booking_email(queued.id,queued.lease_token,true,null);
 if exists(select 1 from public.claim_booking_emails(booking)) then raise exception 'Sent email was queued again'; end if;
 select * into receipt from public.create_booking_request(room,'Reject Test','09987654322',2,current_date+60,'10:00',60,'Other','','reject@example.com');
 update public.bookings set status='rejected' where reference=receipt.reference;
 if not exists(select 1 from public.booking_emails where payload->>'reference'=receipt.reference and decision='rejected') then raise exception 'Rejection email missing'; end if;
 update public.rooms set approval_mode='automatic' where id=room;
 select * into receipt from public.create_booking_request(room,'Automatic Test','09987654323',2,current_date+60,'11:00',60,'Other','','auto@example.com');
 if not exists(select 1 from public.booking_emails where payload->>'reference'=receipt.reference and decision='approved') then raise exception 'Automatic approval email missing'; end if;
 if has_table_privilege('anon','public.booking_emails','select') then raise exception 'Anonymous users can read emails'; end if;
 if has_function_privilege('authenticated','public.claim_booking_emails(uuid)','execute') then raise exception 'Untrusted user can claim email jobs'; end if;
 if has_function_privilege('anon','public.create_booking_request(uuid,text,text,integer,date,time,integer,text,text,text)','execute') then raise exception 'Public caller can bypass submission validation'; end if;
end;
$$;
rollback;
