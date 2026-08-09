import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Activity, Stethoscope, Clock, FilePlus, Calendar } from 'lucide-react';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import PatientAIAssistant from './components/PatientAIAssistant';
import HealthTimeline from './components/HealthTimeline';
import AppointmentBookingModal from './components/AppointmentBookingModal';
import SharedLayout from '../../components/SharedLayout';
import { useLayoutContext } from '../../components/LayoutContext';

interface Document {
  id: string;
  title: string;
  file_url: string;
  document_type: string;
  created_at: string;
  uploader_id: string;
}

export default function PatientDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userId, setUserId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string, file_url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadCategory, setUploadCategory] = useState('Lab Report');
  const [chatbotWidth, setChatbotWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
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

  const openDocument = (doc: Document) => {
    setSelectedDoc({ title: doc.title, file_url: doc.file_url });
    setViewerOpen(true);
  };

  const totalDocs = documents.length;
  const doctorNotes = documents.filter(d => d.document_type === 'Doctor Prescription/Note').length;
  const patientUploads = totalDocs - doctorNotes;
  const lastUpload = documents.length > 0 ? new Date(documents[0].created_at).toLocaleDateString() : 'Never';

  return (
    <SharedLayout role="patient">
      <div className="w-full mx-auto flex-1 flex flex-col lg:flex-row items-start relative overflow-x-hidden h-full">

        <div className={`flex-1 flex flex-col gap-4 w-full transition-all duration-300 ease-in-out p-3 md:p-4 ${isChatbotOpen ? 'lg:pr-4 mb-4 lg:mb-0' : ''}`}>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-md shadow-sm border p-4 flex items-center">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-md mr-4">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Records</p>
                <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : totalDocs}</h3>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border p-4 flex items-center">
              <div className="p-3 bg-green-100 text-green-600 rounded-md mr-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Doctor Notes</p>
                <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : doctorNotes}</h3>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border p-4 flex items-center">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-md mr-4">
                <FilePlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Your Uploads</p>
                <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : patientUploads}</h3>
              </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border p-4 flex items-center">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-md mr-4">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Last Activity</p>
                <h3 className="text-lg font-bold text-gray-900">{loading ? '-' : lastUpload}</h3>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={() => setBookingModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-medium flex items-center shadow-sm transition"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment
            </button>
          </div>

          <HealthTimeline patientId={userId} />

          <div className="bg-white rounded-md shadow-sm border overflow-hidden">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 border-b bg-gray-50/50 gap-4">
              <h2 className="text-xl font-semibold text-gray-800">Your Medical History</h2>

              <div className="flex items-center gap-3">
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="border-gray-300 border rounded-md px-3 py-2 text-sm bg-white text-gray-700 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                    className={`cursor-pointer text-white px-4 py-2 rounded-md font-medium flex items-center transition shadow-sm ${uploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Record'}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-12 text-blue-600">
                  <Activity className="w-8 h-8 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-md bg-gray-50">
                  <FilePlus className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No medical records yet</h3>
                  <p>Upload your first lab report or scan to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-blue-50/50 hover:border-blue-200 transition group">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-md mr-4 ${doc.document_type === 'Doctor Prescription/Note' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
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
                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold bg-white border border-blue-200 hover:border-blue-300 px-4 py-2 rounded-md transition shadow-sm"
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
    </SharedLayout >
  );
}
