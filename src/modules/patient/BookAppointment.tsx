import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';

interface Doctor {
  id: string;
  full_name: string;
  specialty?: string;
  email?: string;
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const location = useLocation();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00 AM');
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [patientId, setPatientId] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  useEffect(() => {
    checkUser();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (location.state?.prefillDoctorId) {
      setSelectedDoctorId(location.state.prefillDoctorId);
    }
  }, [location.state, doctors]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setPatientId(user.id);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'doctor');
    if (data && data.length > 0) {
      setDoctors(data);
      if (!selectedDoctorId) setSelectedDoctorId(data[0].id);
    } else {
      const demoDocs: Doctor[] = [
        { id: 'doc-1', full_name: 'Dr. Sarah Sharma', specialty: 'Cardiology', email: 'sarah.sharma@swasth.com' },
        { id: 'doc-2', full_name: 'Dr. Rajesh Patel', specialty: 'Endocrinology & Diabetology', email: 'rajesh.patel@swasth.com' },
        { id: 'doc-3', full_name: 'Dr. Ananya Roy', specialty: 'Clinical Nutritionist', email: 'ananya.roy@swasth.com' },
        { id: 'doc-4', full_name: 'Dr. Vikram Malhotra', specialty: 'Neurology', email: 'vikram.m@swasth.com' },
        { id: 'doc-5', full_name: 'Dr. Priya Nair', specialty: 'Pediatrics', email: 'priya.nair@swasth.com' },
        { id: 'doc-6', full_name: 'Dr. Arjun Mehta', specialty: 'Orthopedics', email: 'arjun.mehta@swasth.com' }
      ];
      setDoctors(demoDocs);
      if (!selectedDoctorId) setSelectedDoctorId(demoDocs[0].id);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !date || !selectedTimeSlot || !patientId) {
      alert('Please select a doctor, date, and time slot.');
      return;
    }

    setLoading(true);

    try {
      const selectedDoc = doctors.find(d => d.id === selectedDoctorId);
      const docName = selectedDoc?.full_name || 'Specialist Doctor';

      const { data: appt, error: apptError } = await supabase.from('appointments').insert([{
        patient_id: patientId,
        doctor_id: selectedDoctorId,
        appointment_date: date,
        appointment_time: selectedTimeSlot,
        remarks: remarks,
        status: 'pending'
      }]).select().single();

      if (apptError) throw apptError;

      await supabase.from('health_milestones').insert([{
        patient_id: patientId,
        actor_id: patientId,
        title: `Appointment Requested`,
        description: `Booked consultation with ${docName} for ${date} at ${selectedTimeSlot}.`,
        milestone_type: 'appointment_booked',
        related_appointment_id: appt?.id,
        status: 'completed'
      }]);

      alert(`Success! Your appointment with ${docName} on ${date} at ${selectedTimeSlot} has been requested.`);
      navigate('/patient-appointments');
    } catch (e: any) {
      alert('Error booking appointment: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));
  const filteredDoctors = doctors.filter(d => specialtyFilter === 'all' || d.specialty === specialtyFilter);

  const timeSlots = [
    { label: '09:00 AM', period: 'Morning' },
    { label: '10:30 AM', period: 'Morning' },
    { label: '11:30 AM', period: 'Morning' },
    { label: '02:00 PM', period: 'Afternoon' },
    { label: '03:30 PM', period: 'Afternoon' },
    { label: '04:30 PM', period: 'Afternoon' },
    { label: '05:30 PM', period: 'Evening' },
    { label: '06:30 PM', period: 'Evening' }
  ];

  return (
    <SharedLayout role="patient">
      <div className="p-3 md:p-5 w-full h-full overflow-y-auto">

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition"
            >
              <Icon icon="solar:alt-arrow-left-linear" className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Book Doctor Appointment</h1>
              <p className="text-xs text-gray-500 mt-0.5">Schedule a personalized video or in-person consultation with top specialists.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmBooking} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2 space-y-4">

            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Icon icon="solar:stethoscope-bold" className="w-5 h-5 text-blue-600" />
                  1. Select Healthcare Specialist
                </h3>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Specialty:</span>
                  <select
                    value={specialtyFilter}
                    onChange={e => setSpecialtyFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-xl font-medium outline-none text-gray-800"
                  >
                    <option value="all">All Specialties ({doctors.length})</option>
                    {specialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {filteredDoctors.map(doc => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl font-bold flex items-center justify-center text-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                          }`}>
                          {doc.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm leading-tight">{doc.full_name}</h4>
                          <p className="text-xs text-blue-600 font-medium mt-0.5">{doc.specialty || 'Specialist Doctor'}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                        }`}>
                        {isSelected && <Icon icon="solar:check-read-bold" className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <Icon icon="solar:calendar-date-bold" className="w-5 h-5 text-blue-600" />
                2. Choose Preferred Date & Time
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Consultation Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Available Time Slots</label>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map(slot => {
                      const isSelected = selectedTimeSlot === slot.label;
                      return (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot.label)}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                            }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 mb-3">
                <Icon icon="solar:notes-bold" className="w-5 h-5 text-blue-600" />
                3. Symptoms or Notes for Doctor
              </h3>
              <textarea
                rows={3}
                placeholder="Briefly describe your symptoms or reason for visit (e.g., Routine health checkup, chest discomfort, medication renewal...)"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>

          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm sticky top-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                <Icon icon="solar:shield-check-bold" className="w-5 h-5 text-green-600" />
                Booking Summary
              </h3>

              {(() => {
                const doc = doctors.find(d => d.id === selectedDoctorId);
                return (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {doc?.full_name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{doc?.full_name || 'Select a Doctor'}</p>
                        <p className="text-blue-600 font-semibold text-[11px]">{doc?.specialty || 'General Practice'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-b border-gray-100 py-3">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Date:</span>
                        <span className="font-bold text-gray-900">{date}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Time Slot:</span>
                        <span className="font-bold text-blue-600">{selectedTimeSlot}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Type:</span>
                        <span className="font-semibold text-gray-900">Direct Consultation</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !selectedDoctorId}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Icon icon="solar:check-circle-bold" className="w-5 h-5" />
                      {loading ? 'Booking Appointment...' : 'Confirm Appointment'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

        </form>

      </div>
    </SharedLayout>
  );
}
