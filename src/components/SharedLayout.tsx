import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { isChatbotOpen, toggleChatbot } = useLayoutContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const patientLinks = [
    { name: 'Dashboard', icon: 'solar:heart-pulse-linear', path: '/patient-dashboard' },
    { name: 'Appointments', icon: 'solar:calendar-linear', path: '/patient-appointments' },
    { name: 'Messages', icon: 'solar:chat-round-linear', path: '/patient-messages' },
  ];

  const doctorLinks = [
    { name: 'Dashboard', icon: 'solar:widget-linear', path: '/doctor-dashboard' },
    { name: 'Patients', icon: 'solar:users-group-rounded-linear', path: '/doctor-patients' },
    { name: 'Settings', icon: 'solar:settings-linear', path: '/doctor-settings' },
  ];

  const links = role === 'patient' ? patientLinks : doctorLinks;

  return (
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

        <header className="h-14 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 z-30 relative shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-md text-gray-500 hover:text-blue-600 transition-colors mr-2 hidden md:block"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Icon icon="solar:heart-pulse-linear" className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <span className="ml-3 font-bold text-xl text-gray-900 hidden sm:block">HealthSync</span>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {role === 'patient' && (
              <button 
                onClick={toggleChatbot}
                className={`px-4 py-2 rounded-xl transition-all font-medium flex items-center shadow-sm ${
                  isChatbotOpen 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent hover:shadow-md hover:opacity-90'
                }`}
                title="Toggle AI Assistant"
              >
                <Icon icon="solar:chat-round-line-linear" className="w-5 h-5" />
                <span className="ml-2 hidden sm:block text-sm">AI Assistant</span>
              </button>
            )}
            <div className="w-px h-8 bg-gray-200 hidden sm:block mx-2"></div>
            <button className="p-2 text-gray-400 hover:text-blue-600 transition hidden sm:block" title="Profile">
              <Icon icon="solar:user-linear" className="w-6 h-6" />
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition flex items-center" title="Logout">
              <Icon icon="solar:logout-2-linear" className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-row overflow-hidden relative">
          <aside
            className={`hidden md:flex flex-col bg-white shadow-[1px_0_15px_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out z-20 h-full ${isExpanded ? 'w-64' : 'w-16'
              }`}
          >
            <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
              {links.map((link, index) => (
                <button
                  key={index}
                  onClick={() => link.path !== '#' && navigate(link.path)}
                  className="flex items-center px-3 py-3 rounded-md transition-colors text-gray-500 hover:text-blue-600 group shrink-0"
                  title={!isExpanded ? link.name : undefined}
                >
                  <Icon icon={link.icon} className="w-6 h-6 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
                  <span
                    className={`ml-4 font-medium whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto translate-x-0' : 'opacity-0 w-0 -translate-x-4 overflow-hidden'
                      }`}
                  >
                    {link.name}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full pb-20 md:pb-0 relative">
            {children}
          </main>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white flex items-center justify-around h-16 px-2 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          {links.slice(0, 4).map((link, index) => (
            <button
              key={index}
              onClick={() => link.path !== '#' && navigate(link.path)}
              className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Icon icon={link.icon} className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">{link.name}</span>
            </button>
          ))}
          {role === 'patient' && (
            <button
              onClick={toggleChatbot}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isChatbotOpen ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
                }`}
            >
              <Icon icon="solar:chat-round-line-linear" className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">AI</span>
            </button>
          )}
        </nav>
      </div>
  );
}
