import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  email: string;
}

const DEFAULT_DOCTORS: Doctor[] = [
  { id: 'doc-1', full_name: 'Dr. Sarah Sharma', specialty: 'Cardiology', email: 'sarah.sharma@swasth.com' },
  { id: 'doc-2', full_name: 'Dr. Rajesh Patel', specialty: 'Endocrinology & Diabetology', email: 'rajesh.patel@swasth.com' },
  { id: 'doc-3', full_name: 'Dr. Ananya Roy', specialty: 'Clinical Nutrition & Dietetics', email: 'ananya.roy@swasth.com' },
  { id: 'doc-4', full_name: 'Dr. Vikram Malhotra', specialty: 'Neurology', email: 'vikram.m@swasth.com' },
  { id: 'doc-5', full_name: 'Dr. Priya Nair', specialty: 'Pediatrics', email: 'priya.nair@swasth.com' },
  { id: 'doc-6', full_name: 'Dr. Arjun Mehta', specialty: 'Orthopedics', email: 'arjun.mehta@swasth.com' },
  { id: 'doc-7', full_name: 'Dr. Kavita Reddy', specialty: 'Dermatology', email: 'kavita.reddy@swasth.com' },
  { id: 'doc-8', full_name: 'Dr. Sanjay Gupta', specialty: 'General Medicine', email: 'sanjay.gupta@swasth.com' },
  { id: 'doc-9', full_name: 'Dr. Neha Kapoor', specialty: 'Oncology', email: 'neha.kapoor@swasth.com' }
];

export default function PatientDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, specialty, email')
        .eq('role', 'doctor');

      if (!error && data && data.length > 0) {
        setDoctors(data);
      } else {
        setDoctors(DEFAULT_DOCTORS);
      }
    } catch (e) {
      setDoctors(DEFAULT_DOCTORS);
    } finally {
      setLoading(false);
    }
  };

  const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = (doc.full_name + ' ' + doc.specialty).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = specialtyFilter ? doc.specialty === specialtyFilter : true;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <SharedLayout role="patient">
      <div className="p-3 md:p-5 w-full h-full overflow-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Find a Specialist</h1>
            <p className="text-gray-500 text-xs mt-0.5">Search and book direct appointments with top medical specialists.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by doctor or specialty..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
              />
            </div>

            <div className="relative">
              <Icon icon="solar:filter-bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 w-4 h-4 pointer-events-none" />
              <select
                value={specialtyFilter}
                onChange={e => setSpecialtyFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-gray-800 font-semibold appearance-none cursor-pointer"
              >
                <option value="">All Medical Specialties ({doctors.length})</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              <Icon icon="solar:alt-arrow-down-linear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Icon icon="solar:spinner-broken-linear" className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center bg-white rounded-2xl p-12 border border-gray-200/80 shadow-sm">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="solar:user-cross-linear" className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No doctors found</h3>
            <p className="text-xs text-gray-500">Try adjusting your search or specialty filter criteria.</p>
            {(searchTerm || specialtyFilter) && (
              <button
                onClick={() => { setSearchTerm(''); setSpecialtyFilter(''); }}
                className="mt-4 text-blue-600 font-bold text-xs hover:text-blue-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-lg shrink-0">
                      {doctor.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors leading-snug">
                        {doctor.full_name}
                      </h3>
                      <p className="text-blue-600 text-xs font-semibold">{doctor.specialty || 'General Practitioner'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:letter-linear" className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{doctor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5 text-green-600" />
                      <span>Available for consultation</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/book-appointment', { state: { prefillDoctorId: doctor.id } })}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Icon icon="solar:calendar-add-bold" className="w-4 h-4" />
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SharedLayout>
  );
}
