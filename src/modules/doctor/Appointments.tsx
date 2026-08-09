import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  remarks?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at?: string;
  patient_name?: string;
  patient_email?: string;
}

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  // Reschedule & Remarks Editing state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);

  useEffect(() => {
    checkDoctor();
  }, []);

  const checkDoctor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setDoctorId(user.id);
      fetchAppointments(user.id);
      
      // Real-time listener
      const subscription = supabase
        .channel('doctor-appointments-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
          fetchAppointments(user.id);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  };

  const fetchAppointments = async (docId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patient:users!appointments_patient_id_fkey(full_name)')
        .eq('doctor_id', docId)
        .order('appointment_date', { ascending: true });

      if (!error && data) {
        // Since auth.users isn't directly queryable for emails via standard anon key,
        // we'll fetch profile names which we joined.
        const mapped: Appointment[] = data.map(a => ({
          ...a,
          patient_name: a.patient?.full_name || `Patient ${a.patient_id.substring(0, 5)}`
        }));
        setAppointments(mapped);
      }
    } catch (e) {
      console.error('Error fetching doctor appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (apptId: string, status: Appointment['status'], patientId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', apptId);

      if (error) throw error;

      // Add a health milestone
      let actionTitle = '';
      let actionDesc = '';
      if (status === 'confirmed') {
        actionTitle = 'Appointment Confirmed';
        actionDesc = 'Your doctor approved your visit appointment request.';
      } else if (status === 'cancelled') {
        actionTitle = 'Appointment Cancelled';
        actionDesc = 'The doctor cancelled or rejected the appointment slot.';
      } else if (status === 'completed') {
        actionTitle = 'Appointment Completed';
        actionDesc = 'Your consultation appointment session was successfully completed.';
      }

      await supabase.from('health_milestones').insert([{
        patient_id: patientId,
        actor_id: doctorId,
        title: actionTitle,
        description: actionDesc,
        milestone_type: 'appointment',
        status: 'completed'
      }]);

      alert(`Appointment status updated to ${status.toUpperCase()} successfully.`);
      fetchAppointments(doctorId);
    } catch (e: any) {
      alert('Error updating status: ' + e.message);
    }
  };

  const handleReschedule = async (appt: Appointment) => {
    if (!newDate || !newTime) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          status: 'confirmed' // Rescheduling automatically confirms the appointment
        })
        .eq('id', appt.id);

      if (error) throw error;

      // Add a health milestone
      await supabase.from('health_milestones').insert([{
        patient_id: appt.patient_id,
        actor_id: doctorId,
        title: 'Appointment Rescheduled',
        description: `Doctor rescheduled your appointment to ${newDate} at ${newTime} (Status: Confirmed).`,
        milestone_type: 'appointment',
        status: 'completed'
      }]);

      alert('Appointment rescheduled and confirmed successfully.');
      setRescheduleId(null);
      setNewDate('');
      setNewTime('');
      fetchAppointments(doctorId);
    } catch (e: any) {
      alert('Error rescheduling appointment: ' + e.message);
    }
  };

  const handleSaveRemarks = async (appt: Appointment) => {
    setSavingRemarks(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ remarks: remarksText.trim() })
        .eq('id', appt.id);

      if (error) throw error;

      // Add a health milestone for patient
      await supabase.from('health_milestones').insert([{
        patient_id: appt.patient_id,
        actor_id: doctorId,
        title: 'Doctor Left a Note/Message',
        description: `Remarks updated for appointment on ${appt.appointment_date}: "${remarksText.trim()}"`,
        milestone_type: 'doctor_note',
        status: 'completed'
      }]);

      alert('Message/Remarks saved and shared with patient.');
      setEditingRemarksId(null);
      setRemarksText('');
      fetchAppointments(doctorId);
    } catch (e: any) {
      alert('Error saving remarks: ' + e.message);
    } finally {
      setSavingRemarks(false);
    }
  };

  const patientInitials = (name?: string) => {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const avatarColor = (id: string) => {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[parseInt(id.replace(/-/g, '').substring(0, 2), 16) % colors.length];
  };

  const filtered = appointments.filter(a => statusFilter === 'all' || a.status === statusFilter);

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5" /> Pending Approval</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:check-read-bold" className="w-3.5 h-3.5" /> Completed</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-100 text-red-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" /> Cancelled</span>;
    }
  };

  return (
    <SharedLayout role="doctor">
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full overflow-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight flex items-center gap-3">
              <Icon icon="solar:calendar-mark-bold" className="w-9 h-9 text-blue-600" />
              Patient Appointments
            </h1>
            <p className="text-gray-500 text-sm">Review, approve, reschedule, and write messages/remarks directly for patient appointments.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            <span className="text-xs font-bold text-gray-700">
              {appointments.filter(a => a.status === 'pending').length} Pending Requests
            </span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {([
            { id: 'all', label: 'All Visit Requests', count: appointments.length },
            { id: 'pending', label: 'Pending Approval', count: appointments.filter(a => a.status === 'pending').length },
            { id: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length },
            { id: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length },
            { id: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setRescheduleId(null);
                setEditingRemarksId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-150 rounded-t-lg'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Icon icon="solar:pulse-bold" className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center bg-white rounded-3xl p-16 border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="bg-gray-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Icon icon="solar:calendar-add-linear" className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-500 text-sm">There are no appointments matching the "{statusFilter}" status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 pb-24 md:pb-6">
            {filtered.map(appt => {
              const color = avatarColor(appt.patient_id);
              const initials = patientInitials(appt.patient_name);
              const isRescheduling = rescheduleId === appt.id;
              const isEditingRemarks = editingRemarksId === appt.id;

              return (
                <div key={appt.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-lg shadow-gray-200/30 hover:shadow-xl hover:shadow-gray-200/50 transition flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-md ${color}`}>
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{appt.patient_name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Patient ID: <span className="font-mono">{appt.patient_id.substring(0, 8).toUpperCase()}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {getStatusBadge(appt.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                    {/* Date/Time Details */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Icon icon="solar:calendar-linear" className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Scheduled Date</p>
                        <p className="font-bold text-gray-800 text-sm mt-0.5">
                          {new Date(appt.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                        <Icon icon="solar:clock-circle-linear" className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time Slot</p>
                        <p className="font-bold text-gray-800 text-sm mt-0.5">{appt.appointment_time}</p>
                      </div>
                    </div>

                    {/* Patient Request Remarks */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Icon icon="solar:chat-round-line-linear" className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Doctor Remarks / Messages</p>
                        {appt.remarks ? (
                          <p className="text-xs text-gray-700 font-medium mt-1 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap">{appt.remarks}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-1.5">No doctor message or remarks drafted yet.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Rescheduling Forms */}
                  <div className="pt-4 border-t border-gray-50 flex flex-col gap-3">
                    
                    {/* Reschedule Editor Form */}
                    {isRescheduling && (
                      <div className="bg-gray-50 p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row items-end gap-3.5 animate-fade-in-up">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Select New Date</label>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Select New Time Slot</label>
                          <input
                            type="text"
                            placeholder="e.g. 11:30 AM"
                            value={newTime}
                            onChange={e => setNewTime(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto shrink-0">
                          <button
                            onClick={() => setRescheduleId(null)}
                            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReschedule(appt)}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/10"
                          >
                            Save Reschedule
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Remarks Editor Form */}
                    {isEditingRemarks && (
                      <div className="bg-gray-50 p-4 border border-gray-100 rounded-2xl flex flex-col gap-3 animate-fade-in-up">
                        <div>
                          <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Draft Message / Prescription Remarks for Patient</label>
                          <textarea
                            rows={3}
                            value={remarksText}
                            onChange={e => setRemarksText(e.target.value)}
                            placeholder="e.g. Please bring your latest lipid profile reports. Fast for 12 hours before checkup."
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingRemarksId(null)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition"
                            disabled={savingRemarks}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveRemarks(appt)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                            disabled={savingRemarks}
                          >
                            {savingRemarks ? 'Saving...' : 'Send Message'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Button Actions */}
                    {!isRescheduling && !isEditingRemarks && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingRemarksId(appt.id);
                              setRemarksText(appt.remarks || '');
                            }}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-indigo-100"
                          >
                            <Icon icon="solar:chat-round-line-linear" className="w-4 h-4" />
                            {appt.remarks ? 'Edit Message' : 'Draft Message'}
                          </button>
                          <button
                            onClick={() => {
                              setRescheduleId(appt.id);
                              setNewDate(appt.appointment_date);
                              setNewTime(appt.appointment_time);
                            }}
                            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-blue-100"
                          >
                            <Icon icon="solar:calendar-add-linear" className="w-4 h-4" />
                            Reschedule Slot
                          </button>
                        </div>

                        <div className="flex gap-2 ml-auto">
                          {appt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'cancelled', appt.patient_id)}
                                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition border border-rose-100"
                              >
                                Decline Request
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'confirmed', appt.patient_id)}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/20"
                              >
                                Approve Visit
                              </button>
                            </>
                          )}

                          {appt.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'cancelled', appt.patient_id)}
                                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition border border-red-100"
                              >
                                Cancel Visit
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'completed', appt.patient_id)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
                              >
                                Mark Completed
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </SharedLayout>
  );
}
