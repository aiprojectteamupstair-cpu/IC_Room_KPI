-- Anonymous occupied ranges contain no request status, identity, purpose or notes.
create function public.unavailable_ranges(p_room_id uuid,p_from date,p_to date)
returns table(booking_date date,start_time time,end_time time)
language sql stable security definer set search_path='' as $$
 select lower(s.occupied)::date,lower(s.occupied)::time,upper(s.occupied)::time
 from private.reservations s join public.rooms r on r.id=s.room_id
 where r.is_active and s.room_id=p_room_id and lower(s.occupied)::date between p_from and least(p_to,p_from+366);
$$;
revoke all on function public.unavailable_ranges(uuid,date,date) from public,anon,authenticated;
grant execute on function public.unavailable_ranges(uuid,date,date) to anon,authenticated,service_role;
