import { X } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    title: string;
    file_url: string;
  } | null;
}

export default function DocumentViewerModal({ isOpen, onClose, document }: DocumentViewerModalProps) {
  if (!isOpen || !document) return null;

  const getFileType = (url: string) => {
    // Basic extension check, defaulting to handling query params too if any
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
    
    // Fallback for doc, docx, xls, etc using Google Docs Viewer
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
      <div className="bg-white rounded-md shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">
            {document.title}
          </h3>
          <div className="flex items-center gap-4">
            <a 
              href={document.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
            >
              Open Original
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Content */}
        <div className="flex-1 p-4 bg-gray-100 overflow-hidden">
          {renderContent()}
        </div>

      </div>
    </div>
  );
}
