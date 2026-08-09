import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';

import PatientAIAssistant from './components/PatientAIAssistant';
import HealthTimeline from './components/HealthTimeline';
import AppointmentBookingModal from './components/AppointmentBookingModal';
import DeleteDocumentModal from '../shared/DeleteDocumentModal';
import SharedLayout from '../../components/SharedLayout';
import { useLayoutContext } from '../../components/LayoutContext';
import { getLocalMedications, getLocalDietPlan } from '../../lib/medications';
import type { DietPlan, Medication } from '../../lib/medications';
import { getLocalDocuments, saveLocalDocument } from '../../lib/documents';

interface Document {
  id: string;
  title: string;
  file_url: string;
  document_type: string;
  created_at: string;
  uploader_id: string;
  patient_id?: string;
  doctor_id?: string | null;
  category?: string;
}


export default function PatientDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userId, setUserId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadCategory, setUploadCategory] = useState('Lab Report');
  const [chatbotWidth, setChatbotWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'diet'>('records');
  const [groupBy, setGroupBy] = useState<'category' | 'date' | 'provider'>('category');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRecords, setShowAllRecords] = useState(false);

  const navigate = useNavigate();
  const { isChatbotOpen } = useLayoutContext();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = Math.min(500, window.innerWidth * 0.4);

      if (newWidth >= 280 && newWidth <= maxWidth) {
        setChatbotWidth(newWidth);
      } else if (newWidth < 280) {
        setChatbotWidth(280);
      } else if (newWidth > maxWidth) {
        setChatbotWidth(maxWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    checkUser();
    fetchDocuments();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const pid = user ? user.id : 'guest-patient';
    setUserId(pid);
    setMedications(getLocalMedications(pid));
    setDietPlan(getLocalDietPlan(pid));
  };

  const fetchDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const pid = user ? user.id : 'guest-patient';

    let dbDocs: Document[] = [];
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });

      if (!error && data) dbDocs = data as Document[];
    } catch (err) {
      console.error(err);
    }

    const localDocs = getLocalDocuments(pid) as Document[];
    const docMap = new Map<string, Document>();
    dbDocs.forEach(d => docMap.set(d.id, d));
    localDocs.forEach(d => {
      if (!docMap.has(d.id)) docMap.set(d.id, d);
    });

    const merged = Array.from(docMap.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setDocuments(merged);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

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
        console.warn('Storage fallback activated:', storageErr);
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newDoc: Partial<Document> = {
        patient_id: userId,
        uploader_id: userId,
        title: file.name,
        file_url: publicUrl,
        document_type: uploadCategory,
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('documents')
        .insert([newDoc])
        .select()
        .single();

      const docToSave: Document = {
        id: insertedData?.id || `doc-${Date.now()}`,
        patient_id: userId,
        uploader_id: userId,
        title: file.name,
        category: uploadCategory,
        document_type: uploadCategory,
        file_url: publicUrl,
        created_at: insertedData?.created_at || new Date().toISOString()
      };

      saveLocalDocument(userId, docToSave);

      if (dbError) {
        setDocuments(prev => [docToSave, ...prev.filter(d => d.id !== docToSave.id)]);
      } else {
        fetchDocuments();
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openDocument = (doc: Document) => {
    navigate(`/document/${doc.id}`);
  };

  // Helper badge generator based on document type / title
  const getDocumentBadge = (doc: Document) => {
    const typeLower = (doc.document_type + ' ' + doc.title).toLowerCase();
    if (typeLower.includes('scan') || typeLower.includes('x-ray') || typeLower.includes('mri') || typeLower.includes('ct') || typeLower.includes('angiogram') || typeLower.includes('echo')) {
      return <span className="bg-sky-100 text-sky-700 font-bold text-[10px] px-2 py-0.5 rounded tracking-wider border border-sky-200">SCAN</span>;
    }
    if (typeLower.includes('prescription') || typeLower.includes('rx') || typeLower.includes('medication')) {
      return <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded tracking-wider border border-amber-200">RX</span>;
    }
    if (typeLower.includes('note') || typeLower.includes('doctor note') || typeLower.includes('physical')) {
      return <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded tracking-wider border border-emerald-200">NOTE</span>;
    }
    return <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded tracking-wider border border-rose-200">REPORT</span>;
  };

  // Dynamic grouping logic without dummy data
  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.document_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGroupedDocuments = () => {
    const groups: { [key: string]: Document[] } = {};

    if (groupBy === 'category') {
      filteredDocs.forEach(doc => {
        const cat = doc.document_type || 'General Medical Records';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(doc);
      });
      // Ensure default category buckets if none match
      if (Object.keys(groups).length === 0) {
        groups['General Wellness & Lab Reports'] = [];
        groups['Imaging & Diagnostic Scans'] = [];
        groups['Prescriptions & Clinical Notes'] = [];
      }
    } else if (groupBy === 'date') {
      filteredDocs.forEach(doc => {
        const d = new Date(doc.created_at);
        const monthYear = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(doc);
      });
      if (Object.keys(groups).length === 0) {
        groups['Recent Records'] = [];
      }
    } else {
      // By Provider
      filteredDocs.forEach(doc => {
        const key = doc.uploader_id === userId ? 'Uploaded by Patient' : 'Doctor Prescriptions & Reports';
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
      });
      if (!groups['Doctor Prescriptions & Reports']) groups['Doctor Prescriptions & Reports'] = [];
      if (!groups['Uploaded by Patient']) groups['Uploaded by Patient'] = [];
    }

    return groups;
  };

  const groupedDocs = getGroupedDocuments();

  const totalDocs = documents.length;
  const doctorNotes = documents.filter(d => d.document_type === 'Doctor Prescription/Note').length;
  const patientUploads = totalDocs - doctorNotes;
  const lastUpload = documents.length > 0 ? new Date(documents[0].created_at).toLocaleDateString() : 'Never';

  return (
    <SharedLayout role="patient">
      <div className="w-full mx-auto flex-1 flex flex-col lg:flex-row items-start relative overflow-x-hidden h-full">

        <div className={`flex-1 flex flex-col gap-3 w-full transition-all duration-300 ease-in-out p-2.5 md:p-4 ${isChatbotOpen ? 'lg:pr-3 mb-3 lg:mb-0' : ''}`}>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="bg-white rounded-xl p-3.5 flex items-center border border-gray-200/80 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg mr-3">
                <Icon icon="solar:file-text-bold" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Records</p>
                <h3 className="text-xl font-bold text-gray-900">{loading ? '-' : totalDocs}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex items-center border border-gray-200/80 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-lg mr-3">
                <Icon icon="solar:stethoscope-bold" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Doctor Notes</p>
                <h3 className="text-xl font-bold text-gray-900">{loading ? '-' : doctorNotes}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex items-center border border-gray-200/80 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg mr-3">
                <Icon icon="solar:file-download-bold" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Your Uploads</p>
                <h3 className="text-xl font-bold text-gray-900">{loading ? '-' : patientUploads}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex items-center border border-gray-200/80 shadow-sm hover:shadow-md transition">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg mr-3">
                <Icon icon="solar:clock-circle-bold" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Last Activity</p>
                <h3 className="text-sm font-bold text-gray-900 truncate">{loading ? '-' : lastUpload}</h3>
              </div>
            </div>
          </div>

          {/* Daily Medication Reminders Action Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-3.5 text-white shadow-md shadow-blue-500/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md text-amber-300">
                <Icon icon="solar:bell-bing-bold" className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Daily Medication Reminders</h3>
                <p className="text-xs text-blue-100">
                  {medications.length} active prescriptions • Real-time web push notifications active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => navigate('/patient-medications')}
                className="bg-white text-blue-700 hover:bg-blue-50 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1"
              >
                <Icon icon="solar:pill-bold" className="w-3.5 h-3.5" />
                Reminders Hub
              </button>
              <button
                onClick={() => navigate('/book-appointment')}
                className="bg-blue-800/70 hover:bg-blue-800 text-white border border-blue-400/30 px-3.5 py-1.5 rounded-lg font-medium text-xs transition flex items-center gap-1"
              >
                <Icon icon="solar:calendar-linear" className="w-3.5 h-3.5" />
                Book Visit
              </button>
            </div>
          </div>

          {/* Timeline */}
          <HealthTimeline patientId={userId} />

          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 shadow-lg shadow-gray-200/50">

            <div className="p-4 bg-gray-50/70 border-b border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Medical Records</h2>
                  <button
                    onClick={() => navigate('/patient-records')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                  >
                    Open Dedicated Page
                    <Icon icon="solar:alt-arrow-right-linear" className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Group By:</span>
                  <div className="inline-flex items-center bg-gray-200/70 p-0.5 rounded-lg">
                    <button
                      onClick={() => setGroupBy('category')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'category'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      [Category]
                    </button>
                    <button
                      onClick={() => setGroupBy('date')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'date'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      [Date]
                    </button>
                    <button
                      onClick={() => setGroupBy('provider')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'provider'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      [Provider]
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Box */}
                <div className="relative">
                  <Icon icon="solar:magnifer-linear" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-44 md:w-56"
                  />
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center gap-1 bg-gray-200/70 p-0.5 rounded-xl">
                  <button
                    onClick={() => setActiveTab('records')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'records'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Icon icon="solar:folder-with-files-bold" className="w-3.5 h-3.5" />
                    Records ({documents.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('diet')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'diet'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Icon icon="solar:leaf-bold" className="w-3.5 h-3.5 text-green-600" />
                    Diet Plan
                  </button>
                </div>

                {activeTab === 'records' && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value)}
                      className="border-gray-200 border rounded-xl px-2.5 py-1.5 text-xs bg-white text-gray-700 outline-none"
                      disabled={uploading}
                    >
                      <option value="Lab Report">Lab Report</option>
                      <option value="X-Ray / Scan">X-Ray / Scan</option>
                      <option value="Doctor Prescription/Note">Doctor Note</option>
                      <option value="Other">Other</option>
                    </select>

                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`cursor-pointer text-white px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center transition shadow-sm bg-gray-900 hover:bg-black ${uploading ? 'opacity-50' : ''
                          }`}
                      >
                        <Icon icon="solar:add-circle-linear" className="w-4 h-4 mr-1" />
                        {uploading ? 'Uploading...' : '+ Upload Record'}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activeTab === 'records' ? (
              <div className="p-4">
                {loading ? (
                  <div className="flex justify-center items-center py-12 text-blue-600">
                    <Icon icon="solar:pulse-linear" className="w-8 h-8 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <Icon icon="solar:folder-open-bold-duotone" className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-900 mb-1">No medical records yet</h3>
                    <p className="text-xs text-gray-500">Upload your lab report or doctor prescription to start organizing your files.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(showAllRecords ? Object.entries(groupedDocs) : Object.entries(groupedDocs).slice(0, 3)).map(([groupTitle, groupDocs]) => (
                        <div
                          key={groupTitle}
                          className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                                <Icon icon="solar:folder-with-files-bold" className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-sm leading-snug">{groupTitle}</h3>
                                <p className="text-xs text-gray-500 font-medium">{groupDocs.length} {groupDocs.length === 1 ? 'Record' : 'Records'}</p>
                              </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                              <Icon icon="solar:menu-dots-bold" className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-2 flex-1">
                            {groupDocs.length === 0 ? (
                              <p className="text-xs text-gray-400 italic py-2 text-center">No documents in this section</p>
                            ) : (
                              groupDocs.map(doc => (
                                <div
                                  key={doc.id}
                                  onClick={() => openDocument(doc)}
                                  className="group/item flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/60 transition cursor-pointer border border-transparent hover:border-blue-100"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <Icon icon="solar:file-text-linear" className="w-4 h-4 text-gray-400 group-hover/item:text-blue-600 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-900 group-hover/item:text-blue-700 truncate leading-tight">
                                        {doc.title}
                                      </p>
                                      <p className="text-[10px] text-gray-500 mt-0.5">
                                        {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {getDocumentBadge(doc)}
                                    {doc.uploader_id === userId && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDocumentToDelete(doc); }}
                                        className="text-gray-300 hover:text-red-600 p-0.5 transition"
                                        title="Delete"
                                      >
                                        <Icon icon="solar:trash-bin-trash-linear" className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {Object.entries(groupedDocs).length > 3 && (
                      <div className="flex justify-center mt-4 border-t border-gray-100 pt-3">
                        <button
                          onClick={() => setShowAllRecords(!showAllRecords)}
                          className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Icon icon={showAllRecords ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} className="w-4 h-4 text-blue-600" />
                          {showAllRecords ? 'Show Less' : `View All ${Object.entries(groupedDocs).length} Record Categories`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {dietPlan ? (
                  <>
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 p-4 rounded-xl border border-teal-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Doctor Prescribed Diet Plan
                        </span>
                        <h3 className="text-xl font-extrabold text-teal-950 mt-1">{dietPlan.title}</h3>
                        <p className="text-xs text-teal-700 font-medium mt-0.5">Prescribed by {dietPlan.doctor_name || 'Nutrition Specialist'}</p>
                      </div>

                      <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-teal-100/50 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Daily Target</p>
                        <p className="text-xl font-black text-teal-600">{dietPlan.target_calories} <span className="text-xs font-normal text-gray-500">kcal</span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Protein</p>
                        <p className="text-base font-bold text-amber-900 mt-0.5">{dietPlan.protein_g}g</p>
                      </div>
                      <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Carbs</p>
                        <p className="text-base font-bold text-blue-900 mt-0.5">{dietPlan.carbs_g}g</p>
                      </div>
                      <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Healthy Fats</p>
                        <p className="text-base font-bold text-purple-900 mt-0.5">{dietPlan.fats_g}g</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                        <div className="flex items-center gap-1.5 mb-1 text-amber-600 font-bold text-xs">
                          <Icon icon="solar:sun-bold" className="w-4 h-4" /> Breakfast
                        </div>
                        <p className="text-xs text-gray-700 font-medium">{dietPlan.breakfast || 'N/A'}</p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                        <div className="flex items-center gap-1.5 mb-1 text-blue-600 font-bold text-xs">
                          <Icon icon="solar:sun-fog-bold" className="w-4 h-4" /> Lunch
                        </div>
                        <p className="text-xs text-gray-700 font-medium">{dietPlan.lunch || 'N/A'}</p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                        <div className="flex items-center gap-1.5 mb-1 text-indigo-600 font-bold text-xs">
                          <Icon icon="solar:moon-stars-bold" className="w-4 h-4" /> Dinner
                        </div>
                        <p className="text-xs text-gray-700 font-medium">{dietPlan.dinner || 'N/A'}</p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                        <div className="flex items-center gap-1.5 mb-1 text-emerald-600 font-bold text-xs">
                          <Icon icon="solar:cup-bold" className="w-4 h-4" /> Snacks
                        </div>
                        <p className="text-xs text-gray-700 font-medium">{dietPlan.snacks || 'N/A'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">No diet plan assigned yet.</div>
                )}
              </div>
            )}
          </div>

        </div>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 border-l border-gray-200 relative ${isChatbotOpen ? 'opacity-100' : 'opacity-0 border-transparent w-0'}`}
          style={{
            width: isChatbotOpen ? (window.innerWidth < 1024 ? '100%' : `${chatbotWidth}px`) : '0px',
            maxWidth: '100%'
          }}
        >
          {isChatbotOpen && (
            <div
              className="absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 z-10 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
            />
          )}
          <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-4rem)] h-full overflow-y-auto w-full no-scrollbar min-w-[280px] bg-white">
            <PatientAIAssistant patientId={userId} documents={documents} />
          </div>
        </div>
      </div>

      <AppointmentBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        patientId={userId}
      />

      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        document={documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onSuccess={(deletedId) => {
          setDocuments(prev => prev.filter(d => d.id !== deletedId));
          setDocumentToDelete(null);
        }}
      />
    </SharedLayout>
  );
}
