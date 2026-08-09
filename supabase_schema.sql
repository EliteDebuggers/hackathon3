-- Create users table (extends auth.users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('patient', 'doctor')),
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users
alter table public.users enable row level security;
create policy "Users can view their own profile." on public.users for select using (auth.uid() = id);
create policy "Doctors can view patients" on public.users for select using (
  exists (select 1 from public.users as doctor where doctor.id = auth.uid() and doctor.role = 'doctor')
  and role = 'patient'
);
create policy "Users can update their own profile." on public.users for update using (auth.uid() = id);
create policy "Users can insert their own profile." on public.users for insert with check (auth.uid() = id);

-- Create documents table
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  doctor_id uuid references public.users(id), -- Nullable, if uploaded by patient
  uploader_id uuid references public.users(id) not null,
  title text not null,
  file_url text not null,
  document_type text not null, -- 'lab_report', 'prescription', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on documents
alter table public.documents enable row level security;
-- Patients can view their own documents
create policy "Patients can view own documents" on public.documents for select using (auth.uid() = patient_id);
-- Doctors can view documents where they are the assigned doctor or uploader
create policy "Doctors can view relevant documents" on public.documents for select using (auth.uid() = doctor_id or auth.uid() = uploader_id);
-- Authenticated users can insert documents
create policy "Users can insert documents" on public.documents for insert with check (auth.uid() = uploader_id);

-- Setup Storage Bucket (run these only if you haven't created the bucket in the UI)
insert into storage.buckets (id, name, public) values ('medical-records', 'medical-records', true) on conflict do nothing;
create policy "Anyone can read medical records" on storage.objects for select using (bucket_id = 'medical-records');
create policy "Authenticated users can upload" on storage.objects for insert with check (bucket_id = 'medical-records' and auth.role() = 'authenticated');

-- Create consultation_briefs table for AI summaries
create table public.consultation_briefs (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id),
  authorized_doctor_id uuid references public.users(id),
  appointment_context text, -- The AI summary
  attached_document_ids uuid[], -- The specific docs the AI selected
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on consultation_briefs
alter table public.consultation_briefs enable row level security;
-- Patients can view their own briefs
create policy "Patients can view own briefs" on public.consultation_briefs for select using (auth.uid() = patient_id);
-- Doctors can view briefs authorized to them
create policy "Doctors can view authorized briefs" on public.consultation_briefs for select using (auth.uid() = authorized_doctor_id);
-- Patients can insert briefs
create policy "Patients can insert briefs" on public.consultation_briefs for insert with check (auth.uid() = patient_id);
