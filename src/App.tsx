import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './modules/shared/Login';
import PatientDashboard from './modules/patient/PatientDashboard';
import DoctorDashboard from './modules/doctor/DoctorDashboard';
import Home from './modules/patient/Home';
import DoctorLanding from './modules/doctor/DoctorLanding';
import { LayoutProvider } from './components/LayoutContext';
import PatientAppointments from './modules/patient/Appointments';
import PatientMessages from './modules/patient/Messages';
import PatientDoctors from './modules/patient/Doctors';
import PatientSettings from './modules/patient/Settings';
import DoctorPatients from './modules/doctor/Patients';
import DoctorSettings from './modules/doctor/Settings';
import DoctorSchedule from './modules/doctor/Schedule';
import DocumentView from './modules/shared/DocumentView';

import PatientMedications from './modules/patient/Medications';
import BookAppointment from './modules/patient/BookAppointment';
import MedicalRecords from './modules/patient/MedicalRecords';

function App() {
  return (
    <Router>
      <LayoutProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<DoctorLanding />} />
          <Route path="/login" element={<Login />} />

          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/patient-records" element={<MedicalRecords />} />
          <Route path="/patient-medications" element={<PatientMedications />} />
          <Route path="/patient-doctors" element={<PatientDoctors />} />
          <Route path="/patient-appointments" element={<PatientAppointments />} />
          <Route path="/book-appointment" element={<BookAppointment />} />
          <Route path="/patient-messages" element={<PatientMessages />} />
          <Route path="/patient-settings" element={<PatientSettings />} />

          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor-schedule" element={<DoctorSchedule />} />
          <Route path="/doctor-patients" element={<DoctorPatients />} />
          <Route path="/doctor-settings" element={<DoctorSettings />} />

          <Route path="/document/:id" element={<DocumentView />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LayoutProvider>
    </Router>
  );
}

export default App;
