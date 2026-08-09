import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Icon } from '@iconify/react';
import PendingApprovalsModal from './PendingApprovalsModal';

interface Milestone {
 id: string;
 title: string;
 description: string;
 milestone_type: string;
 status: string;
 created_at: string;
}

export default function HealthTimeline({ patientId }: { patientId: string }) {
 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const [loading, setLoading] = useState(true);
 const [approvalsOpen, setApprovalsOpen] = useState(false);

 useEffect(() => {
 fetchMilestones();
 
 // Set up realtime subscription for demo purposes
 const channel = supabase
 .channel('milestones_changes')
 .on('postgres_changes', 
 { event: '*', schema: 'public', table: 'health_milestones', filter: `patient_id=eq.${patientId}` }, 
 () => fetchMilestones()
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [patientId]);

 const fetchMilestones = async () => {
 const { data } = await supabase
 .from('health_milestones')
 .select('*')
 .eq('patient_id', patientId)
 .order('created_at', { ascending: false });
 
 if (data) setMilestones(data);
 setLoading(false);
 };

 const getIcon = (type: string, status: string) => {
 if (status === 'completed') return <Icon icon="solar:check-circle-linear" className="w-6 h-6 text-green-500 bg-white" />;
 switch (type) {
 case 'appointment_booked': return <Icon icon="solar:calendar-linear" className="w-6 h-6 text-blue-500 bg-white" />;
 case 'action_required': return <Icon icon="solar:clock-circle-linear" className="w-6 h-6 text-orange-500 bg-white" />;
 case 'doctor_note': return <Icon icon="solar:file-text-linear" className="w-6 h-6 text-purple-500 bg-white" />;
 default: return <Icon icon="solar:pulse-linear" className="w-6 h-6 text-gray-400 bg-white" />;
 }
 };

 return (
 <div className="bg-white rounded-md border p-6">
 <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
 <Icon icon="solar:pulse-linear" className="w-6 h-6 mr-2 text-indigo-600" />
 Your Health Journey
 </h2>

 {loading ? (
 <div className="animate-pulse flex space-x-4">
 <div className="rounded-full bg-slate-200 h-10 w-10"></div>
 <div className="flex-1 space-y-6 py-1">
 <div className="h-2 bg-slate-200 rounded"></div>
 <div className="space-y-3">
 <div className="grid grid-cols-3 gap-4">
 <div className="h-2 bg-slate-200 rounded col-span-2"></div>
 <div className="h-2 bg-slate-200 rounded col-span-1"></div>
 </div>
 </div>
 </div>
 </div>
 ) : milestones.length === 0 ? (
 <p className="text-gray-500 text-center py-8">Your health timeline will appear here as you book appointments and upload records.</p>
 ) : (
 <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
 {milestones.map((m) => (
 <div key={m.id} className="relative pl-8">
 <div className="absolute -left-3.5 top-0 ring-4 ring-white">
 {getIcon(m.milestone_type, m.status)}
 </div>
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
 <h3 className={`text-lg font-semibold ${m.status === 'pending' ? 'text-orange-600' : 'text-gray-900'}`}>
 {m.title}
 </h3>
 <time className="text-sm text-gray-500">
 {new Date(m.created_at).toLocaleString()}
 </time>
 </div>
 {m.description && (
 <p className="text-gray-600 mt-1 whitespace-pre-wrap">{m.description}</p>
 )}
 {m.status === 'pending' && m.milestone_type === 'action_required' && (
 <button 
 onClick={() => setApprovalsOpen(true)}
 className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
 >
 Review Pending Approvals
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 <PendingApprovalsModal 
 isOpen={approvalsOpen} 
 onClose={() => { setApprovalsOpen(false); fetchMilestones(); }} 
 patientId={patientId} 
 />
 </div>
 );
}
