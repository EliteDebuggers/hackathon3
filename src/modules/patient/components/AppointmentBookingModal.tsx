import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Icon } from '@iconify/react';

interface Doctor {
  id: string;
  full_name: string;
  specialty?: string;
}

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onBooked?: () => void;
}

export default function AppointmentBookingModal({ isOpen, onClose, patientId, onBooked }: AppointmentBookingModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchDoctors();
  }, [isOpen]);

  const fetchDoctors = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'doctor');
    if (data) setDoctors(data);
  };

  const handleBook = async () => {
    if (!selectedDoctor || !date || !time) return;
    setLoading(true);

    try {
      const { data: appt, error: apptError } = await supabase.from('appointments').insert([{
        patient_id: patientId,
        doctor_id: selectedDoctor,
        appointment_date: date,
        appointment_time: time,
        remarks: remarks,
        status: 'pending'
      }]).select().single();

      if (apptError) throw apptError;

      const docName = doctors.find(d => d.id === selectedDoctor)?.full_name || 'a Doctor';

      await supabase.from('health_milestones').insert([{
        patient_id: patientId,
        actor_id: patientId,
        title: `Appointment Booked`,
        description: `You booked an appointment with ${docName} for ${date} at ${time}.\nRemarks: ${remarks}`,
        milestone_type: 'appointment_booked',
        related_appointment_id: appt.id,
        status: 'completed'
      }]);

      if (onBooked) onBooked();
      onClose();
    } catch (e: any) {
      alert("Error booking: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Icon icon="solar:calendar-linear" className="w-6 h-6 mr-2 text-blue-600" />
            Book Appointment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
            <div className="relative">
              <Icon icon="solar:user-linear" className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
                className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="">-- Choose a Specialist --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name || `Doctor ${d.id.substring(0, 8)}`} {d.specialty ? `(${d.specialty})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="relative">
                <Icon icon="solar:calendar-linear" className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="relative">
                <Icon icon="solar:clock-circle-linear" className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks for Doctor</label>
            <div className="relative">
              <Icon icon="solar:file-text-linear" className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Briefly describe your issue..."
                rows={3}
                className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-600 outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-md font-medium text-gray-600 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={!selectedDoctor || !date || !time || loading}
            className="px-5 py-2.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center transition"
          >
            {loading ? 'Booking...' : (
              <>
                <Icon icon="solar:check-circle-linear" className="w-5 h-5 mr-2" />
                Confirm Appointment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
