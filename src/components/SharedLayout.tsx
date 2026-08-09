import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Activity,
  Calendar,
  MessageSquare,
  User,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  HeartPulse
} from 'lucide-react';

interface SharedLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor';
}

export default function SharedLayout({ children, role }: SharedLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const patientLinks = [
    { name: 'Dashboard', icon: Activity, path: '/patient-dashboard' },
    { name: 'Appointments', icon: Calendar, path: '#' },
    { name: 'Messages', icon: MessageSquare, path: '#' },
    { name: 'Profile', icon: User, path: '#' },
  ];

  const doctorLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/doctor-dashboard' },
    { name: 'Patients', icon: Users, path: '#' },
    { name: 'Settings', icon: Settings, path: '#' },
  ];

  const links = role === 'patient' ? patientLinks : doctorLinks;

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">

      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-20 h-full ${isExpanded ? 'w-64' : 'w-20'
          }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          <div className={`flex items-center overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <HeartPulse className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <span className="ml-3 font-bold text-xl text-gray-900 whitespace-nowrap">HealthSync</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 transition-colors mx-auto shrink-0"
          >
            {isExpanded ? <ChevronLeft className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
          {links.map((link, index) => (
            <button
              key={index}
              onClick={() => link.path !== '#' && navigate(link.path)}
              className="flex items-center px-3 py-3 rounded-xl transition-colors text-gray-500 hover:text-blue-600 group shrink-0"
              title={!isExpanded ? link.name : undefined}
            >
              <link.icon className="w-6 h-6 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
              <span
                className={`ml-4 font-medium whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto translate-x-0' : 'opacity-0 w-0 -translate-x-4 overflow-hidden'
                  }`}
              >
                {link.name}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-3 w-full rounded-xl transition-colors text-gray-500 hover:text-red-600 group"
            title={!isExpanded ? 'Logout' : undefined}
          >
            <LogOut className="w-6 h-6 flex-shrink-0 group-hover:text-red-600 transition-colors" />
            <span
              className={`ml-4 font-medium whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto translate-x-0' : 'opacity-0 w-0 -translate-x-4 overflow-hidden'
                }`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      <header className="md:hidden shrink-0 bg-white h-16 border-b border-gray-200 flex items-center justify-center sticky top-0 z-10">
        <HeartPulse className="w-6 h-6 text-blue-600 mr-2" />
        <span className="font-bold text-lg text-gray-900">HealthSync</span>
      </header>

      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full pb-20 md:pb-0 relative">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-16 px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {links.slice(0, 4).map((link, index) => (
          <button
            key={index}
            onClick={() => link.path !== '#' && navigate(link.path)}
            className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-blue-600 transition-colors"
          >
            <link.icon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">{link.name}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}
