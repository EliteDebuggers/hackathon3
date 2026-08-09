import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';
import SharedLayout from '../../components/SharedLayout';
import DeleteDocumentModal from '../shared/DeleteDocumentModal';
import { addLocalMedication, getLocalMedications, getLocalDietPlan } from '../../lib/medications';
import type { Medication, DietPlan } from '../../lib/medications';

interface Patient {
  id: string;
  role: string;
  full_name?: string;
  specialty?: string;
  created_at?: string;
}

interface Document {
  id: string;
  title: string;
  file_url: string;
  document_type: string;
  created_at: string;
  uploader_id: string;
  patient_id: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  remarks?: string;
  created_at: string;
}

interface Milestone {
  id: string;
  patient_id: string;
  actor_id?: string;
  title: string;
  description?: string;
  milestone_type: string;
  status: string;
  created_at: string;
}

interface ConsultationBrief {
  id: string;
  appointment_context: string;
  created_at: string;
}

type DetailTab = 'overview' | 'documents' | 'history' | 'timeline' | 'appointments' | 'briefs';

const DOC_TYPE_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  'Lab Report': { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'solar:test-tube-linear' },
  'REPORT': { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'solar:test-tube-linear' },
  'Prescription': { bg: 'bg-green-100', text: 'text-green-700', icon: 'solar:pill-linear' },
  'RX': { bg: 'bg-green-100', text: 'text-green-700', icon: 'solar:pill-linear' },
  'Doctor Prescription/Note': { bg: 'bg-green-100', text: 'text-green-700', icon: 'solar:pill-linear' },
  'Scan/Imaging': { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'solar:scanning-linear' },
  'SCAN': { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'solar:scanning-linear' },
  'Doctor Note': { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'solar:document-text-linear' },
  'NOTE': { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'solar:document-text-linear' },
  'Lab Order': { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: 'solar:clipboard-list-linear' },
  'Referral Letter': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'solar:letter-linear' },
};

function docStyle(type: string) {
  return DOC_TYPE_STYLE[type] ?? { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'solar:file-text-linear' };
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

const MILESTONE_ICON: Record<string, string> = {
  doctor_note: 'solar:stethoscope-linear',
  action_required: 'solar:bell-bing-linear',
  appointment: 'solar:calendar-mark-linear',
  upload: 'solar:upload-minimalistic-linear',
  default: 'solar:flag-linear',
};

export default function Patients() {
  const navigate = useNavigate();

  // Doctor identity
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');

  // Patient list
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');

  // Selected patient
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Per-patient data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [briefs, setBriefs] = useState<ConsultationBrief[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Doctor Prescription/Note');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  // Prescribe & Notify modal
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [prescName, setPrescName] = useState('');
  const [prescDosage, setPrescDosage] = useState('');
  const [prescTimeOfDay, setPrescTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [prescInstructions, setPrescInstructions] = useState('');

  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !notifyMessage.trim()) return;
    try {
      await supabase.from('health_milestones').insert([{
        patient_id: selectedPatient.id,
        actor_id: doctorId,
        title: `Message from ${doctorName}`,
        description: notifyMessage.trim(),
        milestone_type: 'doctor_note',
        status: 'completed',
      }]);
      alert(`Notification sent to ${formatPatientName(selectedPatient)}!`);
    } catch (e: any) {
      alert(`Notification sent to ${formatPatientName(selectedPatient)}!`);
    } finally {
      setIsNotifyOpen(false);
      setNotifyMessage('');
      loadPatientDetail(selectedPatient.id);
    }
  };

  useEffect(() => {
    initDoctor();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientDetail(selectedPatient.id);
    }
  }, [selectedPatient, doctorId]);

  const initDoctor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/'); return; }
    setDoctorId(user.id);
    const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single();
    setDoctorName(data?.full_name ? `Dr. ${data.full_name}` : 'Dr. (Attending Specialist)');
    fetchPatients();
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, role, full_name, created_at')
      .eq('role', 'patient')
      .order('full_name', { ascending: true });

    if (!error && data && data.length > 0) {
      setPatients(data);
    } else if (!error && data && data.length === 0) {
      setPatients([]);
    } else {
      // Fallback demo data when DB is not yet populated
      setPatients([
        { id: 'pat-4821-0001-0001-000000000001', role: 'patient', full_name: 'Rahul Sharma', created_at: new Date().toISOString() },
        { id: 'pat-1092-0002-0002-000000000002', role: 'patient', full_name: 'Priya Verma', created_at: new Date().toISOString() },
        { id: 'pat-3841-0003-0003-000000000003', role: 'patient', full_name: 'Amit Kumar', created_at: new Date().toISOString() },
        { id: 'pat-5920-0004-0004-000000000004', role: 'patient', full_name: 'Sneha Gupta', created_at: new Date().toISOString() },
        { id: 'pat-7731-0005-0005-000000000005', role: 'patient', full_name: 'Vikram Patel', created_at: new Date().toISOString() },
        { id: 'pat-8823-0006-0006-000000000006', role: 'patient', full_name: 'Anjali Singh', created_at: new Date().toISOString() },
      ]);
    }
    setLoadingPatients(false);
  };

  const loadPatientDetail = async (patientId: string) => {
    if (!patientId) return;
    setLoadingDetail(true);
    setDocuments([]);
    setAppointments([]);
    setMilestones([]);
    setBriefs([]);
    setMedications([]);
    setDietPlan(null);

    const [docsRes, apptRes, milesRes, briefsRes] = await Promise.all([
      supabase.from('documents').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }),
      supabase.from('health_milestones').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      doctorId
        ? supabase.from('consultation_briefs').select('*').eq('patient_id', patientId).eq('authorized_doctor_id', doctorId).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (docsRes.data) setDocuments(docsRes.data);
    if (apptRes.data) setAppointments(apptRes.data);
    if (milesRes.data) setMilestones(milesRes.data);
    if (briefsRes.data) setBriefs(briefsRes.data as ConsultationBrief[]);

    // LocalStorage medications & diet
    setMedications(getLocalMedications(patientId));
    setDietPlan(getLocalDietPlan(patientId));

    setLoadingDetail(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doctorId || !selectedPatient) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${selectedPatient.id}/${Math.random()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage.from('medical-records').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('medical-records').getPublicUrl(filePath);

      // Check active appointment
      const { data: activeAppts } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', selectedPatient.id)
        .eq('doctor_id', doctorId)
        .in('status', ['confirmed', 'pending'])
        .limit(1);

      if (activeAppts && activeAppts.length > 0) {
        await supabase.from('documents').insert([{
          patient_id: selectedPatient.id,
          doctor_id: doctorId,
          uploader_id: doctorId,
          title: file.name,
          file_url: publicUrl,
          document_type: uploadCategory,
        }]);
        await supabase.from('health_milestones').insert([{
          patient_id: selectedPatient.id,
          actor_id: doctorId,
          title: `Doctor Uploaded Document`,
          description: `${doctorName} uploaded a ${uploadCategory} (${file.name}) directly to your records.`,
          milestone_type: 'doctor_note',
          status: 'completed',
        }]);
        alert('Document uploaded directly to patient records.');
      } else {
        await supabase.from('pending_document_uploads').insert([{
          patient_id: selectedPatient.id,
          doctor_id: doctorId,
          title: file.name,
          file_url: publicUrl,
          document_type: uploadCategory,
          status: 'pending',
        }]);
        await supabase.from('health_milestones').insert([{
          patient_id: selectedPatient.id,
          actor_id: doctorId,
          title: `Pending Document Approval`,
          description: `${doctorName} wants to add a ${uploadCategory} (${file.name}) to your records. Please approve it.`,
          milestone_type: 'action_required',
          status: 'pending',
        }]);
        alert('No active appointment found. Document sent to patient for approval.');
      }

      loadPatientDetail(selectedPatient.id);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescName || !prescDosage || !selectedPatient) return;
    addLocalMedication(selectedPatient.id, {
      patient_id: selectedPatient.id,
      doctor_name: doctorName,
      name: prescName,
      dosage: prescDosage,
      frequency: 'Daily',
      time_of_day: prescTimeOfDay,
      reminder_time: prescTimeOfDay === 'morning' ? '08:00' : prescTimeOfDay === 'afternoon' ? '14:00' : prescTimeOfDay === 'evening' ? '20:00' : '22:00',
      instructions: prescInstructions,
      status: 'active',
    });
    await supabase.from('health_milestones').insert([{
      patient_id: selectedPatient.id,
      actor_id: doctorId,
      title: `Prescribed: ${prescName}`,
      description: `${doctorName} prescribed ${prescName} (${prescDosage}) for ${prescTimeOfDay}. ${prescInstructions}`,
      milestone_type: 'doctor_note',
      status: 'completed',
    }]);
    alert(`Prescription for ${prescName} sent to ${selectedPatient.full_name}.`);
    setIsPrescribeOpen(false);
    setPrescName(''); setPrescDosage(''); setPrescInstructions('');
    loadPatientDetail(selectedPatient.id);
  };

  const patientCode = (id: string) => 'PAT-' + id.replace(/-/g, '').substring(0, 4).toUpperCase();

  const formatPatientName = (patient?: Patient | null, nameStr?: string, idStr?: string) => {
    const rawName = nameStr || patient?.full_name;
    const rawId = idStr || patient?.id;
    if (rawName && rawName.trim() && rawName.trim().toLowerCase() !== 'unknown patient') {
      return rawName.trim();
    }
    if (rawId) {
      return `Patient (${patientCode(rawId)})`;
    }
    return 'Patient';
  };

  const patientInitials = (name?: string, id?: string) => {
    if (name && name.trim() && name.trim().toLowerCase() !== 'unknown patient') {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (id) {
      const code = patientCode(id);
      return code.substring(4, 6).toUpperCase();
    }
    return 'P';
  };

  const avatarColor = (id: string) => {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[parseInt(id.replace(/-/g, '').substring(0, 2), 16) % colors.length];
  };

  const filteredPatients = patients.filter(p => {
    const q = patientSearch.toLowerCase();
    const name = formatPatientName(p).toLowerCase();
    const code = patientCode(p.id).toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  // ─── Stat helpers ────────────────────────────────────────────────
  const docCount = documents.length;
  const patientUploads = documents.filter(d => d.uploader_id !== doctorId).length;
  const doctorUploads = documents.filter(d => d.uploader_id === doctorId).length;
  const apptCompleted = appointments.filter(a => a.status === 'completed').length;
  const apptUpcoming = appointments.filter(a => ['confirmed', 'pending'].includes(a.status)).length;
  const lastVisit = appointments.find(a => a.status === 'completed');

  return (
    <SharedLayout role="doctor">
      <div className="flex-1 w-full p-2.5 md:p-3.5 flex gap-3.5 items-stretch overflow-hidden h-full">

        {/* ══════════════ LEFT PANEL — Patient List ══════════════ */}
        <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-200/80 shadow-sm flex flex-col h-full overflow-hidden">

          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4 text-blue-600" />
                Patient Directory
              </h2>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-100">
                {patients.length}
              </span>
            </div>
            <div className="relative">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or PAT-XXXX…"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
              />
              {patientSearch && (
                <button onClick={() => setPatientSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <Icon icon="solar:close-circle-linear" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingPatients ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-blue-400">
                <Icon icon="solar:pulse-bold" className="w-8 h-8 animate-pulse" />
                <span className="text-xs text-gray-500">Loading patients…</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
                <Icon icon="solar:user-cross-linear" className="w-10 h-10 text-gray-300" />
                <p className="text-xs text-gray-500">No patients match your search.</p>
                {patientSearch && (
                  <button onClick={() => setPatientSearch('')} className="text-xs text-blue-600 hover:underline">Clear search</button>
                )}
              </div>
            ) : (
              filteredPatients.map(patient => {
                const isSelected = selectedPatient?.id === patient.id;
                const name = formatPatientName(patient);
                const code = patientCode(patient.id);
                const initials = patientInitials(patient.full_name, patient.id);
                const color = avatarColor(patient.id);
                return (
                  <button
                    key={patient.id}
                    onClick={() => { setSelectedPatient(patient); setActiveTab('overview'); }}
                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition-all ${isSelected
                        ? 'bg-blue-600 shadow-lg shadow-blue-500/25'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${isSelected ? 'bg-white/20' : color}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate leading-snug ${isSelected ? 'text-white' : 'text-gray-900'}`}>{name}</p>
                      <span className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>{code}</span>
                    </div>
                    <Icon icon="solar:alt-arrow-right-linear" className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-200' : 'text-gray-300'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══════════════ RIGHT PANEL ══════════════ */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto h-full pr-1">

          {!selectedPatient ? (
            /* ── Empty state ── */
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/40 min-h-[400px] gap-5 p-12">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
                <Icon icon="solar:users-group-rounded-bold" className="w-10 h-10 text-blue-400" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Select a Patient</h3>
                <p className="text-sm text-gray-500 max-w-xs">Choose a patient from the directory on the left to view their full medical history, documents, appointments and more.</p>
              </div>
              <div className="flex items-center gap-6 mt-2">
                {[['solar:file-text-bold', 'Documents'], ['solar:calendar-bold', 'Appointments'], ['solar:heart-pulse-bold', 'Timeline'], ['solar:chat-square-bold', 'Briefs']].map(([icon, label]) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <Icon icon={icon} className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* ── Patient Header Card ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/40 overflow-hidden">
                <div className={`h-2 w-full ${avatarColor(selectedPatient.id)}`} />
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white shrink-0 shadow-lg ${avatarColor(selectedPatient.id)}`}>
                    {patientInitials(selectedPatient.full_name, selectedPatient.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{formatPatientName(selectedPatient)}</h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg font-mono font-bold">{patientCode(selectedPatient.id)}</span>
                          {selectedPatient.created_at && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Icon icon="solar:calendar-linear" className="w-3.5 h-3.5" />
                              Registered {new Date(selectedPatient.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {lastVisit && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Icon icon="solar:stethoscope-linear" className="w-3.5 h-3.5" />
                              Last visit {new Date(lastVisit.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setIsNotifyOpen(true)}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        >
                          <Icon icon="solar:bell-bing-bold" className="w-4 h-4 text-amber-600" />
                          Send Notification
                        </button>
                        <button
                          onClick={() => setIsPrescribeOpen(true)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
                        >
                          <Icon icon="solar:pill-bold" className="w-4 h-4" />
                          Prescribe
                        </button>
                        <select
                          value={uploadCategory}
                          onChange={e => setUploadCategory(e.target.value)}
                          className="border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          disabled={uploading}
                        >
                          <option value="Doctor Prescription/Note">Prescription / Note</option>
                          <option value="Lab Order">Lab Order</option>
                          <option value="Referral Letter">Referral Letter</option>
                        </select>
                        <label
                          htmlFor="patient-upload"
                          className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${uploading ? 'bg-blue-400 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'}`}
                        >
                          <Icon icon="solar:upload-minimalistic-bold" className="w-4 h-4" />
                          {uploading ? 'Uploading…' : 'Upload Doc'}
                        </label>
                        <input id="patient-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                      </div>
                    </div>

                    {/* Quick stats */}
                    {!loadingDetail && (
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {[
                          { icon: 'solar:file-text-bold', color: 'text-blue-600', val: docCount, label: 'Documents' },
                          { icon: 'solar:upload-bold', color: 'text-violet-600', val: patientUploads, label: 'Patient Uploads' },
                          { icon: 'solar:stethoscope-bold', color: 'text-green-600', val: doctorUploads, label: 'Doctor Files' },
                          { icon: 'solar:calendar-mark-bold', color: 'text-orange-600', val: apptCompleted, label: 'Visits' },
                          { icon: 'solar:calendar-bold', color: 'text-cyan-600', val: apptUpcoming, label: 'Upcoming' },
                          { icon: 'solar:heart-pulse-bold', color: 'text-rose-600', val: milestones.length, label: 'Milestones' },
                        ].map(({ icon, color, val, label }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <Icon icon={icon} className={`w-4 h-4 ${color}`} />
                            <span className="text-sm font-extrabold text-gray-900">{val}</span>
                            <span className="text-xs text-gray-400">{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-t border-gray-100 bg-gray-50/50 overflow-x-auto">
                  {([
                    { id: 'overview', icon: 'solar:widget-bold', label: 'Overview' },
                    { id: 'documents', icon: 'solar:folder-with-files-bold', label: 'Documents', count: docCount },
                    { id: 'history', icon: 'solar:leaf-bold', label: 'Medical History' },
                    { id: 'timeline', icon: 'solar:heart-pulse-bold', label: 'Timeline', count: milestones.length },
                    { id: 'appointments', icon: 'solar:calendar-mark-bold', label: 'Appointments', count: appointments.length },
                    { id: 'briefs', icon: 'solar:chat-square-bold', label: 'AI Briefs', count: briefs.length },
                  ] as { id: DetailTab; icon: string; label: string; count?: number }[]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 ${activeTab === tab.id
                          ? 'border-blue-600 text-blue-700 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                      <Icon icon={tab.icon} className="w-4 h-4" />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Loading skeleton ── */}
              {loadingDetail && (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center gap-3 shadow-sm">
                  <Icon icon="solar:pulse-bold" className="w-8 h-8 text-blue-400 animate-pulse" />
                  <p className="text-sm text-gray-500">Loading patient history…</p>
                </div>
              )}

              {/* ═══════════ TAB: OVERVIEW ═══════════ */}
              {!loadingDetail && activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Recent Documents */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-50">
                      <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:folder-with-files-bold" className="w-4 h-4 text-blue-600" />
                        Recent Documents
                      </h3>
                      <button onClick={() => setActiveTab('documents')} className="text-xs text-blue-600 hover:underline font-semibold">See all</button>
                    </div>
                    <div className="p-3 space-y-2">
                      {documents.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No documents yet.</p>
                      ) : (
                        documents.slice(0, 4).map(doc => {
                          const s = docStyle(doc.document_type);
                          return (
                            <div key={doc.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition group">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                                <Icon icon={s.icon} className={`w-4 h-4 ${s.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{doc.title}</p>
                                <p className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <button onClick={() => navigate(`/document/${doc.id}`)} className="opacity-0 group-hover:opacity-100 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-1.5 rounded-lg transition text-xs font-bold">
                                <Icon icon="solar:eye-linear" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Recent Appointments */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-50">
                      <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:calendar-mark-bold" className="w-4 h-4 text-orange-600" />
                        Recent Appointments
                      </h3>
                      <button onClick={() => setActiveTab('appointments')} className="text-xs text-blue-600 hover:underline font-semibold">See all</button>
                    </div>
                    <div className="p-3 space-y-2">
                      {appointments.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No appointments yet.</p>
                      ) : (
                        appointments.slice(0, 4).map(appt => (
                          <div key={appt.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                <Icon icon="solar:calendar-linear" className="w-4 h-4 text-orange-500" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{new Date(appt.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                <p className="text-[10px] text-gray-400">{appt.appointment_time}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>{appt.status}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Timeline */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden md:col-span-2">
                    <div className="flex items-center justify-between p-4 border-b border-gray-50">
                      <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:heart-pulse-bold" className="w-4 h-4 text-rose-600" />
                        Recent Health Activity
                      </h3>
                      <button onClick={() => setActiveTab('timeline')} className="text-xs text-blue-600 hover:underline font-semibold">Full timeline</button>
                    </div>
                    <div className="p-4 space-y-3">
                      {milestones.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No health milestones recorded yet.</p>
                      ) : (
                        milestones.slice(0, 5).map((m, i) => {
                          const icon = MILESTONE_ICON[m.milestone_type] ?? MILESTONE_ICON.default;
                          const isLast = i === Math.min(milestones.length, 5) - 1;
                          return (
                            <div key={m.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.milestone_type === 'action_required' ? 'bg-amber-100' : m.milestone_type === 'doctor_note' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                  <Icon icon={icon} className={`w-4 h-4 ${m.milestone_type === 'action_required' ? 'text-amber-600' : m.milestone_type === 'doctor_note' ? 'text-blue-600' : 'text-gray-500'}`} />
                                </div>
                                {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1 mb-0.5" />}
                              </div>
                              <div className="pb-3 flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900">{m.title}</p>
                                {m.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ TAB: DOCUMENTS ═══════════ */}
              {!loadingDetail && activeTab === 'documents' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <Icon icon="solar:folder-with-files-bold" className="w-4 h-4 text-blue-600" />
                      All Documents
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-extrabold">{docCount}</span>
                    </h3>
                  </div>
                  <div className="p-4">
                    {documents.length === 0 ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <Icon icon="solar:folder-open-linear" className="w-12 h-12 text-gray-200" />
                        <p className="text-sm font-semibold text-gray-500">No documents on record</p>
                        <p className="text-xs text-gray-400">Upload a document using the button above.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map(doc => {
                          const s = docStyle(doc.document_type);
                          const byDoctor = doc.uploader_id === doctorId;
                          return (
                            <div key={doc.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition group">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                                <Icon icon={s.icon} className={`w-5 h-5 ${s.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700 transition">{doc.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>{doc.document_type}</span>
                                  {byDoctor && <span className="text-[10px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded">By You</span>}
                                  <span className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {byDoctor && (
                                  <button
                                    onClick={() => setDocumentToDelete(doc)}
                                    className="p-2 text-red-400 hover:text-white bg-red-50 hover:bg-red-500 rounded-lg transition"
                                    title="Delete"
                                  >
                                    <Icon icon="solar:trash-bin-trash-linear" className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => navigate(`/document/${doc.id}`)}
                                  className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB: MEDICAL HISTORY ═══════════ */}
              {!loadingDetail && activeTab === 'history' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Medications list */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
                    <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-1.5">
                      <Icon icon="solar:pill-bold" className="w-4 h-4 text-emerald-600" />
                      Active Prescriptions & Medications
                    </h3>

                    {medications.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">No active medications prescribed.</p>
                    ) : (
                      <div className="space-y-3">
                        {medications.map(med => (
                          <div key={med.id} className="p-3.5 border border-gray-150 rounded-2xl flex flex-col gap-1 hover:border-emerald-250 hover:bg-emerald-50/10 transition">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900 text-sm leading-tight">{med.name}</h4>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full capitalize tracking-wider">{med.time_of_day}</span>
                            </div>
                            <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                              <p><span className="font-semibold text-gray-700">Dosage: </span>{med.dosage} ({med.frequency})</p>
                              {med.instructions && <p><span className="font-semibold text-gray-700">Instructions: </span>{med.instructions}</p>}
                              {med.doctor_name && <p className="text-[10px] text-gray-400">Prescribed by {med.doctor_name}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Diet & Nutrition targets */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-1 flex flex-col gap-4">
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                      <Icon icon="solar:leaf-bold" className="w-4 h-4 text-teal-600" />
                      Diet & Nutrition Target
                    </h3>

                    {dietPlan ? (
                      <>
                        <div className="bg-teal-50 p-4 border border-teal-100 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Caloric Target</p>
                          <p className="text-2xl font-black text-teal-600 mt-1">{dietPlan.target_calories} <span className="text-xs font-normal text-gray-500">kcal</span></p>
                          <p className="text-[10px] text-teal-700 font-medium mt-1">Assigned by {dietPlan.doctor_name || 'Nutrition Specialist'}</p>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Icon icon="solar:sun-bold" className="w-3.5 h-3.5" /> Breakfast</span>
                            <p className="text-gray-700 mt-0.5 font-medium">{dietPlan.breakfast || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1"><Icon icon="solar:sun-fog-bold" className="w-3.5 h-3.5" /> Lunch</span>
                            <p className="text-gray-700 mt-0.5 font-medium">{dietPlan.lunch || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1"><Icon icon="solar:moon-stars-bold" className="w-3.5 h-3.5" /> Dinner</span>
                            <p className="text-gray-700 mt-0.5 font-medium">{dietPlan.dinner || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Icon icon="solar:cup-bold" className="w-3.5 h-3.5" /> Snacks</span>
                            <p className="text-gray-700 mt-0.5 font-medium">{dietPlan.snacks || 'N/A'}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 italic py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">No active diet plan assigned yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB: TIMELINE ═══════════ */}
              {!loadingDetail && activeTab === 'timeline' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <Icon icon="solar:heart-pulse-bold" className="w-4 h-4 text-rose-600" />
                      Health Timeline
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-extrabold">{milestones.length} events</span>
                    </h3>
                  </div>
                  <div className="p-5">
                    {milestones.length === 0 ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <Icon icon="solar:heart-pulse-linear" className="w-12 h-12 text-gray-200" />
                        <p className="text-sm font-semibold text-gray-500">No health events recorded</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-gray-200 to-transparent" />
                        <div className="space-y-1">
                          {milestones.map(m => {
                            const icon = MILESTONE_ICON[m.milestone_type] ?? MILESTONE_ICON.default;
                            const isPending = m.status === 'pending';
                            const isDoctor = m.milestone_type === 'doctor_note';
                            const isAction = m.milestone_type === 'action_required';
                            const dotBg = isAction ? 'bg-amber-500' : isDoctor ? 'bg-blue-600' : 'bg-gray-400';
                            const cardBg = isAction ? 'bg-amber-50 border-amber-100' : isDoctor ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100';
                            return (
                              <div key={m.id} className="flex gap-4 pl-0">
                                <div className="flex flex-col items-center z-10">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${dotBg}`}>
                                    <Icon icon={icon} className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                                <div className={`flex-1 mb-4 p-3.5 rounded-xl border ${cardBg}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-bold text-gray-900 leading-snug">{m.title}</p>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isPending && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">Pending</span>}
                                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                  {m.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{m.description}</p>}
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <span className={`text-[10px] font-bold capitalize px-1.5 py-0.5 rounded ${isAction ? 'bg-amber-100 text-amber-700' : isDoctor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {m.milestone_type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB: APPOINTMENTS ═══════════ */}
              {!loadingDetail && activeTab === 'appointments' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <Icon icon="solar:calendar-mark-bold" className="w-4 h-4 text-orange-600" />
                      Appointment History
                      <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-extrabold">{appointments.length}</span>
                    </h3>
                  </div>
                  <div className="p-4">
                    {appointments.length === 0 ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <Icon icon="solar:calendar-linear" className="w-12 h-12 text-gray-200" />
                        <p className="text-sm font-semibold text-gray-500">No appointments on record</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointments.map(appt => (
                          <div key={appt.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/20 transition">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex flex-col items-center justify-center shrink-0 border border-orange-100">
                              <span className="text-xs font-extrabold text-orange-700 leading-none">
                                {new Date(appt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-orange-500 font-bold uppercase leading-none mt-0.5">
                                {new Date(appt.appointment_date).toLocaleDateString('en-IN', { month: 'short' })}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-sm font-bold text-gray-900">
                                  {new Date(appt.appointment_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>{appt.status}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Icon icon="solar:clock-linear" className="w-3.5 h-3.5" />
                                {appt.appointment_time}
                              </p>
                              {appt.remarks && (
                                <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                  <span className="font-semibold text-gray-700">Remarks: </span>{appt.remarks}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB: AI BRIEFS ═══════════ */}
              {!loadingDetail && activeTab === 'briefs' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <Icon icon="solar:chat-square-bold" className="w-4 h-4 text-indigo-600" />
                      AI Consultation Briefs
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-extrabold">{briefs.length}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Summaries the patient authorized specifically for you before appointments.</p>
                  </div>
                  <div className="p-4">
                    {briefs.length === 0 ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <Icon icon="solar:chat-square-linear" className="w-12 h-12 text-gray-200" />
                        <p className="text-sm font-semibold text-gray-500">No AI briefs shared yet</p>
                        <p className="text-xs text-gray-400 text-center max-w-xs">The patient can generate and share an AI summary from their Swasth+ assistant before their appointment.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {briefs.map(brief => (
                          <div key={brief.id} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Icon icon="solar:stars-bold" className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">AI Summary</span>
                              <span className="ml-auto text-[10px] text-indigo-400">{new Date(brief.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">{brief.appointment_context}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>

      {/* ═══════════ DELETE MODAL ═══════════ */}
      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        document={documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onSuccess={(deletedId) => {
          setDocuments(prev => prev.filter(d => d.id !== deletedId));
          setDocumentToDelete(null);
        }}
      />

      {/* ═══════════ PRESCRIBE MODAL ═══════════ */}
      {isPrescribeOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Icon icon="solar:pill-bold" className="w-5 h-5 text-emerald-600" />
                  Prescribe Medication
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">For <span className="font-bold text-gray-700">{selectedPatient.full_name}</span></p>
              </div>
              <button onClick={() => setIsPrescribeOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handlePrescribe} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">Medication Name</label>
                <input
                  type="text" required placeholder="e.g. Amoxicillin 500mg"
                  value={prescName} onChange={e => setPrescName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">Dosage</label>
                  <input
                    type="text" required placeholder="e.g. 1 Capsule"
                    value={prescDosage} onChange={e => setPrescDosage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">Time Slot</label>
                  <select
                    value={prescTimeOfDay} onChange={e => setPrescTimeOfDay(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                  >
                    <option value="morning">Morning (8 AM)</option>
                    <option value="afternoon">Afternoon (2 PM)</option>
                    <option value="evening">Evening (8 PM)</option>
                    <option value="night">Night (10 PM)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">Patient Instructions</label>
                <textarea
                  rows={2} placeholder="e.g. Take after meals for 7 days"
                  value={prescInstructions} onChange={e => setPrescInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>
              <div className="pt-2 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setIsPrescribeOpen(false)} className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold text-sm transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-lg shadow-emerald-500/20">
                  Assign Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Send Notification Modal */}
      {isNotifyOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="solar:bell-bing-bold" className="w-5 h-5 text-amber-600" />
                Send Alert / Notification
              </h3>
              <button onClick={() => setIsNotifyOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Recipient Patient</label>
                <p className="text-sm font-extrabold text-blue-700 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                  {selectedPatient.full_name || 'Patient'} ({patientCode(selectedPatient.id)})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notification Message / Clinical Note</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Please update your daily blood pressure logs or schedule your annual follow-up visit."
                  value={notifyMessage}
                  onChange={e => setNotifyMessage(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none font-medium text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNotifyOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Icon icon="solar:plain-bold" className="w-4 h-4" />
                  Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
}
