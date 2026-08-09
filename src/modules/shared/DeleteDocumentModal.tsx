import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { Document } from '../../types';
import { supabase } from '../../lib/supabase';

interface DeleteDocumentModalProps {
 document: Document | null;
 isOpen: boolean;
 onClose: () => void;
 onSuccess: (deletedDocumentId: string) => void;
}

export default function DeleteDocumentModal({ document, isOpen, onClose, onSuccess }: DeleteDocumentModalProps) {
 const [confirmText, setConfirmText] = useState('');
 const [isDeleting, setIsDeleting] = useState(false);
 const [error, setError] = useState('');

 if (!isOpen || !document) return null;

 const handleDelete = async () => {
 if (confirmText !== 'DELETE') return;

 setIsDeleting(true);
 setError('');

 try {
 const urlParts = document.file_url.split('/');
 const fileName = urlParts.pop();

 if (fileName) {
 const { error: storageError } = await supabase
 .storage
 .from('medical-records')
 .remove([fileName]);

 if (storageError) {
 console.error("Storage delete error:", storageError);
 }
 }

 const { error: dbError } = await supabase
 .from('documents')
 .delete()
 .eq('id', document.id);

 if (dbError) throw dbError;

 onSuccess(document.id);

 setConfirmText('');
 onClose();
 } catch (err: any) {
 console.error('Error deleting document:', err);
 setError(err.message || 'Failed to delete document. Please try again.');
 } finally {
 setIsDeleting(false);
 }
 };

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative">
 <button
 onClick={() => { setConfirmText(''); onClose(); }}
 className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
 >
 <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
 </button>

 <div className="p-6">
 <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
 <Icon icon="solar:trash-bin-trash-bold" className="w-6 h-6 text-red-600" />
 </div>

 <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Document</h2>

 <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm border border-red-100">
 <strong>Warning:</strong> You are about to permanently delete <strong>{document.title}</strong>. This action cannot be undone and the file will be removed from the server.
 </div>

 <p className="text-sm text-gray-600 mb-4 font-medium text-center">
 To confirm deletion, please type <span className="font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded select-all">DELETE</span> below:
 </p>

 <input
 type="text"
 value={confirmText}
 onChange={(e) => setConfirmText(e.target.value)}
 placeholder="Type DELETE"
 className="w-full border-gray-300 border rounded-xl px-4 py-3 text-center tracking-wider font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all mb-4"
 disabled={isDeleting}
 />

 {error && (
 <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
 )}

 <div className="flex gap-3 mt-6">
 <button
 onClick={() => { setConfirmText(''); onClose(); }}
 disabled={isDeleting}
 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 onClick={handleDelete}
 disabled={confirmText !== 'DELETE' || isDeleting}
 className={`flex-1 px-4 py-2 text-white rounded-xl font-medium flex items-center justify-center transition-all ${confirmText === 'DELETE' && !isDeleting
 ? 'bg-red-600 hover:bg-red-700 '
 : 'bg-red-300 cursor-not-allowed'
 }`}
 >
 {isDeleting ? (
 <Icon icon="solar:pulse-linear" className="w-5 h-5 animate-spin" />
 ) : (
 <>
 <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5 mr-2" />
 Delete
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
