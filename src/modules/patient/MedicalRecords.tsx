import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import DeleteDocumentModal from '../shared/DeleteDocumentModal';
import PendingApprovalsModal from './components/PendingApprovalsModal';
import { getLocalDietPlan, saveLocalDietPlan } from '../../lib/medications';
import type { DietPlan } from '../../lib/medications';
import { getLocalDocuments, saveLocalDocument, removeLocalDocument } from '../../lib/documents';

interface Document {
  id: string;
  title: string;
  category: string;
  document_type: string;
  file_url: string;
  created_at: string;
  uploader_id: string;
  patient_id?: string;
  doctor_id?: string | null;
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

  // Custom Folders & Multi-Folder Mapping State
  const [customFolders, setCustomFolders] = useState<string[]>(['Lab Reports', 'Prescriptions', 'Cardiology Scans', 'Nutrition & Diet']);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [docFolderMap, setDocFolderMap] = useState<Record<string, string[]>>({});
  const [mappingDoc, setMappingDoc] = useState<Document | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ name: string; count: number } | null>(null);

  // Pre-Upload File Preview & Target Folder Modal State
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string>('Lab Reports');
  const [isCreatingNewFolderInModal, setIsCreatingNewFolderInModal] = useState(false);
  const [modalNewFolderName, setModalNewFolderName] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Custom Diet Plan Editor State
  const [isEditDietOpen, setIsEditDietOpen] = useState(false);
  const [dietTitle, setDietTitle] = useState('');
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(120);
  const [carbs, setCarbs] = useState(220);
  const [fats, setFats] = useState(65);
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');
  const [snacks, setSnacks] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchUserAndRecords();
  }, []);

  const fetchUserAndRecords = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const pid = user ? user.id : 'guest-patient';
    setUserId(pid);

    fetchDocuments(pid);
    if (user) {
      fetchPendingApprovals(user.id);
    }

    const plan = getLocalDietPlan(pid);
    setDietPlan(plan);
    if (plan) {
      setDietTitle(plan.title || 'My Daily Health Diet');
      setCalories(plan.target_calories || 2000);
      setProtein(plan.protein_g || 120);
      setCarbs(plan.carbs_g || 220);
      setFats(plan.fats_g || 65);
      setBreakfast(plan.breakfast || '');
      setLunch(plan.lunch || '');
      setDinner(plan.dinner || '');
      setSnacks(plan.snacks || '');
    }

    // Load Local Folder Maps & Folders
    try {
      const savedFolders = localStorage.getItem(`swasth_folders_${pid}`);
      if (savedFolders) setCustomFolders(JSON.parse(savedFolders));
      const savedMap = localStorage.getItem(`swasth_doc_map_${pid}`);
      if (savedMap) setDocFolderMap(JSON.parse(savedMap));
    } catch (e) {}
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
      let dbDocs: Document[] = [];
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('patient_id', pid)
          .order('created_at', { ascending: false });

        if (!error && data) dbDocs = data as Document[];
      } catch (err) {
        console.error('Error fetching documents from db:', err);
      }

      const localDocs = getLocalDocuments(pid) as Document[];
      const docMap = new Map<string, Document>();
      dbDocs.forEach(d => docMap.set(d.id, d));
      localDocs.forEach(d => {
        if (!docMap.has(d.id)) {
          docMap.set(d.id, d);
        }
      });

      const merged = Array.from(docMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(merged);
    } catch (err) {
      console.error('Error in fetchDocuments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    if (!customFolders.includes(name)) {
      const updated = [...customFolders, name];
      setCustomFolders(updated);
      localStorage.setItem(`swasth_folders_${userId}`, JSON.stringify(updated));
    }
    setNewFolderName('');
    setIsNewFolderOpen(false);
  };

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const folderName = folderToDelete.name;

    const updatedFolders = customFolders.filter(f => f !== folderName);
    setCustomFolders(updatedFolders);
    localStorage.setItem(`swasth_folders_${userId}`, JSON.stringify(updatedFolders));

    const newDocMap = { ...docFolderMap };
    Object.keys(newDocMap).forEach(docId => {
      newDocMap[docId] = (newDocMap[docId] || []).filter(f => f !== folderName);
    });
    setDocFolderMap(newDocMap);
    localStorage.setItem(`swasth_doc_map_${userId}`, JSON.stringify(newDocMap));

    setFolderToDelete(null);
  };

  const toggleDocFolderMap = (docId: string, folderName: string) => {
    const current = docFolderMap[docId] || [];
    const isMapped = current.includes(folderName);
    const updated = isMapped ? current.filter(f => f !== folderName) : [...current, folderName];
    const newMap = { ...docFolderMap, [docId]: updated };
    setDocFolderMap(newMap);
    localStorage.setItem(`swasth_doc_map_${userId}`, JSON.stringify(newMap));
  };

  const handleSaveDietPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const updatedPlan: DietPlan = {
      id: dietPlan?.id || `diet-${Date.now()}`,
      patient_id: userId,
      doctor_name: dietPlan?.doctor_name || 'Self Customized',
      title: dietTitle || 'Personalized Health Diet',
      target_calories: Number(calories),
      protein_g: Number(protein),
      carbs_g: Number(carbs),
      fats_g: Number(fats),
      breakfast: breakfast,
      lunch: lunch,
      dinner: dinner,
      snacks: snacks,
      recommended_foods: dietPlan?.recommended_foods || [],
      restricted_foods: dietPlan?.restricted_foods || [],
      updated_at: new Date().toISOString()
    };

    saveLocalDietPlan(userId, updatedPlan);
    setDietPlan(updatedPlan);
    setIsEditDietOpen(false);
    alert('Diet & Nutrition Plan updated successfully!');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setSelectedFileForUpload(file);
    const objectUrl = URL.createObjectURL(file);
    setUploadPreviewUrl(objectUrl);
    setUploadTargetFolder(customFolders[0] || uploadCategory);
    setIsCreatingNewFolderInModal(false);
    setModalNewFolderName('');
    setIsUploadModalOpen(true);
    event.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!selectedFileForUpload || !userId) return;
    try {
      setUploading(true);
      const file = selectedFileForUpload;
      let targetFolder = uploadTargetFolder;

      if (isCreatingNewFolderInModal && modalNewFolderName.trim()) {
        const newFolder = modalNewFolderName.trim();
        targetFolder = newFolder;
        if (!customFolders.includes(newFolder)) {
          const updated = [...customFolders, newFolder];
          setCustomFolders(updated);
          localStorage.setItem(`swasth_folders_${userId}`, JSON.stringify(updated));
        }
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      let publicUrl = '';
      try {
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } catch (storageErr) {
        console.warn('Supabase storage bucket fallback activated:', storageErr);
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const docType = uploadCategory === 'Lab Report' ? 'REPORT' : uploadCategory === 'Scan/Imaging' ? 'SCAN' : uploadCategory === 'Prescription' ? 'RX' : 'NOTE';

      const newDoc: Partial<Document> = {
        patient_id: userId,
        uploader_id: userId,
        title: file.name,
        category: uploadCategory,
        document_type: docType,
        file_url: publicUrl,
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('documents')
        .insert([newDoc])
        .select()
        .single();

      let createdDocId = insertedData?.id;

      const docToSave: Document = {
        id: createdDocId || `doc-${Date.now()}`,
        patient_id: userId,
        uploader_id: userId,
        title: file.name,
        category: uploadCategory,
        document_type: docType,
        file_url: publicUrl,
        created_at: insertedData?.created_at || new Date().toISOString()
      };
      createdDocId = docToSave.id;

      saveLocalDocument(userId, docToSave);

      if (dbError) {
        setDocuments(prev => [docToSave, ...prev.filter(d => d.id !== docToSave.id)]);
      } else {
        fetchDocuments(userId);
      }

      if (createdDocId && targetFolder) {
        const currentMapped = docFolderMap[createdDocId] || [];
        if (!currentMapped.includes(targetFolder)) {
          const newMap = { ...docFolderMap, [createdDocId]: [...currentMapped, targetFolder] };
          setDocFolderMap(newMap);
          localStorage.setItem(`swasth_doc_map_${userId}`, JSON.stringify(newMap));
        }
      }

      setIsUploadModalOpen(false);
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
        setUploadPreviewUrl(null);
      }
      setSelectedFileForUpload(null);
    } catch (error: any) {
      alert(error.message || 'File upload failed.');
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

    if (groupBy === 'category') {
      customFolders.forEach(folder => {
        grouped[folder] = [];
      });
    }

    filteredDocs.forEach(doc => {
      let keys: string[] = ['General Health Records'];

      if (groupBy === 'category') {
        const mapped = docFolderMap[doc.id] || [];
        keys = mapped.length > 0 ? mapped : [doc.category || 'General Health Records'];
      } else if (groupBy === 'date') {
        const d = new Date(doc.created_at);
        keys = [d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })];
      } else if (groupBy === 'provider') {
        keys = [doc.provider_name || 'Personal Uploads'];
      }

      keys.forEach(key => {
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(doc);
      });
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

            {activeTab === 'records' ? (
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  onClick={() => setIsNewFolderOpen(true)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-blue-200"
                >
                  <Icon icon="solar:folder-add-bold" className="w-4 h-4" />
                  + New Folder
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
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
            ) : (
              <button
                onClick={() => setIsEditDietOpen(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Icon icon="solar:pen-bold" className="w-4 h-4" />
                Customize Nutrition Targets
              </button>
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

                          {groupBy === 'category' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete({ name: groupTitle, count: groupDocs.length });
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title={`Delete ${groupTitle} folder`}
                            >
                              <Icon icon="solar:trash-bin-trash-linear" className="w-4 h-4" />
                            </button>
                          )}
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

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setMappingDoc(doc); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                                    title="Map to Folders"
                                  >
                                    <Icon icon="solar:folder-path-connect-linear" className="w-4 h-4" />
                                  </button>
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
                        Doctor & Custom Prescribed Diet
                      </span>
                      <h3 className="text-xl font-extrabold text-teal-950 mt-1">{dietPlan.title}</h3>
                      <p className="text-xs text-teal-700 font-medium mt-0.5">Assigned by {dietPlan.doctor_name || 'Nutrition Specialist'}</p>
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

      {/* New Custom Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Icon icon="solar:folder-add-bold" className="w-5 h-5 text-blue-600" />
              Create Custom Folder
            </h3>
            <form onSubmit={handleAddFolder} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Folder Name (e.g. Annual Health 2026)"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewFolderOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Warning Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Icon icon="solar:danger-triangle-bold" className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Folder</h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Are you sure you want to delete the folder <span className="font-bold text-gray-900">"{folderToDelete.name}"</span>?
            </p>
            {folderToDelete.count > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium mb-4 flex items-start gap-2">
                <Icon icon="solar:bell-bing-bold" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> This folder currently contains <strong>{folderToDelete.count} document{folderToDelete.count > 1 ? 's' : ''}</strong>. Deleting the folder will remove this folder classification from those documents.
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Record Preview & Folder Select Modal */}
      {isUploadModalOpen && selectedFileForUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="solar:upload-track-bold" className="w-5 h-5 text-blue-600" />
                Preview & Upload Record
              </h3>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
                  setSelectedFileForUpload(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Document Preview Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[160px]">
                {selectedFileForUpload.type.startsWith('image/') && uploadPreviewUrl ? (
                  <img
                    src={uploadPreviewUrl}
                    alt="Upload Preview"
                    className="max-h-52 w-auto object-contain rounded-xl shadow-sm border border-gray-200"
                  />
                ) : (
                  <div className="text-center py-4">
                    <Icon icon="solar:file-text-bold-duotone" className="w-16 h-16 text-blue-600 mx-auto mb-2" />
                    <p className="font-bold text-gray-900 text-sm truncate max-w-xs">{selectedFileForUpload.name}</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                      {(selectedFileForUpload.size / (1024 * 1024)).toFixed(2)} MB • {selectedFileForUpload.type || 'Document'}
                    </p>
                  </div>
                )}
              </div>

              {/* Record Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Document Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Lab Report', 'Prescription', 'Scan/Imaging', 'Doctor Note'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setUploadCategory(cat)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                        uploadCategory === cat
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Folder Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Destination Folder</label>
                <div className="space-y-2">
                  <select
                    value={isCreatingNewFolderInModal ? '__NEW__' : uploadTargetFolder}
                    onChange={e => {
                      if (e.target.value === '__NEW__') {
                        setIsCreatingNewFolderInModal(true);
                      } else {
                        setIsCreatingNewFolderInModal(false);
                        setUploadTargetFolder(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {customFolders.map(folder => (
                      <option key={folder} value={folder}>
                        📁 {folder}
                      </option>
                    ))}
                    <option value="__NEW__">+ Create New Folder...</option>
                  </select>

                  {isCreatingNewFolderInModal && (
                    <div className="flex gap-2 items-center pt-1 animate-fade-in">
                      <input
                        type="text"
                        placeholder="Enter new folder name..."
                        value={modalNewFolderName}
                        onChange={e => setModalNewFolderName(e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-blue-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 shrink-0 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
                  setSelectedFileForUpload(null);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={handleConfirmUpload}
                className={`px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Icon icon="solar:pulse-linear" className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:upload-linear" className="w-4 h-4" />
                    Confirm & Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Document to Folders Modal */}
      {mappingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Icon icon="solar:folder-path-connect-bold" className="w-5 h-5 text-blue-600" />
              Map Document to Folders
            </h3>
            <p className="text-xs text-gray-500 mb-4 truncate font-medium">Assign <span className="font-bold text-gray-800">{mappingDoc.title}</span> to multiple folders.</p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {customFolders.map(folder => {
                const isMapped = (docFolderMap[mappingDoc.id] || []).includes(folder);
                return (
                  <div
                    key={folder}
                    onClick={() => toggleDocFolderMap(mappingDoc.id, folder)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isMapped ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-800' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-xs">{folder}</span>
                    <Icon icon={isMapped ? "solar:check-circle-bold" : "solar:circle-linear"} className={`w-4 h-4 ${isMapped ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button onClick={() => setMappingDoc(null)} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Nutrition Plan Modal */}
      {isEditDietOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="solar:leaf-bold" className="w-5 h-5 text-teal-600" />
                Customize Nutrition Targets
              </h3>
              <button onClick={() => setIsEditDietOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDietPlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  value={dietTitle}
                  onChange={e => setDietTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Calories</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={e => setCalories(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-center font-bold text-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={e => setProtein(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-center font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={e => setCarbs(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-center font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Fats (g)</label>
                  <input
                    type="number"
                    value={fats}
                    onChange={e => setFats(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-center font-bold text-purple-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block font-bold text-gray-700 text-[10px] mb-1">Breakfast Plan</label>
                  <textarea
                    rows={2}
                    value={breakfast}
                    onChange={e => setBreakfast(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl resize-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[10px] mb-1">Lunch Plan</label>
                  <textarea
                    rows={2}
                    value={lunch}
                    onChange={e => setLunch(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl resize-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[10px] mb-1">Dinner Plan</label>
                  <textarea
                    rows={2}
                    value={dinner}
                    onChange={e => setDinner(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl resize-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[10px] mb-1">Snacks Plan</label>
                  <textarea
                    rows={2}
                    value={snacks}
                    onChange={e => setSnacks(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditDietOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md">
                  Save Nutrition Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        document={documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onSuccess={(deletedId) => {
          removeLocalDocument(userId, deletedId);
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
