-- Supabase sets service_role grants by default; reproduce those locally.
grant usage on schema public,private to service_role;
grant all on all tables in schema public,private to service_role;
grant usage,select on all sequences in schema public,private to service_role;
grant execute on all functions in schema public to service_role;
