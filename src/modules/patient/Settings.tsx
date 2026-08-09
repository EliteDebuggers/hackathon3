import React, { useState, useEffect } from 'react';
import SharedLayout from '../../components/SharedLayout';
import { supabase } from '../../lib/supabase';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

export default function PatientSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [customApiKey, setCustomApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-8b-instant');
  const [defaultApiKeySet, setDefaultApiKeySet] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMessage({ text: '', type: '' });
  }, [activeTab]);

  useEffect(() => {
    fetchProfile();
    const savedKey = localStorage.getItem('swasth_ai_api_key') || '';
    setCustomApiKey(savedKey);
    const savedModel = localStorage.getItem('swasth_ai_model') || 'llama-3.1-8b-instant';
    setSelectedModel(savedModel);
    setDefaultApiKeySet(
      !!import.meta.env.VITE_GROQ_API_KEY ||
      !!import.meta.env.VITE_GROK_API_KEY ||
      !!import.meta.env.VITE_XAI_API_KEY ||
      !!import.meta.env.VITE_GEMINI_API_KEY
    );
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single();
      if (data) {
        setFullName(data.full_name || '');
      }
    }
    setLoading(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error: profileError } = await supabase.from('users').update({ full_name: fullName }).eq('id', user.id);
      if (profileError) throw profileError;

      if (newPassword) {
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw authError;
      }

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setNewPassword('');
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirm) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('users').delete().eq('id', user.id);
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      alert("Failed to delete account. Please contact support.");
    }
  };

  const handleSaveAISettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      if (customApiKey.trim()) {
        localStorage.setItem('swasth_ai_api_key', customApiKey.trim());
      } else {
        localStorage.removeItem('swasth_ai_api_key');
      }
      localStorage.setItem('swasth_ai_model', selectedModel);
      setMessage({ text: 'AI configuration saved locally!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'solar:user-circle-linear' },
    { id: 'security', label: 'Security', icon: 'solar:lock-password-linear' },
    { id: 'ai', label: 'AI Settings', icon: 'solar:cpu-bold' },
    { id: 'danger', label: 'Danger Zone', icon: 'solar:danger-triangle-linear' },
  ];

  return (
    <SharedLayout role="patient">
      <div className="flex flex-col md:flex-row h-full w-full bg-gray-50">

        <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-gray-200 shrink-0 md:h-full z-10">
          <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold text-gray-900 hidden md:block mb-6">Settings</h1>
            <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap transition-all ${activeTab === tab.id
                    ? tab.id === 'danger'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon icon={tab.icon} className={`w-6 h-6 shrink-0 ${activeTab === tab.id ? (tab.id === 'danger' ? 'text-red-600' : 'text-blue-600') : 'text-gray-400'}`} />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1 h-full overflow-y-auto">
          <div className="p-6 md:p-10 max-w-4xl mx-auto pb-24 md:pb-10">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Icon icon="solar:spinner-broken-linear" className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="animate-fade-in">
                {activeTab === 'profile' && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Icon icon="solar:user-circle-linear" className="w-6 h-6 text-blue-600" />
                      Profile Information
                    </h2>

                    {message.text && (
                      <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <Icon icon={message.type === 'success' ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} className="w-5 h-5 shrink-0" />
                        {message.text}
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input type="email" value={email} disabled className="w-full bg-gray-50 border border-gray-200 text-gray-500 rounded-xl px-4 py-3 cursor-not-allowed" />
                        <p className="text-xs text-gray-400 mt-2">Email cannot be changed.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                          {saving && <Icon icon="solar:spinner-broken-linear" className="w-4 h-4 animate-spin" />}
                          Save Profile
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Icon icon="solar:lock-password-linear" className="w-6 h-6 text-blue-600" />
                      Security Settings
                    </h2>

                    {message.text && (
                      <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <Icon icon={message.type === 'success' ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} className="w-5 h-5 shrink-0" />
                        {message.text}
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" minLength={6} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        <p className="text-xs text-gray-400 mt-2">Minimum 6 characters. Leave blank if you don't want to change your password.</p>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <button type="submit" disabled={saving || !newPassword} className="bg-gray-900 hover:bg-black text-white font-medium px-8 py-3 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                          {saving && <Icon icon="solar:spinner-broken-linear" className="w-4 h-4 animate-spin" />}
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Icon icon="solar:cpu-bold" className="w-6 h-6 text-blue-600" />
                      AI Engine Configuration
                    </h2>

                    {message.text && (
                      <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <Icon icon={message.type === 'success' ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} className="w-5 h-5 shrink-0" />
                        {message.text}
                      </div>
                    )}

                    <form onSubmit={handleSaveAISettings} className="space-y-6 max-w-2xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom AI API Key (Groq / Grok)</label>
                        <input 
                          type="password" 
                          value={customApiKey} 
                          onChange={e => setCustomApiKey(e.target.value)} 
                          placeholder={defaultApiKeySet ? "•••••••••••••••• (Default key set in env)" : "Enter custom API key"} 
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          Provides a local key override. This key remains securely in your browser's local cache.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred AI Inference Model</label>
                        <select 
                          value={selectedModel} 
                          onChange={e => setSelectedModel(e.target.value)} 
                          className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast / Groq)</option>
                          <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Smart / Groq)</option>
                          <option value="grok-2-latest">grok-2-latest (Smart / xAI Grok)</option>
                        </select>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
                          {saving && <Icon icon="solar:spinner-broken-linear" className="w-4 h-4 animate-spin" />}
                          Save AI Settings
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'danger' && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-red-100 shadow-xl shadow-red-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <Icon icon="solar:danger-triangle-bold" className="w-48 h-48 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center gap-2 relative z-10">
                      <Icon icon="solar:danger-triangle-linear" className="w-6 h-6" />
                      Danger Zone
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-2xl relative z-10">
                      Once you delete your account, there is no going back. All your data, including appointments, messages, and profile information, will be permanently removed from our servers. Please be certain.
                    </p>

                    <button onClick={handleDeleteAccount} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 font-medium px-6 py-3 rounded-xl transition-colors relative z-10 flex items-center gap-2">
                      <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5 shrink-0" />
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SharedLayout>
  );
}
