insert into public.rooms(id,name,description,capacity,opening_time,closing_time,minimum_booking_minutes,maximum_booking_minutes,booking_interval_minutes)
values('11111111-1111-4111-8111-111111111111','Innovation Centre Main Room','A space for ambitious ideas. Collaborate, learn and build with your community.',10,'09:00','17:00',60,360,30)
on conflict(id) do nothing;
