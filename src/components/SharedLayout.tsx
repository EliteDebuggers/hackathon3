import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLayoutContext } from './LayoutContext';
import { Icon } from '@iconify/react';
import { Menu } from 'lucide-react';

interface SharedLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor';
}

export default function SharedLayout({ children, role }: SharedLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isChatbotOpen, toggleChatbot } = useLayoutContext();
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);

  const [userName, setUserName] = useState<string>('');
  const [userCode, setUserCode] = useState<string>('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    fetchUserProfile();
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [role]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const codePrefix = role === 'doctor' ? 'DOC' : 'PAT';
      const shortId = user.id.replace(/-/g, '').substring(0, 4).toUpperCase();
      setUserCode(`${codePrefix}-${shortId}`);

      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single();
      if (data?.full_name) {
        setUserName(data.full_name);
      } else {
        setUserName(user.email?.split('@')[0] || (role === 'doctor' ? 'Dr. Specialist' : 'Patient'));
      }
    } else {
      setUserName(role === 'doctor' ? 'Dr. Sarah Sharma' : 'Rahul Sharma');
      setUserCode(role === 'doctor' ? 'DOC-1024' : 'PAT-4821');
    }
  };

  const handleSettingsClick = () => {
    setIsProfileOpen(false);
    navigate(role === 'patient' ? '/patient-settings' : '/doctor-settings');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const patientLinks = [
    { name: 'Dashboard', icon: 'solar:heart-pulse-bold', path: '/patient-dashboard' },
    { name: 'Medical Records', icon: 'solar:folder-with-files-bold', path: '/patient-records' },
    { name: 'Medications', icon: 'solar:bell-bing-linear', path: '/patient-medications' },
    { name: 'Find Doctors', icon: 'solar:stethoscope-linear', path: '/patient-doctors' },
    { name: 'Appointments', icon: 'solar:calendar-linear', path: '/patient-appointments' },
    { name: 'Messages', icon: 'solar:chat-round-linear', path: '/patient-messages' },
    { name: 'Settings', icon: 'solar:settings-linear', path: '/patient-settings' },
  ];

  const doctorLinks = [
    { name: 'Dashboard', icon: 'solar:widget-linear', path: '/doctor-dashboard' },
    { name: 'My Schedule', icon: 'solar:calendar-date-linear', path: '/doctor-schedule' },
    { name: 'Patients', icon: 'solar:users-group-rounded-linear', path: '/doctor-patients' },
    { name: 'Settings', icon: 'solar:settings-linear', path: '/doctor-settings' },
  ];

  const links = role === 'patient' ? patientLinks : doctorLinks;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      <header className="h-14 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 z-30 relative border-b border-gray-200/80">
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-md text-gray-500 hover:text-blue-600 transition-colors mr-2 hidden md:block"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Icon icon="solar:heart-pulse-bold" className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <span className="ml-3 font-extrabold text-xl text-gray-900 hidden sm:block tracking-tight">Swasth+</span>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {role === 'patient' && (
            <button
              onClick={toggleChatbot}
              className={`px-4 py-2 rounded-xl transition-all font-medium flex items-center ${isChatbotOpen
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent hover:opacity-90'
                }`}
              title="Toggle Swasth+"
            >
              <Icon icon="solar:chat-round-call-outline" className="w-5 h-5" />
              <span className="ml-2 hidden sm:block text-sm">Swasth+</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100/80 border border-gray-200/60 rounded-xl text-xs">
            <Icon icon={role === 'doctor' ? "solar:stethoscope-bold" : "solar:user-circle-bold"} className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-gray-900 truncate max-w-[120px] md:max-w-[180px]">{userName}</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md uppercase tracking-wider shrink-0">{userCode}</span>
          </div>

          <div className="w-px h-8 bg-gray-200 hidden sm:block mx-1"></div>
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="p-2 text-gray-400 hover:text-blue-600 transition flex items-center"
              title="Profile"
            >
              <Icon icon="solar:user-linear" className="w-6 h-6" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100">
                <button
                  onClick={handleSettingsClick}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Icon icon="solar:settings-linear" className="w-5 h-5 text-gray-400" />
                  Settings
                </button>
                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <Icon icon="solar:logout-2-linear" className="w-5 h-5 text-red-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        <aside
          className={`hidden md:flex flex-col bg-white border-r border-gray-200/80 transition-all duration-300 ease-in-out z-20 h-full ${isExpanded ? 'w-64' : 'w-16'
            }`}
        >
          <nav className="flex-1 py-4 flex flex-col gap-1.5 px-2 overflow-y-auto">
            {links.map((link, index) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={index}
                  onClick={() => link.path !== '#' && navigate(link.path)}
                  className={`flex items-center px-3 py-3 transition-all group shrink-0 ${
                    isActive
                      ? isExpanded
                        ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600 shadow-sm rounded-r-xl'
                        : 'text-blue-600 font-bold bg-transparent'
                      : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-xl'
                  }`}
                  title={!isExpanded ? link.name : undefined}
                >
                  <Icon icon={link.icon} className={`w-6 h-6 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600 font-bold' : 'group-hover:text-blue-600'}`} />
                  <span
                    className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto translate-x-0' : 'opacity-0 w-0 -translate-x-4 overflow-hidden'
                      }`}
                  >
                    {link.name}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full pb-20 md:pb-0 relative">
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-16 px-2 z-50">
        {links.slice(0, 4).map((link, index) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={index}
              onClick={() => link.path !== '#' && navigate(link.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-blue-600'
              }`}
            >
              <Icon icon={link.icon} className="w-6 h-6 mb-1" />
              <span className="text-[10px]">{link.name}</span>
            </button>
          );
        })}
        {role === 'patient' && (
          <button
            onClick={toggleChatbot}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isChatbotOpen ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
              }`}
          >
            <Icon icon="solar:chat-round-call-outline" className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">AI</span>
          </button>
        )}
      </nav>
    </div>
  );
}
