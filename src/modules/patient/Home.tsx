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
          <Link to="/doctors" className="hidden md:flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition">
            <Icon icon="solar:stethoscope-linear" className="w-4 h-4 mr-1.5" />
            For Doctors
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-full transition shadow-sm hover:shadow-md"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-32 overflow-hidden bg-white">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-green-50 blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6">
            <Icon icon="solar:shield-check-linear" className="w-4 h-4 mr-2" />
            Your Health Data, Secured.
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            Your Medical History,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Finally in Your Control.
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop carrying physical folders to every doctor's appointment. Securely upload, organize, and share your lab reports, X-rays, and prescriptions from one unified dashboard.
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
              className="w-full sm:w-auto bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 text-lg font-medium px-8 py-4 rounded-full transition flex items-center justify-center"
            >
              I'm a Healthcare Provider
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="px-6 py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How Swasth+ Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">We've eliminated the friction of managing medical documents. It only takes three steps to take back control of your health records.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="bg-white p-8 rounded-md shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-md flex items-center justify-center mb-6 transform -rotate-3">
                <Icon icon="solar:shield-check-linear" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. Sign Up Securely</h3>
              <p className="text-gray-600 leading-relaxed">
                Create your patient profile in seconds. Your identity and medical data are protected by enterprise-grade encryption.
              </p>
            </div>

            <div className="bg-white p-8 rounded-md shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-md flex items-center justify-center mb-6 transform rotate-3">
                <Icon icon="solar:file-send-linear" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. Digitize Your Records</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload your existing lab reports, MRI scans, and previous prescriptions. We support PDFs, JPEGs, and Office documents.
              </p>
            </div>

            <div className="bg-white p-8 rounded-md shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className="w-16 h-16 mx-auto bg-purple-100 text-purple-600 rounded-md flex items-center justify-center mb-6 transform -rotate-3">
                <Icon icon="solar:share-linear" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. Connect with Doctors</h3>
              <p className="text-gray-600 leading-relaxed">
                When you visit a clinic, your doctor can instantly look up your profile, view your history, and upload new prescriptions directly to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-gray-900">
            <Icon icon="solar:pulse-linear" className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold">Swasth+</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 Swasth+ Platform. Built for the Elite Debuggers Final Round.
          </p>
        </div>
      </footer>
    </div>
  );
}
