-- Create users table (extends auth.users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('patient', 'doctor')),
  full_name text,
  specialty text, -- Added for doctor specialty
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

-- Create appointments table
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  doctor_id uuid references public.users(id) not null,
  appointment_date date not null,
  appointment_time text not null,
  status text not null default 'pending', -- pending, confirmed, completed, cancelled
  remarks text,
  shared_document_ids uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on appointments
alter table public.appointments enable row level security;
create policy "Patients can view own appointments" on public.appointments for select using (auth.uid() = patient_id);
create policy "Doctors can view own appointments" on public.appointments for select using (auth.uid() = doctor_id);
create policy "Patients can insert appointments" on public.appointments for insert with check (auth.uid() = patient_id);

-- Create health_milestones table for Timeline tracking
create table public.health_milestones (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  actor_id uuid references public.users(id), -- Who caused it (patient or doctor)
  title text not null,
  description text,
  milestone_type text not null, -- appointment_booked, action_required, action_completed, doctor_note
  related_appointment_id uuid references public.appointments(id),
  status text not null default 'completed', -- pending, completed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.health_milestones enable row level security;
create policy "Patients can view own milestones" on public.health_milestones for select using (auth.uid() = patient_id);
create policy "Patients can insert milestones" on public.health_milestones for insert with check (auth.uid() = patient_id);
create policy "Doctors can insert milestones" on public.health_milestones for insert with check (true); -- simplify for hackathon
create policy "Patients can update milestones" on public.health_milestones for update using (auth.uid() = patient_id);

-- Create pending_document_uploads table
create table public.pending_document_uploads (
  id uuid default gen_random_uuid() primary key,
  doctor_id uuid references public.users(id) not null,
  patient_id uuid references public.users(id) not null,
  title text not null,
  file_url text not null,
  document_type text not null,
  status text not null default 'pending', -- pending, approved, rejected
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.pending_document_uploads enable row level security;
create policy "Patients can view pending uploads" on public.pending_document_uploads for select using (auth.uid() = patient_id);
create policy "Doctors can insert pending uploads" on public.pending_document_uploads for insert with check (auth.uid() = doctor_id);
create policy "Patients can update pending uploads" on public.pending_document_uploads for update using (auth.uid() = patient_id);

-- Added for Document Deletion Feature
create policy "Users can delete own documents" on public.documents for delete using (auth.uid() = uploader_id);
create policy "Users can delete own files" on storage.objects for delete using (bucket_id = 'medical-records' and auth.uid() = owner);

-- AI Chat Sessions
create table public.ai_chat_sessions (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  title text not null default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_chat_sessions enable row level security;
create policy "Patients can view own sessions" on public.ai_chat_sessions for select using (auth.uid() = patient_id);
create policy "Patients can insert own sessions" on public.ai_chat_sessions for insert with check (auth.uid() = patient_id);
create policy "Patients can delete own sessions" on public.ai_chat_sessions for delete using (auth.uid() = patient_id);

-- AI Chat Messages
create table public.ai_chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.ai_chat_sessions(id) on delete cascade not null,
  role text not null,
  content text not null,
  is_tool_call boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_chat_messages enable row level security;
create policy "Patients can view own messages" on public.ai_chat_messages for select using (
  exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.patient_id = auth.uid())
);
create policy "Patients can insert own messages" on public.ai_chat_messages for insert with check (
  exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.patient_id = auth.uid())
);

-- Add extracted text to documents
alter table public.documents add column if not exists extracted_text text;

