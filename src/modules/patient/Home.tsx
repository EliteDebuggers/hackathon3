import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon icon="solar:pulse-linear" className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">Swasth+</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#patient-features" className="hidden md:flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition">
            Patients
          </a>
          <a href="#doctor-features" className="hidden md:flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition">
            Doctors
          </a>
          <Link to="/doctors" className="hidden md:flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition">
            <Icon icon="solar:stethoscope-linear" className="w-4 h-4 mr-1.5" />
            Provider Portal
          </Link>
          <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-full transition hover:shadow-lg hover:shadow-blue-600/20"
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="relative px-6 py-20 lg:py-32 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-green-50 blur-3xl opacity-50 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6">
            <Icon icon="solar:shield-check-linear" className="w-4 h-4 mr-2" />
            Your Health Data, Secured.
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            Your Medical History,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Finally in Your Control.
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            A unified healthcare platform bringing patients and doctors together. Seamlessly manage appointments, health records, and AI-assisted care all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-8 py-4 rounded-full transition shadow-lg shadow-blue-600/20 flex items-center justify-center"
            >
              Create Free Account
              <Icon icon="solar:alt-arrow-right-linear" className="w-5 h-5 ml-2" />
            </button>
            <Link
              to="/doctors"
              className="w-full sm:w-auto bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 text-lg font-medium px-8 py-4 rounded-full transition hover:bg-gray-50 flex items-center justify-center"
            >
              I'm a Healthcare Provider
            </Link>
          </div>
        </div>
      </section>

      <section id="patient-features" className="px-6 py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-2 block">For Patients</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Take charge of your health journey</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Everything you need to manage your healthcare, securely organized and instantly accessible.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon="solar:folder-with-files-linear" className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Centralized Medical Records</h3>
              <p className="text-gray-600 leading-relaxed">
                Store all your lab reports, prescriptions, and scans in one secure digital vault. Never lose a paper record again.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon="solar:stethoscope-linear" className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Find & Book Top Doctors</h3>
              <p className="text-gray-600 leading-relaxed">
                Search for specialized doctors, check their schedules, and book appointments seamlessly without making a single phone call.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon="solar:chat-round-dots-linear" className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Direct Doctor Messaging</h3>
              <p className="text-gray-600 leading-relaxed">
                Have a quick follow-up question? Message your doctor directly through our secure platform instead of waiting for your next visit.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon="solar:magic-stick-3-linear" className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Swasth+ AI Assistant</h3>
              <p className="text-gray-600 leading-relaxed">
                Get immediate preliminary guidance, summarize complex medical reports, and analyze your health timeline with our intelligent AI.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon="solar:history-linear" className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Visual Health Timeline</h3>
              <p className="text-gray-600 leading-relaxed">
                See your health journey visually. Track appointments, diagnoses, and treatments chronologically to better understand your progress.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon="solar:calendar-linear" className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Appointment Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Never miss a check-up. View upcoming appointments, get reminders, and manage rescheduling all from an intuitive dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="doctor-features" className="px-6 py-24 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div>
              <span className="text-green-600 font-semibold tracking-wider uppercase text-sm mb-2 block">For Doctors</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Empowering your medical practice</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Swasth+ provides modern tools to help you manage patients effectively, streamline your schedule, and focus on delivering excellent care.
              </p>
            </div>

            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Icon icon="solar:users-group-rounded-linear" className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-1">Comprehensive Patient Management</h4>
                  <p className="text-gray-600">Access full medical histories, past prescriptions, and lab reports before the patient even walks into your office.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Icon icon="solar:calendar-date-linear" className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-1">Smart Scheduling</h4>
                  <p className="text-gray-600">Set your availability, create customizable sessions, and let patients book appointments automatically without administrative overhead.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Icon icon="solar:magic-stick-3-linear" className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-1">AI-Assisted Clinical Notes</h4>
                  <p className="text-gray-600">Use AI to generate quick briefs and summaries of a patient's entire medical history, saving you valuable time during consultations.</p>
                </div>
              </li>
            </ul>

            <div className="pt-4">
              <Link
                to="/doctors"
                className="inline-flex items-center text-green-600 font-medium hover:text-green-700 transition"
              >
                Explore Provider Features
                <Icon icon="solar:alt-arrow-right-linear" className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>

          <div className="flex-1 relative w-full hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-100 to-emerald-50 rounded-[3rem] transform rotate-3"></div>
            <div className="relative bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 rounded-3xl p-6 lg:p-10 z-10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon icon="solar:user-linear" className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">Dr. Sarah Jenkins</h5>
                    <p className="text-sm text-gray-500">Cardiologist</p>
                  </div>
                </div>
                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Available Today</div>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded-full w-full"></div>
                <div className="h-4 bg-gray-100 rounded-full w-5/6"></div>
                <div className="h-4 bg-gray-100 rounded-full w-1/2"></div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <span className="block text-2xl font-bold text-gray-900">12</span>
                  <span className="text-xs text-gray-500 font-medium">Patients Today</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <span className="block text-2xl font-bold text-gray-900">142</span>
                  <span className="text-xs text-gray-500 font-medium">Total Records</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expanded Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-white mb-6">
              <Icon icon="solar:pulse-linear" className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold tracking-tight">Swasth+</span>
            </div>
            <p className="text-gray-400 max-w-md leading-relaxed mb-6">
              Transforming the healthcare experience by putting medical records securely in the hands of patients, while equipping doctors with the modern tools they need.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Icon icon="mdi:twitter" className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Icon icon="mdi:linkedin" className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Icon icon="mdi:github" className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><a href="#patient-features" className="text-gray-400 hover:text-white transition">Patient Features</a></li>
              <li><Link to="/doctors" className="text-gray-400 hover:text-white transition">Provider Portal</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Security & Privacy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">API Reference</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center md:text-left">
            © 2026 Swasth+ Platform. Built for the Elite Debuggers Hackathon.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
