-- =============================================
-- Swasth+ Complete Database Schema (with fixes)
-- Copy-paste this entire file into Supabase SQL Editor and run it.
-- =============================================

-- ========== USERS ==========
CREATE TABLE IF NOT EXISTS public.users (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('patient', 'doctor')),
  full_name text,
  specialty text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "Doctors can view patients" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.users;

CREATE POLICY "Authenticated users can view all profiles" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile." ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- ========== DOCUMENTS ==========
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  doctor_id uuid references public.users(id),
  uploader_id uuid references public.users(id) not null,
  title text not null,
  file_url text not null,
  document_type text not null,
  extracted_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Doctors can view relevant documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

CREATE POLICY "Patients can view own documents" ON public.documents FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors can view relevant documents" ON public.documents FOR SELECT USING (auth.uid() = doctor_id or auth.uid() = uploader_id);
CREATE POLICY "Users can insert documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = uploader_id);

-- ========== STORAGE ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-records', 'medical-records', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read medical records" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Anyone can read medical records" ON storage.objects FOR SELECT USING (bucket_id = 'medical-records');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medical-records' and auth.role() = 'authenticated');
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'medical-records' and auth.uid() = owner);

-- ========== CONSULTATION BRIEFS ==========
CREATE TABLE IF NOT EXISTS public.consultation_briefs (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id),
  authorized_doctor_id uuid references public.users(id),
  appointment_context text,
  attached_document_ids uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.consultation_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own briefs" ON public.consultation_briefs;
DROP POLICY IF EXISTS "Doctors can view authorized briefs" ON public.consultation_briefs;
DROP POLICY IF EXISTS "Patients can insert briefs" ON public.consultation_briefs;

CREATE POLICY "Patients can view own briefs" ON public.consultation_briefs FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors can view authorized briefs" ON public.consultation_briefs FOR SELECT USING (auth.uid() = authorized_doctor_id);
CREATE POLICY "Patients can insert briefs" ON public.consultation_briefs FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ========== APPOINTMENTS ==========
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  doctor_id uuid references public.users(id) not null,
  appointment_date date not null,
  appointment_time text not null,
  status text not null default 'pending',
  remarks text,
  shared_document_ids uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can insert appointments" ON public.appointments;

CREATE POLICY "Patients can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Patients can insert appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ========== HEALTH MILESTONES ==========
CREATE TABLE IF NOT EXISTS public.health_milestones (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  actor_id uuid references public.users(id),
  title text not null,
  description text,
  milestone_type text not null,
  related_appointment_id uuid references public.appointments(id),
  status text not null default 'completed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.health_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own milestones" ON public.health_milestones;
DROP POLICY IF EXISTS "Patients can insert milestones" ON public.health_milestones;
DROP POLICY IF EXISTS "Doctors can insert milestones" ON public.health_milestones;
DROP POLICY IF EXISTS "Patients can update milestones" ON public.health_milestones;

CREATE POLICY "Patients can view own milestones" ON public.health_milestones FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients can insert milestones" ON public.health_milestones FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors can insert milestones" ON public.health_milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Patients can update milestones" ON public.health_milestones FOR UPDATE USING (auth.uid() = patient_id);

-- ========== PENDING DOCUMENT UPLOADS ==========
CREATE TABLE IF NOT EXISTS public.pending_document_uploads (
  id uuid default gen_random_uuid() primary key,
  doctor_id uuid references public.users(id) not null,
  patient_id uuid references public.users(id) not null,
  title text not null,
  file_url text not null,
  document_type text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.pending_document_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view pending uploads" ON public.pending_document_uploads;
DROP POLICY IF EXISTS "Doctors can insert pending uploads" ON public.pending_document_uploads;
DROP POLICY IF EXISTS "Patients can update pending uploads" ON public.pending_document_uploads;

CREATE POLICY "Patients can view pending uploads" ON public.pending_document_uploads FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors can insert pending uploads" ON public.pending_document_uploads FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Patients can update pending uploads" ON public.pending_document_uploads FOR UPDATE USING (auth.uid() = patient_id);

-- ========== AI CHAT SESSIONS ==========
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.users(id) not null,
  title text not null default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Patients can insert own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Patients can delete own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Patients can update own sessions" ON public.ai_chat_sessions;

CREATE POLICY "Patients can view own sessions" ON public.ai_chat_sessions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients can insert own sessions" ON public.ai_chat_sessions FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can delete own sessions" ON public.ai_chat_sessions FOR DELETE USING (auth.uid() = patient_id);
CREATE POLICY "Patients can update own sessions" ON public.ai_chat_sessions FOR UPDATE USING (auth.uid() = patient_id);

-- ========== AI CHAT MESSAGES ==========
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.ai_chat_sessions(id) on delete cascade not null,
  role text not null,
  content text not null,
  is_tool_call boolean default false,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Patients can insert own messages" ON public.ai_chat_messages;

CREATE POLICY "Patients can view own messages" ON public.ai_chat_messages FOR SELECT USING (
  exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.patient_id = auth.uid())
);
CREATE POLICY "Patients can insert own messages" ON public.ai_chat_messages FOR INSERT WITH CHECK (
  exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.patient_id = auth.uid())
);

-- ========== DOCTOR SESSIONS ==========
CREATE TABLE IF NOT EXISTS public.doctor_sessions (
  id uuid default gen_random_uuid() primary key,
  doctor_id uuid references public.users(id) not null,
  title text not null,
  session_date date not null,
  start_time text not null,
  end_time text not null,
  max_patients integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.doctor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view sessions" ON public.doctor_sessions;
DROP POLICY IF EXISTS "Doctors can manage own sessions" ON public.doctor_sessions;

CREATE POLICY "Anyone can view sessions" ON public.doctor_sessions FOR SELECT USING (true);
CREATE POLICY "Doctors can manage own sessions" ON public.doctor_sessions FOR ALL USING (auth.uid() = doctor_id);
