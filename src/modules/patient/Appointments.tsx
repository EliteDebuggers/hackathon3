import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';
import AppointmentBookingModal from './components/AppointmentBookingModal';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  remarks?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at?: string;
  doctor_name?: string;
  specialty?: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (location.state?.prefillDoctorId) {
      setBookingModalOpen(true);
    }
  }, [location.state]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setPatientId(user.id);
      fetchAppointments(user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchAppointments = async (pid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', pid)
        .order('appointment_date', { ascending: true });

      if (!error && data) {
        const { data: doctors } = await supabase.from('users').select('id, full_name, specialty').eq('role', 'doctor');
        const doctorMap = new Map((doctors || []).map(d => [d.id, d]));

        const enriched: Appointment[] = data.map(a => ({
          ...a,
          doctor_name: doctorMap.get(a.doctor_id)?.full_name || `Doctor ${a.doctor_id.substring(0, 6)}`,
          specialty: doctorMap.get(a.doctor_id)?.specialty || 'General Specialist'
        }));

        setAppointments(enriched);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', apptId);
      if (patientId) fetchAppointments(patientId);
    } catch (e: any) {
      alert('Error cancelling appointment: ' + e.message);
    }
  };

  const filtered = appointments.filter(a => statusFilter === 'all' || a.status === statusFilter);

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5" /> Awaiting Approval</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:check-read-bold" className="w-3.5 h-3.5" /> Completed</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-100 text-red-800 font-bold rounded-full text-xs flex items-center gap-1"><Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" /> Cancelled</span>;
    }
  };

  return (
    <SharedLayout role="patient">
      <div className="p-3 md:p-5 w-full flex flex-col gap-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Your Appointments</h1>
            <p className="text-gray-500 text-xs mt-0.5">Manage scheduled consultations with doctors and view consultation status.</p>
          </div>

          <button
            onClick={() => navigate('/book-appointment')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Icon icon="solar:calendar-add-bold" className="w-4 h-4" />
            Book New Appointment
          </button>
        </div>

        <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-xl w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All ({appointments.length})
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'confirmed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Confirmed ({appointments.filter(a => a.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Pending ({appointments.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'completed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Completed ({appointments.filter(a => a.status === 'completed').length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-blue-600">
            <Icon icon="solar:pulse-bold-duotone" className="w-8 h-8 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200/80 shadow-sm">
            <Icon icon="solar:calendar-cross-bold-duotone" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No appointments found</h3>
            <p className="text-gray-500 text-xs mt-0.5 max-w-md mx-auto">
              You don't have any appointments matching this status. Click "Book New Appointment" to schedule a visit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filtered.map(appt => (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                        {appt.doctor_name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{appt.doctor_name}</h3>
                        <p className="text-[10px] text-blue-600 font-semibold">{appt.specialty}</p>
                      </div>
                    </div>

                    {getStatusBadge(appt.status)}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-2.5 mb-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Icon icon="solar:calendar-date-bold" className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold">{appt.appointment_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold">{appt.appointment_time}</span>
                    </div>
                  </div>

                  {appt.remarks && (
                    <div className="text-[11px] text-gray-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50 mb-3">
                      <span className="font-bold text-blue-900">Note: </span>
                      {appt.remarks}
                    </div>
                  )}
                </div>

                {appt.status === 'pending' && (
                  <div className="pt-3 border-t flex justify-end">
                    <button
                      onClick={() => handleCancelAppointment(appt.id)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-xs transition"
                    >
                      Cancel Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <AppointmentBookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          patientId={patientId}
          onBooked={() => fetchAppointments(patientId)}
        />

      </div>
    </SharedLayout>
  );
}
