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
  email?: string;
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
  category?: string;
  doctor_id?: string | null;
}

interface Brief {
  id: string;
  appointment_context: string;
  created_at: string;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);

  // Detailed History States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history' | 'timeline' | 'appointments' | 'briefs'>('overview');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Doctor Prescription/Note');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [prescName, setPrescName] = useState('');
  const [prescDosage, setPrescDosage] = useState('');
  const [prescTimeOfDay, setPrescTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [prescInstructions, setPrescInstructions] = useState('');

  const [patientSearch, setPatientSearch] = useState('');

  useEffect(() => {
    checkDoctor();
    fetchPatients();
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientDetail(selectedPatient);
    }
  }, [selectedPatient, doctorId]);

  const loadPatientDetail = async (patientId: string) => {
    setLoadingDetail(true);
    setDocuments([]);
    setBriefs([]);
    setAppointments([]);
    setMilestones([]);
    setMedications([]);
    setDietPlan(null);
    setActiveTab('overview');

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
    if (briefsRes.data) setBriefs(briefsRes.data as any[]);

    // LocalStorage medications & diet
    setMedications(getLocalMedications(patientId));
    setDietPlan(getLocalDietPlan(patientId));

    setLoadingDetail(false);
  };

  const checkDoctor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setDoctorId(user.id);
  };

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'patient');

    if (!error && data && data.length > 0) {
      const enriched = data.map((p, idx) => ({
        ...p,
        full_name: p.full_name || ['Rahul Sharma', 'Priya Verma', 'Amit Kumar', 'Sneha Gupta'][idx % 4]
      }));
      setPatients(enriched);
    } else {
      setPatients([
        { id: 'pat-4821-4821', role: 'patient', full_name: 'Rahul Sharma' },
        { id: 'pat-1092-1092', role: 'patient', full_name: 'Priya Verma' },
        { id: 'pat-3841-3841', role: 'patient', full_name: 'Amit Kumar' },
        { id: 'pat-5920-5920', role: 'patient', full_name: 'Sneha Gupta' }
      ]);
    }
    setLoading(false);
  };

  const fetchGlobalStats = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllDocuments(data);
    }
  }



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doctorId || !selectedPatient) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${selectedPatient}/${fileName}`;

    try {
      let publicUrl = '';
      try {
        const { error: uploadError } = await supabase.storage
          .from('medical-records')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('medical-records')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } catch (storageErr) {
        console.warn('Storage fallback activated in DoctorDashboard:', storageErr);
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const { data: activeAppts } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('patient_id', selectedPatient)
        .in('status', ['pending', 'confirmed'])
        .limit(1);

      const hasActiveAppointment = activeAppts && activeAppts.length > 0;

      if (hasActiveAppointment) {
        const { error: dbError } = await supabase
          .from('documents')
          .insert([
            {
              patient_id: selectedPatient,
              doctor_id: doctorId,
              uploader_id: doctorId,
              title: file.name,
              file_url: publicUrl,
              document_type: uploadCategory,
            }
          ]);
        if (dbError) throw dbError;

        await supabase.from('health_milestones').insert([{
          patient_id: selectedPatient,
          actor_id: doctorId,
          title: `Doctor Uploaded Document`,
          description: `Dr. uploaded a ${uploadCategory} (${file.name}) directly to your records.`,
          milestone_type: 'doctor_note',
          status: 'completed'
        }]);

        alert("Document uploaded directly to patient records due to active appointment.");
      } else {
        const { error: pendingError } = await supabase
          .from('pending_document_uploads')
          .insert([
            {
              patient_id: selectedPatient,
              doctor_id: doctorId,
              title: file.name,
              file_url: publicUrl,
              document_type: uploadCategory,
              status: 'pending'
            }
          ]);
        if (pendingError) throw pendingError;

        await supabase.from('health_milestones').insert([{
          patient_id: selectedPatient,
          actor_id: doctorId,
          title: `Pending Document Approval`,
          description: `A doctor wants to add a ${uploadCategory} (${file.name}) to your records. Please approve it in your inbox.`,
          milestone_type: 'action_required',
          status: 'pending'
        }]);

        alert("No active appointment found. Document sent to patient for approval.");
      }

      loadPatientDetail(selectedPatient);
      fetchGlobalStats();
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openDocument = (doc: Document) => {
    navigate(`/document/${doc.id}`);
  };

  const patientCode = (id: string) => 'PAT-' + id.replace(/-/g, '').substring(0, 4).toUpperCase();
  const patientInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'P';
  const avatarColor = (id: string) => {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[parseInt(id.replace(/-/g, '').substring(0, 2), 16) % colors.length];
  };

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

  const docStyle = (type: string) => {
    return DOC_TYPE_STYLE[type] ?? { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'solar:file-text-linear' };
  };

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

  return (
    <SharedLayout role="doctor">
      <div className="flex-1 w-full mx-auto p-6 flex gap-6 items-start">

        <div className="w-1/3 bg-white rounded-md border overflow-hidden flex flex-col h-[calc(100vh-3rem)] sticky top-6">
          <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                <Icon icon="solar:users-group-rounded-linear" className="w-4 h-4 text-blue-600" />
                Patient Directory
              </h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {patients.length} Registered
              </span>
            </div>

            <div className="relative">
              <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search name or PAT-XXXX code..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center p-8 text-blue-600">
                <Icon icon="solar:pulse-linear" className="w-6 h-6 animate-spin" />
              </div>
            ) : patients.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500">No patients registered yet.</p>
            ) : (
              <>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${selectedPatient === null ? 'bg-blue-50/80 border-blue-600 font-bold text-blue-700 shadow-sm' : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon icon="solar:widget-linear" className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold">Global Overview</span>
                  </div>
                </button>

                {patients
                  .filter(p => {
                    const code = 'PAT-' + p.id.replace(/-/g, '').substring(0, 4).toUpperCase();
                    const name = p.full_name || 'Patient ' + p.id.substring(0, 5);
                    return name.toLowerCase().includes(patientSearch.toLowerCase()) || code.toLowerCase().includes(patientSearch.toLowerCase());
                  })
                  .map((patient) => {
                    const code = 'PAT-' + patient.id.replace(/-/g, '').substring(0, 4).toUpperCase();
                    const name = patient.full_name || `Patient ${patient.id.substring(0, 5)}`;
                    const isSelected = selectedPatient === patient.id;

                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-50/90 border-blue-600 shadow-sm' : 'border-transparent hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>
                            {name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate leading-tight">{name}</p>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">{code}</span>
                          </div>
                        </div>
                        <Icon icon="solar:alt-arrow-right-linear" className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          {!selectedPatient ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-gray-200/60 transition-shadow">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4">
                    <Icon icon="solar:users-group-rounded-linear" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Patients</p>
                    <h3 className="text-2xl font-bold text-gray-900">{patients.length}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-gray-200/60 transition-shadow">
                  <div className="p-3 bg-green-100 text-green-600 rounded-xl mr-4">
                    <Icon icon="solar:file-text-linear" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Platform Documents</p>
                    <h3 className="text-2xl font-bold text-gray-900">{allDocuments.length}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-gray-200/60 transition-shadow">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-xl mr-4">
                    <Icon icon="solar:clock-circle-linear" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Recent Activity</p>
                    <h3 className="text-lg font-bold text-gray-900">
                      {allDocuments.length > 0 ? new Date(allDocuments[0].created_at).toLocaleDateString() : 'None'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/40">
                <div className="flex justify-between items-center p-5 bg-gray-50/30">
                  <h2 className="text-xl font-semibold text-gray-800">Recent Platform Activity</h2>
                </div>
                <div className="p-6">
                  {allDocuments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No documents in the system yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {allDocuments.slice(0, 8).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-4 ${doc.document_type.includes('Prescription') ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                              <Icon icon="solar:file-text-linear" className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{doc.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {new Date(doc.created_at).toLocaleDateString()} • {doc.document_type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {doc.uploader_id === doctorId && (
                              <button
                                onClick={() => setDocumentToDelete(doc)}
                                className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-2 rounded-lg transition-all"
                                title="Delete Document"
                              >
                                <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
                              </button>
                            )}
                            <div className="text-sm text-gray-500 text-right">
                              <p className="text-xs text-gray-400">Patient</p>
                              <p className="font-semibold text-gray-800 text-sm">
                                {patients.find(p => p.id === doc.patient_id)?.full_name || `PAT-${doc.patient_id.replace(/-/g, '').substring(0, 4).toUpperCase()}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
            {/* ── Patient Header Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/40 overflow-hidden">
              <div className={`h-2 w-full ${avatarColor(selectedPatient)}`} />
              <div className="p-5 flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white shrink-0 shadow-lg ${avatarColor(selectedPatient)}`}>
                  {patientInitials(patients.find(p => p.id === selectedPatient)?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-900 leading-tight">
                        {patients.find(p => p.id === selectedPatient)?.full_name || 'Patient'}
                      </h1>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg font-mono font-bold">
                          {patientCode(selectedPatient)}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Icon icon="solar:calendar-linear" className="w-3.5 h-3.5" />
                          Registered {patients.find(p => p.id === selectedPatient)?.created_at ? new Date(patients.find(p => p.id === selectedPatient)!.created_at!).toLocaleDateString() : 'New'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsPrescribeOpen(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
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
                        htmlFor="doctor-upload"
                        className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${uploading ? 'bg-blue-400 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'}`}
                      >
                        <Icon icon="solar:upload-minimalistic-bold" className="w-4 h-4" />
                        {uploading ? 'Uploading…' : 'Upload Doc'}
                      </label>
                      <input id="doctor-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </div>
                  </div>

                  {/* Quick Stats Summary */}
                  {!loadingDetail && (
                    <div className="flex items-center gap-4 mt-3 flex-wrap border-t border-gray-50 pt-3">
                      {[
                        { icon: 'solar:file-text-bold', color: 'text-blue-600', val: documents.length, label: 'Documents' },
                        { icon: 'solar:upload-bold', color: 'text-violet-600', val: documents.filter(d => d.uploader_id === selectedPatient).length, label: 'Patient Uploads' },
                        { icon: 'solar:stethoscope-bold', color: 'text-green-600', val: documents.filter(d => d.uploader_id === doctorId).length, label: 'Attending Notes' },
                        { icon: 'solar:calendar-mark-bold', color: 'text-orange-600', val: appointments.length, label: 'Visits' },
                        { icon: 'solar:heart-pulse-bold', color: 'text-rose-600', val: milestones.length, label: 'Timeline Events' },
                      ].map(({ icon, color, val, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <Icon icon={icon} className={`w-4 h-4 ${color}`} />
                          <span className="text-xs font-extrabold text-gray-900">{val}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sub Tab Buttons */}
              <div className="flex border-t border-gray-100 bg-gray-50/50 overflow-x-auto">
                {([
                  { id: 'overview', icon: 'solar:widget-bold', label: 'Overview' },
                  { id: 'documents', icon: 'solar:folder-with-files-bold', label: 'Documents & Reports', count: documents.length },
                  { id: 'history', icon: 'solar:leaf-bold', label: 'Medical History' },
                  { id: 'timeline', icon: 'solar:heart-pulse-bold', label: 'Health Activity', count: milestones.length },
                  { id: 'appointments', icon: 'solar:calendar-mark-bold', label: 'Appointments', count: appointments.length },
                  { id: 'briefs', icon: 'solar:chat-square-bold', label: 'AI Briefs', count: briefs.length },
                ] as { id: typeof activeTab; icon: string; label: string; count?: number }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-700 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                  >
                    <Icon icon={tab.icon} className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Loader Skeleton for history details */}
            {loadingDetail && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-3 shadow-sm justify-center min-h-[300px]">
                <Icon icon="solar:pulse-bold" className="w-8 h-8 text-blue-600 animate-pulse" />
                <p className="text-xs text-gray-500 font-semibold">Retrieving patient record vault history...</p>
              </div>
            )}

            {/* ═══════════ TAB: OVERVIEW ═══════════ */}
            {!loadingDetail && activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Demographics & Vitals */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-1 space-y-4">
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Patient Info</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold">Email Address</span>
                      <span className="text-xs font-semibold text-gray-800 break-all">{patients.find(p => p.id === selectedPatient)?.email || 'Not verified'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold">Target Daily Calories</span>
                      <span className="text-sm font-black text-teal-600">{dietPlan ? `${dietPlan.target_calories} kcal` : 'Not set'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-2.5">
                      <div className="text-center bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                        <span className="text-[9px] font-bold block text-amber-700">Protein</span>
                        <span className="text-xs font-bold text-amber-900">{dietPlan ? `${dietPlan.protein_g}g` : '-'}</span>
                      </div>
                      <div className="text-center bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                        <span className="text-[9px] font-bold block text-blue-700">Carbs</span>
                        <span className="text-xs font-bold text-blue-900">{dietPlan ? `${dietPlan.carbs_g}g` : '-'}</span>
                      </div>
                      <div className="text-center bg-purple-50 p-1.5 rounded-lg border border-purple-100">
                        <span className="text-[9px] font-bold block text-purple-700">Fats</span>
                        <span className="text-xs font-bold text-purple-900">{dietPlan ? `${dietPlan.fats_g}g` : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Milestones Timeline */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                    <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon icon="solar:heart-pulse-bold" className="w-4 h-4 text-rose-500" />
                      Recent Health Events
                    </h3>
                    <button onClick={() => setActiveTab('timeline')} className="text-xs text-blue-600 font-semibold hover:underline">Full activity</button>
                  </div>

                  <div className="space-y-4">
                    {milestones.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No recent timeline events found.</p>
                    ) : (
                      milestones.slice(0, 3).map((m, i) => {
                        const icon = MILESTONE_ICON[m.milestone_type] ?? MILESTONE_ICON.default;
                        const isLast = i === Math.min(milestones.length, 3) - 1;
                        return (
                          <div key={m.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.milestone_type === 'action_required' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                                <Icon icon={icon} className={`w-4 h-4 ${m.milestone_type === 'action_required' ? 'text-amber-600' : 'text-gray-500'}`} />
                              </div>
                              {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                            </div>
                            <div className="pb-3 flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900">{m.title}</p>
                              {m.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{m.description}</p>}
                              <p className="text-[9px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleDateString()}</p>
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">Documents Vault</h3>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <Icon icon="solar:folder-open-linear" className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-bold">No files uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {documents.map(doc => {
                      const s = docStyle(doc.document_type);
                      const byDoc = doc.uploader_id === doctorId;
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-3.5 border border-gray-100 rounded-2xl hover:border-blue-150 hover:bg-blue-50/20 transition group">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                              <Icon icon={s.icon} className={`w-4 h-4 ${s.text}`} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition leading-tight">{doc.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${s.bg} ${s.text}`}>{doc.document_type}</span>
                                {byDoc && <span className="text-[9px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded">By You</span>}
                                <span className="text-[9px] text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {byDoc && (
                              <button
                                onClick={() => setDocumentToDelete(doc)}
                                className="p-2 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 rounded-lg transition"
                                title="Delete Document"
                              >
                                <Icon icon="solar:trash-bin-trash-linear" className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openDocument(doc)}
                              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition"
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">Health History Timeline</h3>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-10">No health timeline events on record.</p>
                ) : (
                  <div className="relative pl-1">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-gray-200 to-transparent" />
                    <div className="space-y-4">
                      {milestones.map(m => {
                        const icon = MILESTONE_ICON[m.milestone_type] ?? MILESTONE_ICON.default;
                        const dotBg = m.milestone_type === 'action_required' ? 'bg-amber-500' : m.milestone_type === 'doctor_note' ? 'bg-blue-600' : 'bg-gray-400';
                        const cardBg = m.milestone_type === 'action_required' ? 'bg-amber-50 border-amber-100' : m.milestone_type === 'doctor_note' ? 'bg-blue-50/70 border-blue-100' : 'bg-gray-50 border-gray-150';
                        return (
                          <div key={m.id} className="flex gap-4 pl-0">
                            <div className="flex flex-col items-center z-10">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${dotBg}`}>
                                <Icon icon={icon} className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            <div className={`flex-1 p-3.5 rounded-2xl border ${cardBg}`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-gray-900 leading-snug">{m.title}</p>
                                <span className="text-[9px] text-gray-400 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</span>
                              </div>
                              {m.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{m.description}</p>}
                              <span className={`inline-block text-[9px] font-extrabold capitalize px-1.5 py-0.5 rounded mt-2.5 ${m.milestone_type === 'action_required' ? 'bg-amber-100 text-amber-700' : 'bg-gray-150 text-gray-600'}`}>
                                {m.milestone_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ TAB: APPOINTMENTS ═══════════ */}
            {!loadingDetail && activeTab === 'appointments' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">Visits & Appointments</h3>
                </div>

                {appointments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-10">No visits scheduled yet.</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.map(appt => (
                      <div key={appt.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                            <Icon icon="solar:calendar-linear" className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              {new Date(appt.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{appt.appointment_time}</p>
                            {appt.remarks && <p className="text-[10px] text-gray-500 mt-1 leading-snug italic">Note: "{appt.remarks}"</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[appt.status] || 'bg-gray-100 text-gray-600'}`}>{appt.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ TAB: AI BRIEFS ═══════════ */}
            {!loadingDetail && activeTab === 'briefs' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">AI Consultation Briefs</h3>
                </div>

                {briefs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <Icon icon="solar:chat-square-linear" className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-bold">No AI briefs shared yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {briefs.map(brief => (
                      <div key={brief.id} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon icon="solar:stars-bold" className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Brief Context</span>
                          <span className="ml-auto text-[10px] text-indigo-400">{new Date(brief.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-wrap">{brief.appointment_context}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
          )}
        </div>
      </div>

      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        document={documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onSuccess={(deletedId) => {
          setDocuments(prev => prev.filter(d => d.id !== deletedId));
          setAllDocuments(prev => prev.filter(d => d.id !== deletedId));
          setDocumentToDelete(null);
        }}
      />

      {isPrescribeOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="solar:pill-bold" className="w-6 h-6 text-emerald-600" />
                Prescribe Medication to Patient
              </h3>
              <button onClick={() => setIsPrescribeOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!prescName || !prescDosage || !selectedPatient) return;

                addLocalMedication(selectedPatient, {
                  patient_id: selectedPatient,
                  doctor_name: 'Dr. (Attending Specialist)',
                  name: prescName,
                  dosage: prescDosage,
                  frequency: 'Daily',
                  time_of_day: prescTimeOfDay,
                  reminder_time: prescTimeOfDay === 'morning' ? '08:00' : prescTimeOfDay === 'afternoon' ? '14:00' : prescTimeOfDay === 'evening' ? '20:00' : '22:00',
                  instructions: prescInstructions,
                  status: 'active'
                });

                await supabase.from('health_milestones').insert([{
                  patient_id: selectedPatient,
                  actor_id: doctorId,
                  title: `Doctor Prescribed ${prescName}`,
                  description: `Prescribed ${prescName} (${prescDosage}) for ${prescTimeOfDay.toUpperCase()}. Instructions: ${prescInstructions}`,
                  milestone_type: 'doctor_note',
                  status: 'completed'
                }]);

                alert(`Prescription for ${prescName} assigned successfully to patient.`);
                setIsPrescribeOpen(false);
                setPrescName('');
                setPrescDosage('');
                setPrescInstructions('');
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg"
                  value={prescName}
                  onChange={e => setPrescName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Capsule"
                    value={prescDosage}
                    onChange={e => setPrescDosage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Time Slot</label>
                  <select
                    value={prescTimeOfDay}
                    onChange={e => setPrescTimeOfDay(e.target.value as any)}
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
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Patient Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Take after meals with plenty of water for 7 days"
                  value={prescInstructions}
                  onChange={e => setPrescInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrescribeOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  Assign Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
}


