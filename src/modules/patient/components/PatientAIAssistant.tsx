import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Icon } from '@iconify/react';
import { GoogleGenAI, Type } from '@google/genai';
import type { AIChatSession, AIChatMessage } from '../../../types';

interface Document {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
  extracted_text?: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialty?: string;
}

export default function PatientAIAssistant({ patientId, documents }: { patientId: string, documents: Document[] }) {
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
  const [showSessions, setShowSessions] = useState(false);

  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [generatedBrief, setGeneratedBrief] = useState('');
  const [relevantDocIds, setRelevantDocIds] = useState<string[]>([]);

  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentModalUrl, setAttachmentModalUrl] = useState<{ url: string, type: string, name: string } | null>(null);

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, uploadingFile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSessions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'doctor');
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (patientId) {
      loadSessions();
    }
  }, [patientId]);

  const loadSessions = async () => {
    const { data } = await supabase.from('ai_chat_sessions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setSessions(data);
      loadSessionMessages(data[0]);
    } else {
      createNewSession();
    }
  };

  const createNewSession = async () => {
    const { data } = await supabase.from('ai_chat_sessions').insert([{ patient_id: patientId, title: 'New Consultation' }]).select().single();
    if (data) {
      setSessions(prev => [data, ...prev]);
      setCurrentSession(data);
      setMessages([]);

      await saveMessage(data.id, 'model', "Hi! I'm your Swasth+ Virtual Health Assistant. I can help monitor your conditions, analyze uploaded reports, suggest home remedies, and prepare summaries for your doctor.");
      setShowSessions(false);
    }
  };

  const loadSessionMessages = async (session: AIChatSession) => {
    setCurrentSession(session);
    const { data } = await supabase.from('ai_chat_messages').select('*').eq('session_id', session.id).order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
    }
    setShowSessions(false);
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat history?")) return;

    await supabase.from('ai_chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSession?.id === id) {
      setMessages([]);
      setCurrentSession(null);
      if (sessions.length > 1) {
        loadSessionMessages(sessions.find(s => s.id !== id)!);
      } else {
        createNewSession();
      }
    }
  };

  const saveMessage = async (sessionId: string, role: 'user' | 'model' | 'system', content: string, is_tool_call: boolean = false, attachmentUrl?: string, attachmentName?: string, attachmentType?: string) => {
    const { data } = await supabase.from('ai_chat_messages').insert([{
      session_id: sessionId,
      role,
      content,
      is_tool_call,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType
    }]).select().single();

    if (data) {
      setMessages(prev => [...prev, data]);
    }
    return data;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAttachment(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingAttachment) return;
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      alert("Please set GEMINI_API_KEY in env");
      return;
    }

    let session = currentSession;
    if (!session) {
      if (!patientId) { return; }
      const { data, error: sessionError } = await supabase.from('ai_chat_sessions').insert([{ patient_id: patientId, title: 'New Consultation' }]).select().single();
      if (sessionError || !data) { console.error("Session create error:", sessionError); alert("Failed to create chat session: " + (sessionError?.message || "Unknown error")); return; }
      setSessions(prev => [data, ...prev]);
      setCurrentSession(data);
      session = data;
      await saveMessage(data.id, 'model', "Hi! I'm your Swasth+ Virtual Health Assistant. I can help monitor your conditions, analyze uploaded reports, suggest home remedies, and prepare summaries for your doctor.");
    }

    const userMessage = input.trim();
    const currentAttachment = pendingAttachment;

    setInput('');
    setPendingAttachment(null);
    setLoading(true);
    setUploadingFile(!!currentAttachment);

    try {
      let attachmentUrl = '';
      let attachmentName = '';
      let attachmentType = '';
      let base64data = '';

      if (currentAttachment) {
        attachmentName = currentAttachment.name;
        attachmentType = currentAttachment.type;
        const fileExt = attachmentName.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
        const filePath = `chat_attachments/${patientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('medical-records').upload(filePath, currentAttachment);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('medical-records').getPublicUrl(filePath);
          attachmentUrl = publicUrl;
        }

        base64data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(currentAttachment);
        });
      }
      setUploadingFile(false);

      await saveMessage(session.id, 'user', userMessage || 'Sent an attachment', false, attachmentUrl || undefined, attachmentName || undefined, attachmentType || undefined);

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const searchPatientHistoryTool = {
        name: 'search_patient_history',
        description: 'Search the patient\'s past medical documents based on a query to find relevant history.',
        parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'Medical keywords' } }, required: ['query'] }
      };

      const prepareContextTool = {
        name: 'prepare_doctor_context',
        description: 'Generate a highly concise, medical-grade summary of the patient\'s history tailored for the upcoming appointment.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'The concise medical summary to share with the doctor.' },
            relevant_doc_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of document IDs that are relevant.' }
          },
          required: ['summary', 'relevant_doc_ids'],
        }
      };

      const suggestRemediesTool = {
        name: 'suggest_home_remedies',
        description: 'Provide a list of safe home remedies and immediate care actions for mild conditions.',
        parameters: { type: Type.OBJECT, properties: { condition: { type: Type.STRING } }, required: ['condition'] }
      };

      const findBestDoctorTool = {
        name: 'find_best_doctor',
        description: 'Find a list of available doctors and their specialties.',
        parameters: { type: Type.OBJECT, properties: { symptoms: { type: Type.STRING, description: 'Symptoms or required specialty' } } }
      };

      const bookAppointmentTool = {
        name: 'book_appointment',
        description: 'Book an appointment with a specific doctor ID for a given date and time.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            doctor_id: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            remarks: { type: Type.STRING }
          },
          required: ['doctor_id', 'date', 'time']
        }
      };

      const docsString = documents.map(d => `ID: ${d.id} | Title: ${d.title} | Type: ${d.document_type} | Extracted Summary: ${d.extracted_text || 'None'} | Date: ${d.created_at}`).join('\n');

      const chatHistoryForGemini = messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content + (m.attachment_name ? ` [Attached: ${m.attachment_name}]` : '') }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3.6-flash',
        history: chatHistoryForGemini as any,
        config: {
          systemInstruction: `You are Swasth+ Virtual Health Assistant. You act as an advanced AI health coordinator and companion for the patient. 
Your capabilities:
1. Monitor conditions and suggest home remedies (use suggest_home_remedies tool).
2. Advise whether symptoms require an in-person doctor visit.
3. Read and analyze user-uploaded reports (sent as text context).
4. Summarize medical history for doctors (MUST use prepare_doctor_context tool to output the final brief).
5. Search past documents and book appointments.

Patient's Document Index:\n${docsString}\n\nBe empathetic, concise, and professional. Always remind users to seek professional help for emergencies.`,
          tools: [{ functionDeclarations: [searchPatientHistoryTool, prepareContextTool, suggestRemediesTool, findBestDoctorTool, bookAppointmentTool] }]
        }
      });

      let aiMessageContent: any = userMessage || "Analyze this attached file.";
      if (currentAttachment && base64data) {
        aiMessageContent = [
          { text: userMessage || "Analyze this attached file." },
          { inlineData: { mimeType: attachmentType, data: base64data } }
        ];
      }
      let response = await chat.sendMessage({ message: aiMessageContent });
      let finalSummary = '';

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          const args = (call.args as any) || {};
          if (call.name === 'suggest_home_remedies') {
            await saveMessage(session.id, 'system', `Fetching safe home remedies for ${args.condition}...`, true);
            response = await chat.sendMessage({
              message: [{ functionResponse: { name: 'suggest_home_remedies', response: { advice: "Drink fluids, rest, monitor fever." } } }] as any
            });
          }
          if (call.name === 'search_patient_history') {
            await saveMessage(session.id, 'system', `Agent searched history for: "${args.query}"`, true);
            response = await chat.sendMessage({
              message: [{ functionResponse: { name: 'search_patient_history', response: { status: "Found relevant documents in index." } } }] as any
            });
          }
          if (call.name === 'prepare_doctor_context') {
            finalSummary = args.summary as string;
            setRelevantDocIds((args.relevant_doc_ids as string[]) || []);
            await saveMessage(session.id, 'system', `Agent prepared context summary.`, true);
          }
          if (call.name === 'find_best_doctor') {
            await saveMessage(session.id, 'system', `Agent searched doctors for: "${args.symptoms}"`, true);
            const docsList = doctors.map(d => `ID: ${d.id}, Name: ${d.full_name}, Specialty: ${d.specialty || 'General'}`).join('\n');
            response = await chat.sendMessage({
              message: [{ functionResponse: { name: 'find_best_doctor', response: { doctors: docsList } } }] as any
            });
          }
          if (call.name === 'book_appointment') {
            await saveMessage(session.id, 'system', `Agent booking appointment with ${args.doctor_id} for ${args.date} ${args.time}...`, true);
            try {
              const { data: appt, error: apptError } = await supabase.from('appointments').insert([{
                patient_id: patientId, doctor_id: args.doctor_id, appointment_date: args.date, appointment_time: args.time, remarks: args.remarks || 'Booked via AI', status: 'pending'
              }]).select().single();
              if (apptError) throw apptError;
              const docName = doctors.find(d => d.id === args.doctor_id)?.full_name || 'a Doctor';
              await supabase.from('health_milestones').insert([{
                patient_id: patientId, actor_id: patientId, title: `Appointment Booked via AI`, description: `You booked an appointment with ${docName} for ${args.date} at ${args.time}.`, milestone_type: 'appointment_booked', related_appointment_id: appt.id, status: 'completed'
              }]);
              response = await chat.sendMessage({ message: [{ functionResponse: { name: 'book_appointment', response: { status: "Success", appointment_id: appt.id } } }] as any });
            } catch (e: any) {
              response = await chat.sendMessage({ message: [{ functionResponse: { name: 'book_appointment', response: { status: "Error", message: e.message } } }] as any });
            }
          }
        }
      }

      if (response.text) {
        await saveMessage(session.id, 'model', response.text);
      } else if (!finalSummary) {
        await saveMessage(session.id, 'model', "I've processed your request.");
      }

      if (finalSummary) {
        setGeneratedBrief(finalSummary);
        await saveMessage(session.id, 'model', "I have prepared the consultation brief for your doctor. Please review it below and authorize sharing.");
      }

      if (messages.length === 1 && session.title === 'New Consultation') {
        const title = userMessage.substring(0, 25) + "...";
        await supabase.from('ai_chat_sessions').update({ title }).eq('id', session.id);
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title } : s));
      }

    } catch (error: any) {
      console.error(error);
      await saveMessage(session.id, 'model', "Error communicating with AI: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!selectedDoctor || !generatedBrief) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('consultation_briefs').insert([{
        patient_id: patientId,
        authorized_doctor_id: selectedDoctor,
        appointment_context: generatedBrief,
        attached_document_ids: relevantDocIds
      }]);
      if (error) throw error;
      alert("Successfully authorized! Your doctor will see this brief on their dashboard.");
      setGeneratedBrief('');
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 relative font-sans">

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="flex items-center gap-1.5 font-medium text-[15px] hover:text-gray-600 px-3 py-1.5 rounded-lg transition"
            >
              {currentSession?.title || 'Swasth+'}
              <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4 text-gray-400" />
            </button>

            {showSessions && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl border border-gray-100 py-2 z-50 max-h-[60vh] overflow-y-auto shadow-lg">
                <div className="px-3 pb-2 pt-1 text-xs font-semibold text-gray-400 tracking-wider">Chat History</div>
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`flex justify-between items-center group px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${currentSession?.id === session.id ? 'bg-gray-50' : ''}`}
                    onClick={() => loadSessionMessages(session)}
                  >
                    <span className="truncate text-sm pr-2 text-gray-700 group-hover:text-gray-900">{session.title}</span>
                    <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-md transition" title="Delete Chat">
                      <Icon icon="solar:trash-bin-trash-linear" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={createNewSession} className="p-2 text-gray-500 hover:text-gray-800 transition" title="New Chat">
          <Icon icon="solar:add-circle-linear" className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col items-center custom-scrollbar">
        {messages.length <= 1 ? (
          <div className="flex-1 flex flex-col justify-center items-center w-full max-w-3xl">
            <div className="flex-1 flex flex-col items-center justify-center">
            </div>

            <div className="flex flex-col gap-1 w-full max-w-3xl mb-4 mt-auto px-2">
              <button onClick={() => setInput("Can you suggest some home remedies for a headache?")} className="flex items-center gap-3 py-3 px-2 group text-gray-600 hover:text-black transition">
                <Icon icon="solar:home-smile-linear" className="w-5 h-5 text-gray-400 group-hover:text-black transition" />
                <span className="text-[15px] font-medium">Suggest home remedies</span>
              </button>
              <button onClick={() => setInput("I need to book an appointment with a cardiologist.")} className="flex items-center gap-3 py-3 px-2 group text-gray-600 hover:text-black transition">
                <Icon icon="solar:calendar-mark-linear" className="w-5 h-5 text-gray-400 group-hover:text-black transition" />
                <span className="text-[15px] font-medium">Book an appointment</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 py-3 px-2 group text-gray-600 hover:text-black transition">
                <Icon icon="solar:file-text-linear" className="w-5 h-5 text-gray-400 group-hover:text-black transition" />
                <span className="text-[15px] font-medium">Summarize a report</span>
              </button>
              <button onClick={() => setInput("Help me prepare context for my doctor.")} className="flex items-center gap-3 py-3 px-2 group text-gray-600 hover:text-black transition">
                <Icon icon="solar:heart-pulse-linear" className="w-5 h-5 text-gray-400 group-hover:text-black transition" />
                <span className="text-[15px] font-medium">Prepare a brief</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl space-y-6 py-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="flex flex-col items-end gap-1 max-w-[85%]">
                    {msg.attachment_url && (
                      <div
                        className="bg-gray-100 border border-gray-200 rounded-xl p-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition mb-1"
                        onClick={() => setAttachmentModalUrl({ url: msg.attachment_url!, type: msg.attachment_type || '', name: msg.attachment_name || '' })}
                      >
                        <Icon icon={msg.attachment_type?.includes('pdf') ? 'solar:file-text-linear' : 'solar:gallery-linear'} className="w-8 h-8 text-blue-600" />
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{msg.attachment_name}</span>
                      </div>
                    )}
                    {msg.content && msg.content !== 'Sent an attachment' && (
                      <div className="bg-gray-100 text-gray-900 rounded-[20px] rounded-br-sm px-5 py-2.5 text-[15px]">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-4 max-w-[95%]">
                    {msg.role === 'model' ? (
                      <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon icon="solar:stars-linear" className="w-5 h-5 text-gray-800" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5 bg-white">
                        <Icon icon="solar:settings-linear" className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800 mt-1">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-4 max-w-[95%]">
                  <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                    <Icon icon="solar:stars-linear" className="w-5 h-5 text-gray-800" />
                  </div>
                  <div className="text-[15px] leading-relaxed text-gray-400 flex items-center">
                    <Icon icon="solar:menu-dots-bold" className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            {uploadingFile && (
              <div className="flex justify-end">
                <div className="bg-gray-100 text-gray-700 rounded-[20px] rounded-br-sm px-4 py-2.5 flex items-center gap-2">
                  <Icon icon="solar:document-add-linear" className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Analyzing document...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {generatedBrief && (
          <div className="w-full max-w-3xl mb-6 mt-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="font-medium text-gray-800 flex items-center mb-3">
                <Icon icon="solar:file-text-linear" className="w-5 h-5 mr-2 text-blue-600" />
                Consultation Brief Prepared
              </h3>
              <div className="text-[14px] text-gray-600 whitespace-pre-wrap mb-5 bg-gray-50 p-3 rounded-2xl border border-gray-100">{generatedBrief}</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedDoctor}
                  onChange={e => setSelectedDoctor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-white text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option value="">Choose a doctor to authorize...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Doctor {d.id.substring(0, 8)}</option>
                  ))}
                </select>
                <button
                  onClick={handleAuthorize}
                  disabled={!selectedDoctor || loading}
                  className="bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium px-5 py-3 rounded-2xl flex items-center justify-center transition"
                >
                  Authorize & Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 pb-2 pt-1 bg-white flex flex-col gap-2">
        {pendingAttachment && (
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg p-2 w-max max-w-[200px] ml-4">
            <Icon icon={pendingAttachment.type.includes('pdf') ? 'solar:file-text-linear' : 'solar:gallery-linear'} className="w-5 h-5 text-gray-500 shrink-0" />
            <span className="text-sm text-gray-700 truncate">{pendingAttachment.name}</span>
            <button onClick={() => setPendingAttachment(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition">
              <Icon icon="solar:close-circle-linear" className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="bg-gray-100 rounded-full flex items-center px-3 py-2 min-h-[52px]">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full text-gray-500 hover:text-gray-800 transition" title="Attach file">
            <Icon icon="solar:paperclip-linear" className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything"
            className="flex-1 bg-transparent border-none focus:ring-0 px-3 outline-none text-[15px] text-gray-900 placeholder-gray-500"
          />
          <div className="flex items-center gap-1 pl-2">
            {input.trim() || pendingAttachment ? (
              <button onClick={handleSend} className="p-1.5 rounded-full bg-black text-white hover:bg-gray-800 transition ml-1">
                <Icon icon="solar:arrow-up-linear" className="w-5 h-5 stroke-[2]" />
              </button>
            ) : (
              <button disabled className="p-1.5 rounded-full bg-gray-300 text-white transition ml-1 cursor-not-allowed">
                <Icon icon="solar:arrow-up-linear" className="w-5 h-5 stroke-[2]" />
              </button>
            )}
          </div>
        </div>
        <div className="text-center mt-1">
          <span className="text-[11px] text-gray-400">Swasth+ can make mistakes.</span>
        </div>
      </div>
      {attachmentModalUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAttachmentModalUrl(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 truncate pr-4">{attachmentModalUrl.name}</h2>
              <button onClick={() => setAttachmentModalUrl(null)} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0">
                <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 flex justify-center items-center min-h-[50vh]">
              {attachmentModalUrl.type.includes('pdf') ? (
                <iframe src={attachmentModalUrl.url} className="w-full h-[70vh] rounded-xl border border-gray-200 shadow-sm" />
              ) : (
                <img src={attachmentModalUrl.url} alt="Attachment" className="max-w-full max-h-[70vh] rounded-xl shadow-sm object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
