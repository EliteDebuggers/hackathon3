import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Upload, FileText, Activity, Stethoscope, Clock, FilePlus, Calendar } from 'lucide-react';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import PatientAIAssistant from './components/PatientAIAssistant';
import HealthTimeline from './components/HealthTimeline';
import AppointmentBookingModal from './components/AppointmentBookingModal';

interface Document {
  id: string;
  title: string;
  file_url: string;
  document_type: string;
  created_at: string;
  uploader_id: string;
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Lab Report');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string, file_url: string } | null>(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    checkUser();
    fetchDocuments();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setUserId(user.id);
  };

  const fetchDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
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
            patient_id: userId,
            uploader_id: userId,
            title: file.name,
            file_url: publicUrl,
            document_type: uploadCategory,
          }
        ]);

      if (dbError) throw dbError;

      fetchDocuments();
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

  const totalDocs = documents.length;
  const doctorNotes = documents.filter(d => d.document_type === 'Doctor Prescription/Note').length;
  const patientUploads = totalDocs - doctorNotes;
  const lastUpload = documents.length > 0 ? new Date(documents[0].created_at).toLocaleDateString() : 'Never';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-600" />
          Patient Portal
        </h1>
        <button onClick={handleLogout} className="flex items-center text-gray-600 hover:text-red-600 font-medium transition">
          <LogOut className="w-5 h-5 mr-2" /> Logout
        </button>
      </nav>

      <main className="max-w-6xl w-full mx-auto p-6 mt-4 flex-1">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Records</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : totalDocs}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Doctor Notes</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : doctorNotes}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
              <FilePlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Your Uploads</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : patientUploads}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg mr-4">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Last Activity</p>
              <h3 className="text-lg font-bold text-gray-900">{loading ? '-' : lastUpload}</h3>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3 flex flex-col gap-6">
            <div className="flex justify-end">
              <button
                onClick={() => setBookingModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center shadow-sm transition"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Appointment
              </button>
            </div>

            <HealthTimeline patientId={userId} />

            {/* Main Records Area */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center p-6 border-b bg-gray-50/50 gap-4">
                <h2 className="text-xl font-semibold text-gray-800">Your Medical History</h2>

                <div className="flex items-center gap-3">
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                    className="border-gray-300 border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={uploading}
                  >
                    <option value="Lab Report">Lab Report</option>
                    <option value="X-Ray / Scan">X-Ray / Scan</option>
                    <option value="General Note">General Note</option>
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
                      className={`cursor-pointer text-white px-4 py-2 rounded-lg font-medium flex items-center transition shadow-sm ${uploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Record'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center py-12 text-blue-600">
                    <Activity className="w-8 h-8 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <FilePlus className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No medical records yet</h3>
                    <p>Upload your first lab report or scan to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition group">
                        <div className="flex items-center">
                          <div className={`p-3 rounded-lg mr-4 ${doc.document_type === 'Doctor Prescription/Note' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{doc.title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {new Date(doc.created_at).toLocaleDateString()} •
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.document_type === 'Doctor Prescription/Note' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
          </div>
          <div className="lg:w-1/3">
            <PatientAIAssistant patientId={userId} documents={documents} />
          </div>
        </div>
      </main>

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        document={selectedDoc}
      />
      <AppointmentBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        patientId={userId}
      />
    </div>
  );
}
