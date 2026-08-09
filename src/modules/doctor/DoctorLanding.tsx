import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

export default function DoctorLanding() {
 const navigate = useNavigate();

 return (
 <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-300">
 {/* Navbar (Dark Theme for Docs) */}
 <nav className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
 <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
 <Icon icon="solar:heart-pulse-bold" className="w-8 h-8 text-blue-500" />
 <span className="text-xl font-bold text-white tracking-tight">Swasth+</span>
 </Link>
 <div className="flex items-center gap-6">
 <Link to="/" className="hidden md:flex items-center text-sm font-medium text-slate-400 hover:text-white transition">
 <Icon icon="solar:user-linear" className="w-4 h-4 mr-1.5" />
 For Patients
 </Link>
 <div className="h-4 w-px bg-slate-700 hidden md:block"></div>
 <button 
 onClick={() => navigate('/login')}
 className="text-sm font-medium text-slate-300 hover:text-white transition"
 >
 Provider Login
 </button>
 <button 
 onClick={() => navigate('/login')}
 className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-full transition"
 >
 Register Clinic
 </button>
 </div>
 </nav>

 {/* Hero Section */}
 <section className="relative px-6 py-24 lg:py-32 overflow-hidden">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
 
 <div className="max-w-4xl mx-auto text-center relative z-10">
 <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-blue-400 text-sm font-medium mb-8">
 <Icon icon="solar:stethoscope-linear" className="w-4 h-4 mr-2" />
 The Provider Network
 </div>
 <h1 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-8">
 Treat the patient, <br/>
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
 not the paperwork.
 </span>
 </h1>
 <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
 Stop relying on patients to remember their medical history. Swasth+ gives you instant access to a unified timeline of your patients' lab results, scans, and past prescriptions.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
 <button 
 onClick={() => navigate('/login')}
 className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-lg font-medium px-8 py-4 rounded-full transition -900/50 flex items-center justify-center"
 >
 Join the Network
 <Icon icon="solar:arrow-right-linear" className="w-5 h-5 ml-2" />
 </button>
 </div>
 </div>
 </section>

 {/* Features Section */}
 <section className="px-6 py-24 bg-slate-800/50 border-y border-slate-800">
 <div className="max-w-6xl mx-auto">
 <div className="grid md:grid-cols-3 gap-8">
 <div className="bg-slate-800 p-8 rounded-md border border-slate-700 hover:border-slate-600 transition">
 <div className="w-14 h-14 bg-blue-900/50 text-blue-400 rounded-md flex items-center justify-center mb-6">
 <Icon icon="solar:magnifier-linear" className="w-7 h-7" />
 </div>
 <h3 className="text-xl font-bold text-white mb-3">Instant Patient Context</h3>
 <p className="text-slate-400 leading-relaxed">
 Look up any registered patient instantly. View their entire medical timeline before they even step into your consultation room.
 </p>
 </div>

 <div className="bg-slate-800 p-8 rounded-md border border-slate-700 hover:border-slate-600 transition">
 <div className="w-14 h-14 bg-indigo-900/50 text-indigo-400 rounded-md flex items-center justify-center mb-6">
 <Icon icon="solar:file-check-linear" className="w-7 h-7" />
 </div>
 <h3 className="text-xl font-bold text-white mb-3">Direct Prescriptions</h3>
 <p className="text-slate-400 leading-relaxed">
 Upload lab orders, referral letters, and prescriptions directly to the patient's profile. They'll have it immediately on their phone.
 </p>
 </div>

 <div className="bg-slate-800 p-8 rounded-md border border-slate-700 hover:border-slate-600 transition">
 <div className="w-14 h-14 bg-emerald-900/50 text-emerald-400 rounded-md flex items-center justify-center mb-6">
 <Icon icon="solar:pulse-linear" className="w-7 h-7" />
 </div>
 <h3 className="text-xl font-bold text-white mb-3">Global Dashboard</h3>
 <p className="text-slate-400 leading-relaxed">
 Monitor your entire clinic's activity from a centralized dashboard. Track recent uploads and manage your patient roster effortlessly.
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* Footer */}
 <footer className="bg-slate-900 py-12 px-6 mt-auto">
 <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
 <div className="flex items-center gap-2 text-white">
 <Icon icon="solar:pulse-linear" className="w-6 h-6 text-blue-500" />
 <span className="text-lg font-bold">Swasth+ Providers</span>
 </div>
 <p className="text-slate-500 text-sm">
 © 2026 Swasth+ Platform. NYC CodeQuest Final Round.
 </p>
 </div>
 </footer>
 </div>
 );
}
