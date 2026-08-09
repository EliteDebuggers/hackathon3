import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import DeleteDocumentModal from '../shared/DeleteDocumentModal';
import PendingApprovalsModal from './components/PendingApprovalsModal';
import { getLocalDietPlan } from '../../lib/medications';
import type { DietPlan } from '../../lib/medications';

interface Document {
  id: string;
  title: string;
  category: string;
  document_type: string;
  file_url: string;
  created_at: string;
  uploader_id: string;
  provider_name?: string;
}

export default function MedicalRecords() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Lab Report');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'diet'>('records');
  const [groupBy, setGroupBy] = useState<'category' | 'date' | 'provider'>('category');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRecords, setShowAllRecords] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUserAndRecords();
  }, []);

  const fetchUserAndRecords = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
      fetchDocuments(user.id);
      fetchPendingApprovals(user.id);
      const plan = getLocalDietPlan(user.id);
      setDietPlan(plan);
    } else {
      const plan = getLocalDietPlan('guest-patient');
      setDietPlan(plan);
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async (pid: string) => {
    try {
      const { data } = await supabase
        .from('pending_document_uploads')
        .select('id')
        .eq('patient_id', pid)
        .eq('status', 'pending');
      if (data) setPendingApprovalsCount(data.length);
    } catch (e) {
      console.error('Error fetching pending approvals:', e);
    }
  };

  const fetchDocuments = async (pid: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image/document to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const docType = uploadCategory === 'Lab Report' ? 'REPORT' : uploadCategory === 'Scan/Imaging' ? 'SCAN' : uploadCategory === 'Prescription' ? 'RX' : 'NOTE';

      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          patient_id: userId,
          uploader_id: userId,
          title: file.name,
          category: uploadCategory,
          document_type: docType,
          file_url: publicUrl,
        }]);

      if (dbError) throw dbError;

      fetchDocuments(userId);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const openDocument = (doc: Document) => {
    navigate(`/document/${doc.id}`);
  };

  const getDocumentBadge = (doc: Document) => {
    const type = doc.document_type || (doc.category?.includes('Report') ? 'REPORT' : doc.category?.includes('Scan') ? 'SCAN' : doc.category?.includes('Prescription') ? 'RX' : 'NOTE');
    switch (type) {
      case 'SCAN':
        return <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-md uppercase tracking-wider">SCAN</span>;
      case 'RX':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase tracking-wider">RX</span>;
      case 'NOTE':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase tracking-wider">NOTE</span>;
      case 'REPORT':
      default:
        return <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-[10px] font-bold rounded-md uppercase tracking-wider">REPORT</span>;
    }
  };

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGroupedDocs = () => {
    const grouped: Record<string, Document[]> = {};

    filteredDocs.forEach(doc => {
      let key = 'General';
      if (groupBy === 'category') {
        key = doc.category || 'General Health Records';
      } else if (groupBy === 'date') {
        const d = new Date(doc.created_at);
        key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      } else if (groupBy === 'provider') {
        key = doc.provider_name || 'Personal Uploads';
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(doc);
    });

    return grouped;
  };

  const groupedDocs = getGroupedDocs();

  return (
    <SharedLayout role="patient">
      <div className="p-3 md:p-5 w-full h-full overflow-y-auto flex flex-col gap-4">

        {/* Page Header */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Medical Records Vault</h1>
            <p className="text-xs text-gray-500 mt-0.5">Centralized, secure access to your lab reports, prescriptions, scans, and diet plans.</p>
          </div>

          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => setIsPendingModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Icon icon="solar:bell-bing-bold" className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Pending Approvals ({pendingApprovalsCount})</span>
            </button>
          )}
        </div>

        {/* Dense Folder Card View */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'records' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Medical Records ({documents.length})
                </button>
                <button
                  onClick={() => setActiveTab('diet')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'diet' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Diet & Nutrition Plan
                </button>
              </div>

              {activeTab === 'records' && (
                <div className="hidden sm:flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl text-xs">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2">Group By:</span>
                  <button
                    onClick={() => setGroupBy('category')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${groupBy === 'category' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
                  >
                    Category
                  </button>
                  <button
                    onClick={() => setGroupBy('date')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${groupBy === 'date' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
                  >
                    Date
                  </button>
                  <button
                    onClick={() => setGroupBy('provider')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${groupBy === 'provider' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
                  >
                    Provider
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'records' && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="text-xs bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none font-medium text-gray-700"
                  >
                    <option value="Lab Report">Lab Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Scan/Imaging">Scan/Imaging</option>
                    <option value="Doctor Note">Doctor Note</option>
                  </select>

                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center transition shadow-sm bg-gray-900 hover:bg-black ${uploading ? 'opacity-50' : ''}`}
                  >
                    <Icon icon="solar:add-circle-linear" className="w-4 h-4 mr-1" />
                    {uploading ? 'Uploading...' : '+ Upload Record'}
                  </label>
                </div>
              </div>
            )}
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
                  <p className="text-xs text-gray-500">Upload your lab report or doctor prescription to start organizing your health vault.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(showAllRecords ? Object.entries(groupedDocs) : Object.entries(groupedDocs).slice(0, 6)).map(([groupTitle, groupDocs]) => (
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

                  {Object.entries(groupedDocs).length > 6 && (
                    <div className="flex justify-center mt-4 border-t border-gray-100 pt-3">
                      <button
                        onClick={() => setShowAllRecords(!showAllRecords)}
                        className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Icon icon={showAllRecords ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} className="w-4 h-4 text-blue-600" />
                        {showAllRecords ? 'Show Less' : `View All ${Object.entries(groupedDocs).length} Record Folders`}
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

      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        document={documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onSuccess={(deletedId) => {
          setDocuments(prev => prev.filter(d => d.id !== deletedId));
          setDocumentToDelete(null);
        }}
      />

      <PendingApprovalsModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        patientId={userId}
        onApproved={() => {
          fetchDocuments(userId);
          fetchPendingApprovals(userId);
        }}
      />
    </SharedLayout>
  );
}
