import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';

import SharedLayout from '../../components/SharedLayout';
import DeleteDocumentModal from '../shared/DeleteDocumentModal';

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

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Doctor Prescription/Note');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);



  useEffect(() => {
    checkDoctor();
    fetchPatients();
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchDocuments(selectedPatient);
      fetchBriefs(selectedPatient);
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

  const fetchBriefs = async (patientId: string) => {
    if (!doctorId) return;
    const { data } = await supabase
      .from('consultation_briefs')
      .select('*')
      .eq('patient_id', patientId)
      .eq('authorized_doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (data) {
      setBriefs(data);
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

      fetchDocuments(selectedPatient);
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

  return (
    <SharedLayout role="doctor">
      <div className="flex-1 w-full mx-auto p-6 flex gap-6 items-start">

        <div className="w-1/3 bg-white rounded-md border overflow-hidden flex flex-col h-[calc(100vh-3rem)] sticky top-6">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center">
              <Icon icon="solar:users-group-rounded-linear" className="w-5 h-5 mr-2 text-gray-500" />
              Patient List
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {patients.length} Total
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8 text-blue-600">
                <Icon icon="solar:pulse-linear" className="w-6 h-6 animate-spin" />
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
                    <Icon icon="solar:widget-linear" className="w-5 h-5 mr-3" />
                    <span className="font-medium">Global Dashboard</span>
                  </div>
                </button>
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient.id)}
                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${selectedPatient === patient.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mr-3">
                        <Icon icon="solar:user-linear" className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Patient {patient.id.substring(0, 5)}...</p>
                        <p className="text-xs text-gray-500">ID: {patient.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <Icon icon="solar:alt-arrow-right-linear" className={`w-5 h-5 ${selectedPatient === patient.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                ))}
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
                              <p>Patient ID:</p>
                              <p className="font-mono">{doc.patient_id.substring(0, 8)}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-gray-200/60 transition-shadow">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4">
                    <Icon icon="solar:file-text-linear" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Patient Records</p>
                    <h3 className="text-2xl font-bold text-gray-900">{documents.length}</h3>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-gray-200/60 transition-shadow">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl mr-4">
                    <Icon icon="solar:file-download-linear" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Patient Uploads</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {documents.filter(d => !d.document_type.includes('Prescription')).length}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden flex flex-col h-full">
                <div className="flex justify-between items-center p-5 bg-gray-50/30 gap-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Records for Patient {selectedPatient.substring(0, 5)}
                  </h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value)}
                      className="border-gray-200 border rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
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
                        className={`cursor-pointer text-white px-4 py-2 rounded-xl font-medium flex items-center transition ${uploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                      >
                        <Icon icon="solar:upload-minimalistic-linear" className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Document'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {briefs.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        AI Patient Summaries
                      </h3>
                      <div className="grid gap-4">
                        {briefs.map(brief => (
                          <div key={brief.id} className="bg-indigo-50 border-none rounded-xl p-4">
                            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                              Authorized Context • {new Date(brief.created_at).toLocaleDateString()}
                            </div>
                            <p className="text-sm text-indigo-900 whitespace-pre-wrap">{brief.appointment_context}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documents.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                      <Icon icon="solar:file-text-linear" className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No records found</h3>
                      <p>This patient doesn't have any medical records yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50/50 hover: transition-all group">
                          <div className="flex items-center">
                            <div className={`p-3 rounded-xl mr-4 ${doc.uploader_id === doctorId ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                              <Icon icon="solar:file-text-linear" className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{doc.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {new Date(doc.created_at).toLocaleDateString()} •
                                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${doc.uploader_id === doctorId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {doc.document_type}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {doc.uploader_id === doctorId && (
                              <button
                                onClick={() => setDocumentToDelete(doc)}
                                className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-2 rounded-lg transition-all"
                                title="Delete Document"
                              >
                                <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => openDocument(doc)}
                              className="text-blue-600 hover:text-white text-sm font-semibold bg-blue-50 hover:bg-blue-600 px-5 py-2 rounded-lg transition-all"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
    </SharedLayout>
  );
}

function SparklesIcon(props: any) {
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
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
