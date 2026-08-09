import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';

export default function DocumentView() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const [document, setDocument] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 async function fetchDoc() {
 if (!id) return;
 const { data, error } = await supabase
 .from('medical_documents')
 .select('*')
 .eq('id', id)
 .single();
 
 if (!error && data) {
 setDocument(data);
 }
 setLoading(false);
 }
 fetchDoc();
 }, [id]);

 if (loading) {
 return (
 <div className="flex items-center justify-center h-screen bg-gray-50">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 if (!document) {
 return (
 <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
 <h2 className="text-xl font-semibold mb-4">Document not found</h2>
 <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline flex items-center">
 <Icon icon="solar:arrow-left-linear" className="w-4 h-4 mr-2" /> Go Back
 </button>
 </div>
 );
 }

 const getFileType = (url: string) => {
 const urlWithoutQuery = url.split('?')[0];
 const extension = urlWithoutQuery.split('.').pop()?.toLowerCase();
 if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension || '')) return 'image';
 if (extension === 'pdf') return 'pdf';
 return 'office';
 };

 const renderContent = () => {
 const type = getFileType(document.file_url);
 if (type === 'image') {
 return (
 <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-md">
 <img 
 src={document.file_url} 
 alt={document.title} 
 className="max-w-full max-h-full object-contain rounded-md"
 />
 </div>
 );
 }
 if (type === 'pdf') {
 return (
 <iframe 
 src={document.file_url} 
 className="w-full h-full rounded-md border-0 bg-white" 
 title={document.title} 
 />
 );
 }
 const officeUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=true`;
 return (
 <iframe 
 src={officeUrl} 
 className="w-full h-full rounded-md border-0 bg-white" 
 title={document.title} 
 />
 );
 };

 return (
 <div className="h-screen flex flex-col bg-gray-100">
 <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30">
 <div className="flex items-center">
 <button onClick={() => navigate(-1)} className="p-2 mr-4 hover:bg-gray-100 rounded-full transition text-gray-600">
 <Icon icon="solar:arrow-left-linear" className="w-5 h-5" />
 </button>
 <h1 className="text-xl font-bold text-gray-800 truncate max-w-xl">{document.title}</h1>
 </div>
 <a 
 href={document.file_url} 
 target="_blank" 
 rel="noopener noreferrer"
 className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition"
 >
 Download / Open Original
 </a>
 </header>
 <main className="flex-1 p-4 md:p-6 overflow-hidden">
 {renderContent()}
 </main>
 </div>
 );
}
