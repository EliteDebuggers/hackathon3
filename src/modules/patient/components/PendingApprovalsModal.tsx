import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Check, FileText } from 'lucide-react';

interface PendingUpload {
  id: string;
  title: string;
  file_url: string;
  document_type: string;
  created_at: string;
  doctor_id: string;
}

export default function PendingApprovalsModal({ isOpen, onClose, patientId }: { isOpen: boolean, onClose: () => void, patientId: string }) {
  const [pendingDocs, setPendingDocs] = useState<PendingUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) fetchPending();
  }, [isOpen]);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pending_document_uploads')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setPendingDocs(data);
    setLoading(false);
  };

  const handleApprove = async (doc: PendingUpload) => {
    try {
      const { error: dbError } = await supabase.from('documents').insert([{
        patient_id: patientId,
        doctor_id: doc.doctor_id,
        uploader_id: doc.doctor_id,
        title: doc.title,
        file_url: doc.file_url,
        document_type: doc.document_type
      }]);
      if (dbError) throw dbError;

      await supabase.from('pending_document_uploads').update({ status: 'approved' }).eq('id', doc.id);

      const { data: ms } = await supabase.from('health_milestones')
        .select('*')
        .eq('patient_id', patientId)
        .eq('milestone_type', 'action_required')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (ms && ms.length > 0) {
        await supabase.from('health_milestones').update({ status: 'completed' }).eq('id', ms[0].id);
      }

      fetchPending();
    } catch (e: any) {
      alert("Error approving: " + e.message);
    }
  };

  const handleReject = async (doc: PendingUpload) => {
    try {
      await supabase.from('pending_document_uploads').update({ status: 'rejected' }).eq('id', doc.id);
      fetchPending();
    } catch (e: any) {
      alert("Error rejecting: " + e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            Pending Approvals
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <p className="text-center py-4 text-gray-500">Loading...</p>
          ) : pendingDocs.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No pending document approvals.</p>
          ) : (
            <div className="space-y-4">
              {pendingDocs.map(doc => (
                <div key={doc.id} className="border rounded-xl p-4 flex flex-col gap-3 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.document_type} • Doctor {doc.doctor_id.substring(0, 6)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleReject(doc)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(doc)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 flex items-center rounded-lg transition"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
