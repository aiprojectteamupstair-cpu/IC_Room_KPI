-- Run as postgres on a staging Supabase project after the migration.
-- Rolls back all test data. Errors mean an invariant failed.
begin;
do $$
declare r uuid=gen_random_uuid(); b uuid; date_to_test date=(timezone('Asia/Yangon',now())::date+100); denied boolean; count_safe integer;
begin
 insert into public.rooms(id,name,capacity,opening_time,closing_time,minimum_booking_minutes,maximum_booking_minutes,booking_interval_minutes)
 values(r,'Constraint test room',30,'09:00','18:00',60,360,30);
 insert into public.bookings(room_id,full_name,phone,number_of_people,booking_date,start_time,end_time,duration_minutes,status)
 values(r,'Test Person','09123456789',10,date_to_test,'10:00','12:00',120,'pending') returning id into b;
 denied=false;
 begin
  insert into public.bookings(room_id,full_name,phone,number_of_people,booking_date,start_time,end_time,duration_minutes)
  values(r,'Conflict Test','09123456789',10,date_to_test,'11:00','13:00',120);
 exception when exclusion_violation then denied=true; end;
 if not denied then raise exception 'FAIL: overlapping pending request was accepted'; end if;
 -- Adjacent intervals must succeed.
 insert into public.bookings(room_id,full_name,phone,number_of_people,booking_date,start_time,end_time,duration_minutes,status)
 values(r,'Adjacent Test','09123456789',10,date_to_test,'12:00','13:00',60,'approved');
 denied=false;
 begin insert into public.room_blocks(room_id,block_date,start_time,end_time,reason) values(r,date_to_test,'11:00','12:00','Conflict');
 exception when exclusion_violation then denied=true; end;
 if not denied then raise exception 'FAIL: block overlapped pending reservation'; end if;
 insert into public.room_blocks(room_id,block_date,start_time,end_time,reason) values(r,date_to_test,'13:00','14:00','Maintenance');
 denied=false;
 begin insert into public.bookings(room_id,full_name,phone,number_of_people,booking_date,start_time,end_time,duration_minutes)
 values(r,'Block Conflict','09123456789',10,date_to_test,'13:00','14:00',60);
 exception when exclusion_violation then denied=true; end;
 if not denied then raise exception 'FAIL: booking overlapped a block'; end if;
 denied=false;
 begin update public.bookings set end_time='13:00',duration_minutes=180 where id=b;
 exception when exclusion_violation then denied=true; end;
 if not denied then raise exception 'FAIL: edit overlapped adjacent booking'; end if;
 update public.bookings set status='cancelled' where id=b;
 insert into public.bookings(room_id,full_name,phone,number_of_people,booking_date,start_time,end_time,duration_minutes)
 values(r,'Released Test','09123456789',10,date_to_test,'10:00','12:00',120);
 denied=false;
 begin update public.rooms set closing_time='12:00',maximum_booking_minutes=180 where id=r;
 exception when raise_exception then denied=true; end;
 if not denied then raise exception 'FAIL: invalidating room settings were accepted'; end if;
 select count(*) into count_safe from public.public_schedule(r,date_to_test,date_to_test);
 if count_safe<>2 then raise exception 'FAIL: schedule must include only approved reservation and block'; end if;
 if has_table_privilege('anon','public.bookings','SELECT') then raise exception 'FAIL: anonymous bookings read grant'; end if;
 if has_table_privilege('anon','public.bookings','INSERT') then raise exception 'FAIL: anonymous direct bookings insert grant'; end if;
 if has_function_privilege('anon','public.create_booking_request(uuid,text,text,integer,date,time without time zone,integer,text,text)','EXECUTE') then raise exception 'FAIL: anonymous creation RPC grant'; end if;
 if has_table_privilege('authenticated','public.profiles','UPDATE') then raise exception 'FAIL: self-service profile write grant'; end if;
 raise notice 'PASS: booking/block conflicts, adjacency, edits, release, settings, public schedule and grants';
end $$;
rollback;
