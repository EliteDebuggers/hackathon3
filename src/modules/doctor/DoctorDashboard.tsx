import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Upload, FileText, Users, ChevronRight, User, Activity, FilePlus, Clock, LayoutDashboard } from 'lucide-react';
import DocumentViewerModal from '../../components/DocumentViewerModal';

interface Patient {
  id: string;
  role: string;
  full_name?: string;
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

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Doctor Prescription/Note');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string, file_url: string } | null>(null);

  useEffect(() => {
    checkDoctor();
    fetchPatients();
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchDocuments(selectedPatient);
    }
  }, [selectedPatient]);

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

    if (!error && data) {
      setPatients(data);
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

  const fetchDocuments = async (patientId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doctorId || !selectedPatient) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${selectedPatient}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('medical-records')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('medical-records')
        .getPublicUrl(filePath);

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

      fetchDocuments(selectedPatient);
      fetchGlobalStats();
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const openDocument = (doc: Document) => {
    setSelectedDoc({ title: doc.title, file_url: doc.file_url });
    setViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 flex items-center">
          <StethoscopeIcon className="w-6 h-6 mr-2 text-blue-600" />
          Doctor Portal
        </h1>
        <button onClick={handleLogout} className="flex items-center text-gray-600 hover:text-red-600 font-medium transition">
          <LogOut className="w-5 h-5 mr-2" /> Logout
        </button>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex gap-6">

        {/* Sidebar */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[calc(100vh-8rem)] sticky top-24">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center">
              <Users className="w-5 h-5 mr-2 text-gray-500" />
              Patient List
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {patients.length} Total
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8 text-blue-600">
                <Activity className="w-6 h-6 animate-spin" />
              </div>
            ) : patients.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No patients registered yet.</p>
            ) : (
              <>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className={`w-full text-left p-4 border-b flex items-center justify-between transition ${selectedPatient === null ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center text-gray-700">
                    <LayoutDashboard className="w-5 h-5 mr-3" />
                    <span className="font-medium">Global Dashboard</span>
                  </div>
                </button>
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient.id)}
                    className={`w-full text-left p-4 border-b flex items-center justify-between transition ${selectedPatient === patient.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mr-3">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Patient {patient.id.substring(0, 5)}...</p>
                        <p className="text-xs text-gray-500">ID: {patient.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${selectedPatient === patient.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          {!selectedPatient ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Patients</p>
                    <h3 className="text-2xl font-bold text-gray-900">{patients.length}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Platform Documents</p>
                    <h3 className="text-2xl font-bold text-gray-900">{allDocuments.length}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-lg mr-4">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Recent Activity</p>
                    <h3 className="text-lg font-bold text-gray-900">
                      {allDocuments.length > 0 ? new Date(allDocuments[0].created_at).toLocaleDateString() : 'None'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1">
                <div className="p-6 border-b bg-gray-50/50">
                  <h2 className="text-xl font-semibold text-gray-800">Recent Platform Activity</h2>
                </div>
                <div className="p-6">
                  {allDocuments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No documents in the system yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {allDocuments.slice(0, 8).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-4 ${doc.document_type.includes('Prescription') ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{doc.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {new Date(doc.created_at).toLocaleDateString()} • {doc.document_type}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 text-right">
                            <p>Patient ID:</p>
                            <p className="font-mono">{doc.patient_id.substring(0, 8)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // PATIENT SPECIFIC VIEW
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Patient Records</p>
                    <h3 className="text-2xl font-bold text-gray-900">{documents.length}</h3>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
                    <FilePlus className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Patient Uploads</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {documents.filter(d => !d.document_type.includes('Prescription')).length}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center p-6 border-b bg-gray-50/50 gap-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Records for Patient {selectedPatient.substring(0, 5)}
                  </h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value)}
                      className="border-gray-300 border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      disabled={uploading}
                    >
                      <option value="Doctor Prescription/Note">Prescription / Note</option>
                      <option value="Lab Order">Lab Order</option>
                      <option value="Referral Letter">Referral Letter</option>
                    </select>

                    <div className="relative">
                      <input
                        type="file"
                        id="doctor-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label
                        htmlFor="doctor-upload"
                        className={`cursor-pointer text-white px-4 py-2 rounded-lg font-medium flex items-center transition shadow-sm ${uploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Document'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {documents.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No records found</h3>
                      <p>This patient doesn't have any medical records yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition group">
                          <div className="flex items-center">
                            <div className={`p-3 rounded-lg mr-4 ${doc.uploader_id === doctorId ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{doc.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {new Date(doc.created_at).toLocaleDateString()} •
                                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.uploader_id === doctorId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {doc.document_type}
                                </span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => openDocument(doc)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold bg-white border border-blue-200 hover:border-blue-300 px-4 py-2 rounded-lg transition shadow-sm"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

      </main>

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        document={selectedDoc}
      />
    </div>
  );
}

function StethoscopeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  )
}
