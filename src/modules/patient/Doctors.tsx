import React, { useEffect, useState } from 'react';
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
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, specialty, email')
      .eq('role', 'doctor');

    if (error) {
      console.error('Error fetching doctors:', error);
    } else {
      setDoctors(data || []);
    }
    setLoading(false);
  };

  const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = specialtyFilter ? doc.specialty === specialtyFilter : true;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <SharedLayout role="patient">
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full overflow-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Doctor</h1>
            <p className="text-gray-500">Search and book appointments with our top specialists.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
            
            <select
              value={specialtyFilter}
              onChange={e => setSpecialtyFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-gray-700 appearance-none min-w-[150px]"
            >
              <option value="">All Specialties</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Icon icon="solar:spinner-broken-linear" className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center bg-white rounded-3xl p-12 border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon icon="solar:user-cross-linear" className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            {(searchTerm || specialtyFilter) && (
              <button 
                onClick={() => {setSearchTerm(''); setSpecialtyFilter('');}}
                className="mt-6 text-blue-600 font-medium hover:text-blue-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24 md:pb-0">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-200/40 hover:shadow-2xl hover:shadow-gray-200/60 transition-shadow group flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-blue-600">
                      {doctor.full_name?.charAt(0) || 'D'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                      {doctor.full_name ? `Dr. ${doctor.full_name}` : 'Unknown Doctor'}
                    </h3>
                    <p className="text-blue-600 text-sm font-medium">{doctor.specialty || 'General Practitioner'}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 mt-auto">
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <Icon icon="solar:letter-linear" className="w-4 h-4" />
                    <span className="truncate">{doctor.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Icon icon="solar:calendar-date-linear" className="w-4 h-4" />
                    <span>Accepting new patients</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/patient-appointments', { state: { prefillDoctorId: doctor.id } })}
                  className="w-full bg-gray-900 hover:bg-black text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon icon="solar:calendar-add-linear" className="w-5 h-5" />
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
