import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './modules/shared/Login';
import PatientDashboard from './modules/patient/PatientDashboard';
import DoctorDashboard from './modules/doctor/DoctorDashboard';
import Home from './modules/patient/Home';
import DoctorLanding from './modules/doctor/DoctorLanding';
import { LayoutProvider } from './components/LayoutContext';

function App() {
  return (
    <Router>
      <LayoutProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<DoctorLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LayoutProvider>
    </Router>
  );
}

export default App;
