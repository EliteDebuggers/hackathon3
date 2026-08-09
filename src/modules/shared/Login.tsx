import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', userData.user.id)
            .single();

          if (profile?.role === 'doctor') navigate('/doctor-dashboard');
          else navigate('/patient-dashboard');
        }
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert([{ id: authData.user.id, role, full_name: fullName.trim() || null }]);

          if (profileError) throw profileError;

          if (role === 'doctor') navigate('/doctor-dashboard');
          else navigate('/patient-dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/60 font-sans relative overflow-hidden">
      
      {/* Top Header */}
      <div className="p-4 md:p-6 z-20 flex justify-between items-center max-w-7xl w-full mx-auto">
        <Link to="/" className="inline-flex items-center text-xs md:text-sm font-bold text-gray-700 hover:text-blue-600 transition bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-gray-200/80 shadow-sm">
          <Icon icon="solar:arrow-left-linear" className="w-4 h-4 mr-1.5" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Decorative Column: 3D Nurse */}
          <div className="hidden lg:flex lg:col-span-3 flex-col items-center text-center">
            <div className="relative w-56 group">
              <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl transform group-hover:scale-105 transition-transform duration-500"></div>
              <img
                src="/nurse-hero.png"
                alt="Support Nurse"
                className="relative z-10 w-full h-auto drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 mt-4">Virtual Care Assistant</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              24/7 AI-assisted health triage, instant doctor consultation summaries & prescriptions.
            </p>
          </div>

          {/* Center Column: Login Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 sm:p-8 shadow-2xl shadow-blue-500/10">
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <Icon icon="solar:heart-pulse-bold" className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Swasth+</h1>
              </div>

              <div className="flex bg-gray-100/80 p-1 rounded-2xl mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                    isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                    !isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-5 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('patient')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        role === 'patient'
                          ? 'bg-blue-50/80 border-blue-600 text-blue-600 font-bold shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon icon="solar:user-circle-bold" className="w-5 h-5" />
                      <span className="text-xs">Patient</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('doctor')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        role === 'doctor'
                          ? 'bg-blue-50/80 border-blue-600 text-blue-600 font-bold shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon icon="solar:stethoscope-bold" className="w-5 h-5" />
                      <span className="text-xs">Doctor</span>
                    </button>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      placeholder="e.g. Dr. Sarah Sharma"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                    placeholder="••••••••"
                  />
                  {!isLogin && <p className="text-[10px] text-gray-400 mt-1">Minimum 6 characters.</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20 text-xs disabled:opacity-50 mt-2"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In to Dashboard' : 'Create Swasth+ Account')}
                </button>
              </form>

            </div>
          </div>

          {/* Right Decorative Column: 3D Pills */}
          <div className="hidden lg:flex lg:col-span-3 flex-col items-center text-center">
            <div className="relative w-52 group">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl transform group-hover:scale-105 transition-transform duration-500"></div>
              <img
                src="/pills-3d.png"
                alt="Medication Tracker"
                className="relative z-10 w-full h-auto drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 mt-4">Medication Tracker</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              Real-time push notifications, dose logging, and doctor prescription sync.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
