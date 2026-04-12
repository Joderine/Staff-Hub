-- Run this in Supabase SQL Editor for the StaffHub project

-- Staff profiles (linked to Supabase Auth users)
create table if not exists staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  clinic text not null check (clinic in ('MAH', 'HPVC', 'Both')),
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz default now()
);

alter table staff_profiles enable row level security;
create policy "Staff can read own profile" on staff_profiles for select using (auth.uid() = id);
create policy "Admin can do everything on profiles" on staff_profiles for all using (
  exists (select 1 from staff_profiles where id = auth.uid() and role = 'admin')
);

-- Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  file_name text not null,
  storage_path text not null,
  title text not null,
  description text,
  category text not null default 'General',
  clinic text not null check (clinic in ('MAH', 'HPVC', 'Both')),
  uploaded_by uuid references auth.users(id)
);

alter table documents enable row level security;

-- Staff can only see documents for their clinic or Both
create policy "Staff see their clinic docs" on documents for select using (
  clinic = 'Both' or
  clinic = (select clinic from staff_profiles where id = auth.uid()) or
  (select clinic from staff_profiles where id = auth.uid()) = 'Both'
);

-- Only admins can insert/update/delete documents
create policy "Admin manages documents" on documents for all using (
  exists (select 1 from staff_profiles where id = auth.uid() and role = 'admin')
);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('staff-docs', 'staff-docs', false)
on conflict do nothing;

create policy "Authenticated users can read staff-docs" on storage.objects
for select using (bucket_id = 'staff-docs' and auth.role() = 'authenticated');

create policy "Admin can upload staff-docs" on storage.objects
for insert with check (bucket_id = 'staff-docs' and auth.role() = 'authenticated');

create policy "Admin can delete staff-docs" on storage.objects
for delete using (bucket_id = 'staff-docs' and auth.role() = 'authenticated');
