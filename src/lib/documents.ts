export interface DocumentItem {
  id: string;
  patient_id?: string;
  uploader_id?: string;
  doctor_id?: string | null;
  title: string;
  category?: string;
  document_type?: string;
  file_url: string;
  created_at: string;
  provider_name?: string;
  extracted_text?: string;
}

const LOCAL_DOCS_KEY_PREFIX = 'swasth_local_documents_';
const ALL_DOCS_KEY = 'swasth_local_documents_all';

export function getLocalDocuments(patientId: string): DocumentItem[] {
  try {
    const data = localStorage.getItem(`${LOCAL_DOCS_KEY_PREFIX}${patientId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading local documents:', e);
    return [];
  }
}

export function saveLocalDocument(patientId: string, doc: DocumentItem): void {
  try {
    // 1. Save to patient-specific list
    const current = getLocalDocuments(patientId);
    const updated = [doc, ...current.filter(d => d.id !== doc.id)];
    localStorage.setItem(`${LOCAL_DOCS_KEY_PREFIX}${patientId}`, JSON.stringify(updated));

    // 2. Save to global lookup table indexed by ID for DocumentView
    const allData = localStorage.getItem(ALL_DOCS_KEY);
    const allDocs: Record<string, DocumentItem> = allData ? JSON.parse(allData) : {};
    allDocs[doc.id] = doc;
    localStorage.setItem(ALL_DOCS_KEY, JSON.stringify(allDocs));
  } catch (e) {
    console.error('Error saving local document:', e);
  }
}

export function getLocalDocumentById(id: string): DocumentItem | null {
  try {
    const allData = localStorage.getItem(ALL_DOCS_KEY);
    if (!allData) return null;
    const allDocs: Record<string, DocumentItem> = JSON.parse(allData);
    return allDocs[id] || null;
  } catch (e) {
    return null;
  }
}

export function removeLocalDocument(patientId: string, docId: string): void {
  try {
    const current = getLocalDocuments(patientId);
    const updated = current.filter(d => d.id !== docId);
    localStorage.setItem(`${LOCAL_DOCS_KEY_PREFIX}${patientId}`, JSON.stringify(updated));

    const allData = localStorage.getItem(ALL_DOCS_KEY);
    if (allData) {
      const allDocs: Record<string, DocumentItem> = JSON.parse(allData);
      delete allDocs[docId];
      localStorage.setItem(ALL_DOCS_KEY, JSON.stringify(allDocs));
    }
  } catch (e) {
    console.error('Error removing local document:', e);
  }
}
