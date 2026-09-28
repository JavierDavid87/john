-- Run this ONCE in Supabase > SQL Editor
create table files(
  id bigint generated always as identity primary key,
  cat text not null, name text not null, type text, size bigint,
  path text not null, created_at timestamptz default now());
create table settings(key text primary key, value text);

alter table files enable row level security;
alter table settings enable row level security;
create policy "public files" on files for all using (true) with check (true);
create policy "public settings" on settings for all using (true) with check (true);

insert into storage.buckets (id,name,public) values ('portfolio','portfolio',true) on conflict do nothing;
create policy "public read"   on storage.objects for select using (bucket_id='portfolio');
create policy "public upload" on storage.objects for insert with check (bucket_id='portfolio');
create policy "public delete" on storage.objects for delete using (bucket_id='portfolio');
