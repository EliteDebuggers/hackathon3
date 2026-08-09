import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const patientsToSeed = [
  {
    email: 'rahul.sharma@swasth.com',
    password: 'password123',
    fullName: 'Rahul Sharma',
    documents: [
      { title: 'Annual Lab Report 2026.pdf', document_type: 'Lab Report', file_url: 'https://example.com/reports/rahul_lab_2026.pdf' },
      { title: 'Chest X-Ray Scan.jpg', document_type: 'Scan/Imaging', file_url: 'https://example.com/reports/rahul_chest_xray.jpg' }
    ],
    appointments: [
      { appointment_date: '2026-08-10', appointment_time: '10:00 AM', status: 'confirmed', remarks: 'Routine health checkup and blood pressure review' }
    ],
    milestones: [
      { title: 'Blood Panel Uploaded', description: 'Patient uploaded annual blood panel report.', milestone_type: 'upload', status: 'completed' },
      { title: 'Awaiting Consultation', description: 'Scheduled appointment with cardiologist.', milestone_type: 'appointment', status: 'pending' }
    ],
    briefs: [
      { appointment_context: 'Patient reports mild chest tightness after exercise. Has a family history of hypertension. Vitals: BP 138/85, HR 74.' }
    ]
  },
  {
    email: 'priya.verma@swasth.com',
    password: 'password123',
    fullName: 'Priya Verma',
    documents: [
      { title: 'Thyroid Panel Report.pdf', document_type: 'Lab Report', file_url: 'https://example.com/reports/priya_thyroid.pdf' }
    ],
    appointments: [
      { appointment_date: '2026-08-12', appointment_time: '02:30 PM', status: 'pending', remarks: 'Consultation for fatigue and thyroid monitoring' }
    ],
    milestones: [
      { title: 'Thyroid Test Completed', description: 'Lab report uploaded for T3, T4, TSH.', milestone_type: 'upload', status: 'completed' }
    ],
    briefs: [
      { appointment_context: 'Patient suffers from extreme fatigue, hair loss, and cold sensitivity. Thyroid panel uploaded.' }
    ]
  },
  {
    email: 'amit.kumar@swasth.com',
    password: 'password123',
    fullName: 'Amit Kumar',
    documents: [
      { title: 'MRI Knee Scan Report.pdf', document_type: 'Scan/Imaging', file_url: 'https://example.com/reports/amit_knee_mri.pdf' }
    ],
    appointments: [
      { appointment_date: '2026-08-15', appointment_time: '11:15 AM', status: 'confirmed', remarks: 'Knee joint pain after athletic training' }
    ],
    milestones: [
      { title: 'Knee MRI Uploaded', description: 'MRI scan showing minor meniscus tear.', milestone_type: 'upload', status: 'completed' }
    ],
    briefs: [
      { appointment_context: 'Experienced knee lock and swelling during football match 3 days ago. Pain level 6/10.' }
    ]
  },
  {
    email: 'sneha.gupta@swasth.com',
    password: 'password123',
    fullName: 'Sneha Gupta',
    documents: [
      { title: 'Allergy Test Panel.pdf', document_type: 'Lab Report', file_url: 'https://example.com/reports/sneha_allergy.pdf' }
    ],
    appointments: [
      { appointment_date: '2026-08-18', appointment_time: '04:00 PM', status: 'confirmed', remarks: 'Skin rash and seasonal allergy consultation' }
    ],
    milestones: [
      { title: 'Allergy Panel Uploaded', description: 'Patient uploaded immunoglobulin test results.', milestone_type: 'upload', status: 'completed' }
    ],
    briefs: [
      { appointment_context: 'Patient developed recurring skin hives and breathing congestion in seasonal changes. Testing positive for pollen.' }
    ]
  }
];

const doctorToSeed = {
  email: 'doctor@swasth.com',
  password: 'password123',
  fullName: 'Dr. Sarah Sharma',
  specialty: 'Cardiology'
};

async function seed() {
  console.log('Starting Database Seed...');

  // 1. Seed Doctor
  console.log(`Seeding Doctor: ${doctorToSeed.fullName}...`);
  const { data: docAuth, error: docAuthErr } = await supabase.auth.signUp({
    email: doctorToSeed.email,
    password: doctorToSeed.password
  });

  let docId = '';
  if (docAuthErr) {
    if (docAuthErr.message.includes('already registered')) {
      console.log('Doctor already registered in Auth. Attempting to fetch or sign in...');
      const { data: docIn, error: docInErr } = await supabase.auth.signInWithPassword({
        email: doctorToSeed.email,
        password: doctorToSeed.password
      });
      if (docInErr) {
        console.error('Failed to sign in doctor:', docInErr.message);
        return;
      }
      docId = docIn.user.id;
    } else {
      console.error('Failed to sign up doctor:', docAuthErr.message);
      return;
    }
  } else {
    docId = docAuth.user.id;
  }

  // Insert/Update profile in users table
  const { error: docProfileErr } = await supabase
    .from('users')
    .upsert({
      id: docId,
      role: 'doctor',
      full_name: doctorToSeed.fullName
    });

  if (docProfileErr) {
    console.error('Error seeding doctor profile:', docProfileErr.message);
  } else {
    console.log('Doctor profile seeded successfully.');
  }

  // Sign out doctor
  await supabase.auth.signOut();

  // 2. Seed Patients
  for (const patient of patientsToSeed) {
    console.log(`\nSeeding Patient: ${patient.fullName}...`);
    const { data: patAuth, error: patAuthErr } = await supabase.auth.signUp({
      email: patient.email,
      password: patient.password
    });

    let patId = '';
    if (patAuthErr) {
      if (patAuthErr.message.includes('already registered')) {
        console.log(`Patient ${patient.fullName} already registered in Auth. Fetching by logging in...`);
        const { data: patIn, error: patInErr } = await supabase.auth.signInWithPassword({
          email: patient.email,
          password: patient.password
        });
        if (patInErr) {
          console.error(`Failed to sign in patient ${patient.fullName}:`, patInErr.message);
          continue;
        }
        patId = patIn.user.id;
      } else {
        console.error(`Failed to sign up patient ${patient.fullName}:`, patAuthErr.message);
        continue;
      }
    } else {
      patId = patAuth.user.id;
    }

    // Insert profile in users
    const { error: patProfileErr } = await supabase
      .from('users')
      .upsert({
        id: patId,
        role: 'patient',
        full_name: patient.fullName
      });

    if (patProfileErr) {
      console.error(`Error inserting profile for ${patient.fullName}:`, patProfileErr.message);
      continue;
    }

    // Insert Documents
    for (const doc of patient.documents) {
      const { error: docErr } = await supabase
        .from('documents')
        .insert({
          patient_id: patId,
          uploader_id: patId,
          title: doc.title,
          file_url: doc.file_url,
          document_type: doc.document_type
        });
      if (docErr) console.error(`Error inserting document ${doc.title}:`, docErr.message);
    }

    // Insert Appointments
    for (const appt of patient.appointments) {
      const { error: apptErr } = await supabase
        .from('appointments')
        .insert({
          patient_id: patId,
          doctor_id: docId,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          status: appt.status,
          remarks: appt.remarks
        });
      if (apptErr) console.error(`Error inserting appointment:`, apptErr.message);
    }

    // Insert Milestones
    for (const ms of patient.milestones) {
      const { error: msErr } = await supabase
        .from('health_milestones')
        .insert({
          patient_id: patId,
          title: ms.title,
          description: ms.description,
          milestone_type: ms.milestone_type,
          status: ms.status
        });
      if (msErr) console.error(`Error inserting milestone:`, msErr.message);
    }

    // Insert Briefs
    for (const brief of patient.briefs) {
      const { error: briefErr } = await supabase
        .from('consultation_briefs')
        .insert({
          patient_id: patId,
          authorized_doctor_id: docId,
          appointment_context: brief.appointment_context
        });
      if (briefErr) console.error(`Error inserting brief:`, briefErr.message);
    }

    console.log(`Seeded all medical history, documents, appointments for ${patient.fullName}.`);
    await supabase.auth.signOut();
  }

  console.log('\nDatabase seeding finished successfully!');
}

seed();
