import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Icon } from '@iconify/react';
import { GoogleGenAI, Type } from '@google/genai';

interface Document {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialty?: string;
}

interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  isToolCall?: boolean;
}

export default function PatientAIAssistant({ patientId, documents }: { patientId: string, documents: Document[] }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! I'm your Swasth+ AI Coordinator. Tell me about your upcoming appointment, and I will search your records to prepare a summary for your doctor." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [generatedBrief, setGeneratedBrief] = useState('');
  const [relevantDocIds, setRelevantDocIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'doctor');
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !import.meta.env.VITE_GEMINI_API_KEY) {
      if (!import.meta.env.VITE_GEMINI_API_KEY) alert("Please set VITE_GEMINI_API_KEY in .env.local");
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const searchPatientHistoryTool = {
        name: 'search_patient_history',
        description: 'Search the patient\'s past medical documents based on a query to find relevant history.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'Medical keywords (e.g., blood, cardiology, x-ray)' }
          },
          required: ['query'],
        }
      };

      const prepareContextTool = {
        name: 'prepare_doctor_context',
        description: 'Generate a highly concise, medical-grade summary of the patient\'s history tailored for the upcoming appointment based on found documents.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'The concise medical summary to share with the doctor.' },
            relevant_doc_ids: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of document IDs that are relevant.'
            }
          },
          required: ['summary', 'relevant_doc_ids'],
        }
      };

      const findBestDoctorTool = {
        name: 'find_best_doctor',
        description: 'Find a list of available doctors and their specialties.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            symptoms: { type: Type.STRING, description: 'Symptoms or required specialty' }
          }
        }
      };

      const bookAppointmentTool = {
        name: 'book_appointment',
        description: 'Book an appointment with a specific doctor ID for a given date and time.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            doctor_id: { type: Type.STRING, description: 'ID of the doctor' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
            time: { type: Type.STRING, description: 'Time in HH:MM format' },
            remarks: { type: Type.STRING, description: 'Remarks or reason for visit' }
          },
          required: ['doctor_id', 'date', 'time']
        }
      };

      // Construct history string
      const docsString = documents.map(d => `ID: ${d.id} | Title: ${d.title} | Type: ${d.document_type} | Date: ${d.created_at}`).join('\n');

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `You are an AI Health Coordinator. You help patients prepare for doctor appointments by finding relevant documents and summarizing them. You can also find doctors and book appointments for the patient. \nHere is the patient's full document index:\n${docsString}\n\nUse the search_patient_history tool to pretend to search if asked. When you have enough context, MUST use the prepare_doctor_context tool to finalize the summary. DO NOT output the summary as normal text. ONLY use the prepare_doctor_context tool to output the summary.\n\nUse find_best_doctor to get doctor options. Use book_appointment to book them.`,
          tools: [{ functionDeclarations: [searchPatientHistoryTool, prepareContextTool, findBestDoctorTool, bookAppointmentTool] }]
        }
      });

      // Simple implementation of tool loop for hackathon
      let response = await chat.sendMessage({ message: userMessage });

      let finalSummary = '';

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'search_patient_history') {
            const query = (call.args as any).query;
            setMessages(prev => [...prev, { role: 'system', content: `Agent searched history for: "${query}"`, isToolCall: true }]);

            // Send mock tool response back
            response = await chat.sendMessage({
              message: [{
                functionResponse: { name: 'search_patient_history', response: { status: "Found relevant documents in index." } }
              }] as any
            });
          }


          if (response.functionCalls && response.functionCalls.some(c => c.name === 'prepare_doctor_context')) {
            const prepCall = response.functionCalls.find(c => c.name === 'prepare_doctor_context');
            if (prepCall) {
              const args = prepCall.args as any;
              finalSummary = args.summary;
              setRelevantDocIds(args.relevant_doc_ids || []);
              setMessages(prev => [...prev, { role: 'system', content: `Agent prepared context summary.`, isToolCall: true }]);
            }
          }

          if (call.name === 'find_best_doctor') {
            const query = (call.args as any).symptoms || '';
            setMessages(prev => [...prev, { role: 'system', content: `Agent searched doctors for: "${query}"`, isToolCall: true }]);

            const docsList = doctors.map(d => `ID: ${d.id}, Name: ${d.full_name}, Specialty: ${d.specialty || 'General'}`).join('\n');

            response = await chat.sendMessage({
              message: [{
                functionResponse: { name: 'find_best_doctor', response: { doctors: docsList } }
              }] as any
            });
          }

          if (call.name === 'book_appointment') {
            const args = call.args as any;
            setMessages(prev => [...prev, { role: 'system', content: `Agent booking appointment with ${args.doctor_id} for ${args.date} ${args.time}...`, isToolCall: true }]);

            try {
              const { data: appt, error: apptError } = await supabase.from('appointments').insert([{
                patient_id: patientId,
                doctor_id: args.doctor_id,
                appointment_date: args.date,
                appointment_time: args.time,
                remarks: args.remarks || 'Booked via AI',
                status: 'pending'
              }]).select().single();

              if (apptError) throw apptError;

              const docName = doctors.find(d => d.id === args.doctor_id)?.full_name || 'a Doctor';

              await supabase.from('health_milestones').insert([{
                patient_id: patientId,
                actor_id: patientId,
                title: `Appointment Booked via AI`,
                description: `You booked an appointment with ${docName} for ${args.date} at ${args.time}.\nRemarks: ${args.remarks}`,
                milestone_type: 'appointment_booked',
                related_appointment_id: appt.id,
                status: 'completed'
              }]);

              response = await chat.sendMessage({
                message: [{ functionResponse: { name: 'book_appointment', response: { status: "Success", appointment_id: appt.id } } }] as any
              });
            } catch (e: any) {
              response = await chat.sendMessage({
                message: [{ functionResponse: { name: 'book_appointment', response: { status: "Error", message: e.message } } }] as any
              });
            }
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text || "I couldn't process that properly." }]);
      }

      if (finalSummary) {
        setGeneratedBrief(finalSummary);
        setMessages(prev => [...prev, { role: 'model', content: "I have prepared the consultation brief for your doctor. Please review it below and authorize sharing." }]);
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Error communicating with AI: " + error.message }]);
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
    <div className="bg-white overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
        <h2 className="font-semibold flex items-center">
          <Icon icon="solar:stars-linear" className="w-5 h-5 mr-2" />
          AI Appointment Coordinator
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-md p-3 flex gap-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' :
              msg.role === 'system' ? 'bg-indigo-50 border border-indigo-100 text-indigo-800 text-sm' :
                'bg-white border text-gray-800 shadow-sm'
              }`}>
              {msg.role === 'model' && <Icon icon="solar:smart-speaker-linear" className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />}
              {msg.role === 'system' && <Icon icon="solar:clock-circle-linear" className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />}
              <div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-md p-3 shadow-sm flex items-center gap-2">
              <Icon icon="solar:smart-speaker-linear" className="w-5 h-5 text-gray-400 animate-pulse" />
              <span className="text-gray-500 text-sm animate-pulse">Agent is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {generatedBrief && (
        <div className="p-3 bg-blue-50 border-t border-blue-100 animate-fade-in">
          <div className="bg-white p-3 rounded-md shadow-sm border border-blue-200 mb-3">
            <h3 className="font-semibold text-blue-900 flex items-center mb-2">
              <Icon icon="solar:file-text-linear" className="w-4 h-4 mr-2" />
              Consultation Brief
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{generatedBrief}</p>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Select Doctor to Authorize:</label>
              <select
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="">-- Choose a doctor --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Doctor {d.id.substring(0, 8)}</option>
                ))}
              </select>
              <button
                onClick={handleAuthorize}
                disabled={!selectedDoctor || loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 rounded-md flex items-center justify-center transition"
              >
                <Icon icon="solar:check-circle-linear" className="w-4 h-4 mr-2" />
                Authorize & Share
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-white border-t">
        <div className="flex relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="e.g. I have a cardiology appointment tomorrow..."
            className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200 rounded-md py-3 pl-4 pr-12 outline-none transition"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Icon icon="solar:plain-2-linear" className="w-4 h-4 m-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
