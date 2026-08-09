# Swasth+ (Swasth)

[![React 19](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4.0-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Groq API](https://img.shields.io/badge/AI_Engine-Groq_/_xAI_Grok-orange)](https://console.groq.com/)

Swasth+ is a next-generation, AI-augmented healthcare ecosystem designed to streamline patient triaging and clinician workflows. It features a dual-sided clinical dashboard, an autonomous AI medical assistant, a chronological health timeline, and a custom **Real-World Resilience Layer** that keeps the application fully functional even during complete network outages, database crashes, or AI cluster failures.

---

## 🏗️ System Architecture & Resilience Flow

```mermaid
flowchart TB
    subgraph Client Application [Swasth+ Browser App]
        UI[React 19 UI Components] -->|API & Storage Queries| Client[Supabase Client]
        Client -->|Network Fetch Call| Interceptor{Resilient Fetch Interceptor}
        
        %% Normal online route
        Interceptor -->|Online & Connected| DBServer[(Supabase Cloud Server)]
        DBServer -->|Update Local Copy| Cache[(LocalStorage GET Cache)]
        
        %% Offline / Failure fallback route
        Interceptor -->|Offline or Simulated Outage| Failover[Resilience Engine]
        Failover -->|GET Request| Cache
        Failover -->|POST/PATCH/DELETE| SyncQueue[(Offline Sync Queue)]
        
        %% Storage Fallback
        UI -->|Upload Document| StorageCheck{Network Connection?}
        StorageCheck -->|Failed| Base64Cache[Convert File to Base64 Data URL]
        Base64Cache -->|Save to local records| Cache
        Base64Cache -->|Queue file upload| SyncQueue
    end
    
    subgraph Background Sync Worker [Auto-Sync Engine]
        SyncQueue -->|Periodic sync check - 6s| SyncWorker{Connection Restored?}
        SyncWorker -->|Yes| DBServer
        SyncWorker -->|No| SyncQueue
    end

    subgraph Intelligent Triage [AI Assistant Fallback]
        Chat[Patient AI Assistant] -->|Triage Inquiry| AICheck{AI Cluster Active?}
        AICheck -->|Yes| GroqAPI[Groq API / xAI Grok]
        AICheck -->|No or Rate-limited| RuleEngine[Local Rule-Based Diagnosis Engine]
        RuleEngine -->|Serve Lite Advisory| Chat
    end
```

---

## 🌟 Core Features

### 🛡️ 1. Real-World Resilience & Fault Tolerance
*   **Zero-Outage Database Failover**: The app intercepts all Supabase calls. If the database crashes or goes offline, `GET` queries seamlessly fall back to a local storage cache, preventing white screens.
*   **Offline Write Queuing**: Booking appointments, changing profiles, or adding medical records offline stores requests in an `Offline Sync Queue`.
*   **Auto-Sync Engine**: A silent background sync worker runs every 6 seconds. When connectivity is restored, it replays queued actions to the server in chronological order.
*   **Offline Document Uploads**: If a PDF or image report upload to Supabase storage fails, the app converts it into a local Base64 URL for immediate viewing in the UI and queues it for remote upload.
*   **Degraded Mode Banners**: Displays a real-time status banner notifying the user that they are operating offline and that updates will auto-sync.

### 🩺 2. Autonomous Dual AI Engine (Groq / Grok)
*   **Interactive Consultation Assistant**: Resolves queries using context from the patient's medical history index.
*   **Vision-Powered Medical Analysis**: Parses diagnostic images, lab reports, and prescriptions directly using vision models to extract summaries.
*   **Autonomous Tool Calls**: The agent executes functions dynamically on the client side:
    *   `suggest_home_remedies` — Provides home-care protocols for mild symptoms.
    *   `search_patient_history` — Queries past diagnostic files for symptoms.
    *   `find_best_doctor` — Matches symptoms against registered medical practitioners.
    *   `book_appointment` — Automates scheduling slots.
*   **Local Triage Fallback**: If the AI API rate-limits or fails, a client-side backup diagnostic engine parses symptom keywords (fever, cough, chest pain, stomach ache) to provide immediate advice.

### 👥 3. Practitioner Shift Scheduler & Clinical Dashboards
*   **Shift Manager**: Doctors define active consultation blocks, custom slots, and patient quotas.
*   **Authorized Medical Briefs**: Patients explicitly review and authorize a synthesized AI consultation brief before it is shared. Doctors see only authorized briefs and records.
*   **Record Staging**: Doctors upload staging prescriptions or reports directly to a patient's account, which the patient can review, accept, or reject.

---

## 🎛️ The Resilience Control Panel (HUD)

To demonstrate and evaluate the system's fault-tolerance, Swasth+ features a floating **Resilience Console HUD** (located in the bottom-right corner):
*   **Health Monitors**: Green/Red indicator lights tracking Network, Database, and AI cluster connectivity.
*   **Failure Toggles (Fault Injection)**:
    *   *Simulate Offline Mode*: Puts the app in mock airplane mode (network requests blocked).
    *   *Simulate DB Failure*: Simulates a database server crash (returns server 500 error).
    *   *Simulate AI Outage*: Blocks remote Groq/Grok calls to trigger local triage logic.
*   **Sync Queue Monitor**: Displays queued write actions and supports manual synchronization or clearing.
*   **Live Logs**: Real-time ticker showing intercepted requests and recovery actions taken.

---

## 🛣️ Router & Entrypoints Guide

| Route | Component | Access Role | Function |
| :--- | :--- | :--- | :--- |
| `/` | `src/modules/patient/Home.tsx` | Public | Homepage, features overview, and portal links |
| `/login` | `src/modules/shared/Login.tsx` | Public | Unified sign-in and patient/doctor account creation |
| `/patient-dashboard` | `src/modules/patient/PatientDashboard.tsx` | Patient | AI health assistant, record uploads, and health timeline |
| `/patient-records` | `src/modules/patient/MedicalRecords.tsx` | Patient | Medical folder structures, uploads, and search |
| `/patient-medications` | `src/modules/patient/Medications.tsx` | Patient | Dosage logging, timetables, and notification prompts |
| `/patient-doctors` | `src/modules/patient/Doctors.tsx` | Patient | Practitioner search by specialty and booking slots |
| `/patient-appointments` | `src/modules/patient/Appointments.tsx` | Patient | View scheduled consults and pending requests |
| `/patient-messages` | `src/modules/patient/Messages.tsx` | Patient | Notification alerts and system messages |
| `/patient-settings` | `src/modules/patient/Settings.tsx` | Patient | Medical profile setup and password management |
| `/doctor-schedule` | `src/modules/doctor/Schedule.tsx` | Doctor | Schedule shift quotas, consultation timings, and slots |
| `/doctor-appointments` | `src/modules/doctor/Appointments.tsx` | Doctor | Appointment approval dashboard |
| `/doctor-patients` | `src/modules/doctor/Patients.tsx` | Doctor | Client records overview, doctor uploads, and patient timeline |
| `/doctor-settings` | `src/modules/doctor/Settings.tsx` | Doctor | Specialization details and qualifications setup |
| `/document/:id` | `src/modules/shared/DocumentView.tsx` | Authenticated | High-fidelity medical report and image viewer |

---

## 🛠️ Installation & Local Setup Guide

Follow these steps to run Swasth+ locally:

### 1. Prerequisites
Ensure you have the following installed:
*   **Node.js**: v18.0 or higher (v24.x recommended)
*   **Package Manager**: `pnpm` (Mandatory as per repository guidelines)
*   **Supabase Account**: (Or use the active pre-configured environment variables below)

### 2. Clone the Repository
```bash
git clone https://github.com/EliteDebuggers/Swasth.git
cd Swasth
```

### 3. Install Project Dependencies
```bash
pnpm install
```

### 4. Setup Environment Variables
Create a `.env.local` file in the root of your project:
```env
# Supabase Configuration
VITE_SUPABASE_URL="https://xfxenzenwatgejotlmvd.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmeGVuemVud2F0Z2Vqb3RsbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDc1MjUsImV4cCI6MjEwMDgyMzUyNX0.hQ5P01sNX3bq3bRmAzq3rhXOrWa4YSuL5dqivBHtgHI"

# AI Model Configuration (Groq API Endpoint)
VITE_GROQ_API_KEY="gsk_YOUR_API_KEY_HERE"
VITE_GROK_MODEL="llama-3.1-8b-instant"
```

### 5. Run the Database Schema (If creating a new Supabase Instance)
If you'd like to use a fresh database instance instead of the preconfigured dev DB:
1. Open the **SQL Editor** on your Supabase dashboard.
2. Paste and run the contents of [`database.sql`](database.sql). This configures the 9 tables, storage buckets (`medical-records` & `documents`), and security RLS rules.

### 6. Start the Development Server
```bash
pnpm dev
```
Open `http://localhost:5173` in your browser.

### 7. Compile the Production Build
To build and preview the optimized build locally:
```bash
pnpm run build
pnpm run preview
```

---

## 🔐 Database & Security Architecture (PostgreSQL + RLS)

Data privacy is built into the core database layer using **Supabase Row Level Security (RLS)**:
*   **`users`**: Extends authenticated users with roles (`patient` | `doctor`).
*   **`documents`**: Stores files and OCR/extracted text. Patients can read their own documents. Doctors can only read a patient's document if it has been attached to an authorized brief.
*   **`consultation_briefs`**: Contains patient summaries. Doctors have read access only if the patient has authorized them as the recipient.
*   **`pending_document_uploads`**: Temporary holding table for doctor-assigned reports until the patient approves the insert.

---

## 👥 Team & License

Built with ❤️ by **Team EliteDebuggers**.

Distributed under the **GNU License**. See `LICENSE` for details.
