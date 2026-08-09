import React, { useState, useEffect } from 'react';
import SharedLayout from '../../components/SharedLayout';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';

interface Session {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_patients: number;
}

export default function DoctorSchedule() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    session_date: '',
    start_time: '',
    end_time: '',
    max_patients: 10
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('doctor_sessions')
      .select('*')
      .eq('doctor_id', user.id)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error) {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('doctor_sessions')
      .insert([{
        doctor_id: user.id,
        title: newSession.title,
        session_date: newSession.session_date,
        start_time: newSession.start_time,
        end_time: newSession.end_time,
        max_patients: newSession.max_patients
      }])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert('Failed to add session');
    } else if (data) {
      setSessions(prev => [...prev, data].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()));
      setIsAdding(false);
      setNewSession({ title: '', session_date: '', start_time: '', end_time: '', max_patients: 10 });
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    const { error } = await supabase.from('doctor_sessions').delete().eq('id', id);
    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <SharedLayout role="doctor">
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full overflow-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Schedule</h1>
            <p className="text-gray-500">Manage your available appointment slots.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <Icon icon={isAdding ? "solar:close-circle-linear" : "solar:add-circle-linear"} className="w-6 h-6" />
            {isAdding ? 'Cancel' : 'Add New Session'}
          </button>
        </div>

        {isAdding && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 mb-8 animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create a Session</h2>
            <form onSubmit={handleAddSession} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Title</label>
                <input required type="text" value={newSession.title} onChange={e => setNewSession({...newSession, title: e.target.value})} placeholder="e.g. Morning Consultation" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input required type="date" value={newSession.session_date} onChange={e => setNewSession({...newSession, session_date: e.target.value})} min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input required type="time" value={newSession.start_time} onChange={e => setNewSession({...newSession, start_time: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input required type="time" value={newSession.end_time} onChange={e => setNewSession({...newSession, end_time: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Patients</label>
                <input required type="number" min="1" max="50" value={newSession.max_patients} onChange={e => setNewSession({...newSession, max_patients: parseInt(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm shadow-blue-200">
                  Save Session
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Icon icon="solar:spinner-broken-linear" className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center bg-white rounded-3xl p-12 border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon icon="solar:calendar-linear" className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming sessions</h3>
            <p className="text-gray-500">You haven't scheduled any available slots yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24 md:pb-0">
            {sessions.map(session => (
              <div key={session.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-gray-200/60 transition-shadow flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-xl mb-1">{session.title}</h3>
                    <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                      <Icon icon="solar:calendar-date-bold" className="w-4 h-4" />
                      {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSession(session.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Icon icon="solar:clock-circle-linear" className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Time</p>
                      <p className="text-sm font-semibold text-gray-900">{session.start_time} - {session.end_time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Icon icon="solar:users-group-rounded-linear" className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Capacity</p>
                      <p className="text-sm font-semibold text-gray-900">{session.max_patients} Patients</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SharedLayout>
  );
}
