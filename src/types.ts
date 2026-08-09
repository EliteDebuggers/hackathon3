export interface Document {
 id: string;
 title: string;
 file_url: string;
 document_type: string;
 created_at: string;
 uploader_id: string;
 patient_id?: string;
}

export interface ConsultationBrief {
 id: string;
 patient_id: string;
 authorized_doctor_id: string;
 appointment_context: string;
 attached_document_ids: string[];
 created_at: string;
}

export interface Patient {
 id: string;
 role: string;
 full_name?: string;
}

export interface AIChatSession {
  id: string;
  patient_id: string;
  title: string;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  is_tool_call: boolean;
  created_at: string;
}
