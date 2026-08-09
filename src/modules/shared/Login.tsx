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
 <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
 <div className="p-6">
 <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition">
 <Icon icon="solar:arrow-left-linear" className="w-4 h-4 mr-2" />
 Back to Home
 </Link>
 </div>
 
 <div className="flex-1 flex items-center justify-center p-4">
 <div className="w-full max-w-md bg-white rounded-md border border-gray-100 p-8">
 <div className="flex items-center justify-center gap-2 mb-8">
 <Icon icon="solar:pulse-linear" className="w-8 h-8 text-blue-600" />
 <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Swasth+</h1>
 </div>

 <div className="flex gap-4 mb-8">
 <button
 onClick={() => setIsLogin(true)}
 className={`flex-1 py-2 font-medium border-b-2 ${isLogin ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
 >
 Login
 </button>
 <button
 onClick={() => setIsLogin(false)}
 className={`flex-1 py-2 font-medium border-b-2 ${!isLogin ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
 >
 Sign Up
 </button>
 </div>

 {error && (
 <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
 {error}
 </div>
 )}

 <form onSubmit={handleAuth} className="space-y-6">
 {!isLogin && (
 <div className="grid grid-cols-2 gap-4">
 <button
 type="button"
 onClick={() => setRole('patient')}
 className={`flex flex-col items-center p-4 border rounded-md ${role === 'patient' ? 'bg-blue-50 border-blue-600' : 'border-gray-200'}`}
 >
 <Icon icon="solar:user-circle-linear" className={`w-8 h-8 mb-2 ${role === 'patient' ? 'text-blue-600' : 'text-gray-400'}`} />
 <span className={`font-medium ${role === 'patient' ? 'text-blue-600' : 'text-gray-600'}`}>Patient</span>
 </button>
 <button
 type="button"
 onClick={() => setRole('doctor')}
 className={`flex flex-col items-center p-4 border rounded-md ${role === 'doctor' ? 'bg-blue-50 border-blue-600' : 'border-gray-200'}`}
 >
 <Icon icon="solar:stethoscope-linear" className={`w-8 h-8 mb-2 ${role === 'doctor' ? 'text-blue-600' : 'text-gray-400'}`} />
 <span className={`font-medium ${role === 'doctor' ? 'text-blue-600' : 'text-gray-600'}`}>Doctor</span>
 </button>
 </div>
 )}

 {!isLogin && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
 <input
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
 placeholder="Dr. Sarah Jenkins"
 />
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
 placeholder="you@example.com"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
 <input
 type="password"
 required
 minLength={6}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
 placeholder="••••••••"
 />
 {!isLogin && <p className="text-xs text-gray-400 mt-1">Minimum 6 characters.</p>}
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-blue-600 text-white font-medium py-3 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
 >
 {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
 </button>
 </form>
 </div>
 </div>
 </div>
 );
}
