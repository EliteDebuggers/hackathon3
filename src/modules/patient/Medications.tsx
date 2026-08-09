import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';
import type { Medication, MedicationLog } from '../../lib/medications';
import {
  getLocalMedications,
  getLocalMedicationLogs,
  toggleMedicationLog,
  addLocalMedication,
  requestNotificationPermission,
  sendPushNotification,
  playNotificationSound
} from '../../lib/medications';

export default function Medications() {
  const [patientId, setPatientId] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [instructions, setInstructions] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    checkUser();
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    if (patientId) {
      loadData(patientId);
    }
  }, [patientId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      medications.forEach(med => {
        if (med.reminder_time === currentHHMM && med.status === 'active') {
          const isTaken = logs.some(l => l.medication_id === med.id && l.status === 'taken');
          if (!isTaken) {
            sendPushNotification(
              `Medication Reminder: ${med.name}`,
              `Time for your ${med.dosage} (${med.time_of_day.toUpperCase()}). ${med.instructions || ''}`
            );
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [medications, logs]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setPatientId(user.id);
    } else {
      setPatientId('guest-patient');
    }
  };

  const loadData = (pid: string) => {
    const meds = getLocalMedications(pid);
    setMedications(meds);
    const todayLogs = getLocalMedicationLogs(pid, todayStr);
    setLogs(todayLogs);
  };

  const handleToggleLog = (medId: string, tod: 'morning' | 'afternoon' | 'evening' | 'night', status: 'taken' | 'skipped') => {
    if (!patientId) return;
    const updated = toggleMedicationLog(patientId, todayStr, medId, tod, status);
    setLogs([...updated]);

    if (status === 'taken') {
      playNotificationSound();
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      sendPushNotification(
        'Swasth+ Reminders Activated!',
        'You will now receive timely push notifications for your daily prescribed medications.'
      );
    } else {
      alert('Notification permissions were blocked. Please enable browser notifications in your site settings.');
    }
  };

  const handleTestNotification = () => {
    sendPushNotification(
      'Test Reminder Alert',
      'This is how your daily medication push notification will appear!'
    );
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !dosage || !patientId) return;

    addLocalMedication(patientId, {
      patient_id: patientId,
      name: medName,
      dosage: dosage,
      frequency: frequency,
      time_of_day: timeOfDay,
      reminder_time: reminderTime,
      instructions: instructions,
      status: 'active'
    });

    loadData(patientId);
    setIsAddModalOpen(false);

    setMedName('');
    setDosage('');
    setInstructions('');
  };

  const filteredMeds = medications.filter(m => selectedTimeOfDay === 'all' || m.time_of_day === selectedTimeOfDay);

  const totalMedsToday = medications.length;
  const takenCount = logs.filter(l => l.status === 'taken').length;
  const skippedCount = logs.filter(l => l.status === 'skipped').length;
  const adherenceScore = totalMedsToday > 0 ? Math.round((takenCount / totalMedsToday) * 100) : 0;

  const timeSlots: { key: 'morning' | 'afternoon' | 'evening' | 'night'; label: string; icon: string; time: string; color: string }[] = [
    { key: 'morning', label: 'Morning', icon: 'solar:sun-linear', time: '08:00 AM', color: 'from-amber-500 to-orange-500' },
    { key: 'afternoon', label: 'Afternoon', icon: 'solar:sun-fog-linear', time: '02:00 PM', color: 'from-blue-500 to-cyan-500' },
    { key: 'evening', label: 'Evening', icon: 'solar:sunset-linear', time: '08:00 PM', color: 'from-indigo-500 to-purple-500' },
    { key: 'night', label: 'Night', icon: 'solar:moon-stars-linear', time: '10:00 PM', color: 'from-slate-700 to-indigo-900' }
  ];

  return (
    <SharedLayout role="patient">
      <div className="p-3 md:p-5 max-w-7xl mx-auto w-full flex flex-col gap-4">

        {/* Header Banner - Compact Dense */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-4 md:p-5 text-white shadow-md shadow-blue-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-semibold uppercase tracking-wider mb-1.5">
              <Icon icon="solar:bell-bing-bold" className="w-3.5 h-3.5 text-amber-300" />
              Real-time Medication Reminders
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Daily Medication Tracker</h1>
            <p className="text-blue-100 mt-1 max-w-xl text-xs md:text-sm">
              Track your daily prescriptions assigned by doctors, log your doses, and get automatic browser push notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 z-10 w-full md:w-auto">
            {notificationsEnabled ? (
              <button
                onClick={handleTestNotification}
                className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium text-xs transition flex items-center backdrop-blur-md"
              >
                <Icon icon="solar:bell-ring-linear" className="w-4 h-4 mr-1.5" />
                Test Notification
              </button>
            ) : (
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl text-xs transition flex items-center shadow-sm"
              >
                <Icon icon="solar:bell-bing-bold" className="w-4 h-4 mr-1.5" />
                Enable Notifications
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs transition flex items-center shadow-sm"
            >
              <Icon icon="solar:add-circle-bold" className="w-4 h-4 mr-1.5 text-blue-600" />
              Add Medication
            </button>
          </div>
        </div>

        {/* Adherence & Summary Cards - Dense Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Daily Adherence</p>
              <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{adherenceScore}%</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">{takenCount} of {totalMedsToday} taken today</p>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="18" stroke="#E5E7EB" strokeWidth="4" fill="transparent" />
                <circle
                  cx="24" cy="24" r="18" stroke="#2563EB" strokeWidth="4" fill="transparent"
                  strokeDasharray={113}
                  strokeDashoffset={113 - (113 * adherenceScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <Icon icon="solar:heart-bold" className="w-4 h-4 text-blue-600 absolute" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Icon icon="solar:check-circle-bold" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Doses Taken</p>
              <h3 className="text-xl font-bold text-gray-900">{takenCount}</h3>
              <p className="text-[10px] text-green-600 font-medium">Completed today</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Icon icon="solar:clock-circle-bold" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pending Doses</p>
              <h3 className="text-xl font-bold text-gray-900">{Math.max(0, totalMedsToday - takenCount - skippedCount)}</h3>
              <p className="text-[10px] text-amber-600 font-medium">Remaining today</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Icon icon="solar:stethoscope-bold" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Doctor Prescribed</p>
              <h3 className="text-xl font-bold text-gray-900">
                {medications.filter(m => m.doctor_name).length}
              </h3>
              <p className="text-[10px] text-purple-600 font-medium">Assigned by doctor</p>
            </div>
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 p-1.5 rounded-2xl">
          <button
            onClick={() => setSelectedTimeOfDay('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedTimeOfDay === 'all'
              ? 'bg-white text-blue-600 shadow-md shadow-gray-200'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            All Medications ({medications.length})
          </button>

          {timeSlots.map(slot => {
            const count = medications.filter(m => m.time_of_day === slot.key).length;
            return (
              <button
                key={slot.key}
                onClick={() => setSelectedTimeOfDay(slot.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${selectedTimeOfDay === slot.key
                  ? 'bg-white text-blue-600 shadow-md shadow-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Icon icon={slot.icon} className="w-4 h-4" />
                {slot.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeds.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-lg shadow-gray-200/30">
              <Icon icon="solar:pill-bold-duotone" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">No medications found</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
                No active medications for this time slot. Click "Add Medication" above or book a doctor appointment to receive assigned prescriptions.
              </p>
            </div>
          ) : (
            filteredMeds.map(med => {
              const log = logs.find(l => l.medication_id === med.id);
              const isTaken = log?.status === 'taken';
              const isSkipped = log?.status === 'skipped';
              const slotInfo = timeSlots.find(s => s.key === med.time_of_day) || timeSlots[0];

              return (
                <div
                  key={med.id}
                  className={`bg-white rounded-3xl border transition-all p-6 shadow-lg flex flex-col justify-between relative overflow-hidden group ${isTaken
                    ? 'border-green-300 bg-green-50/20 shadow-green-100'
                    : isSkipped
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-gray-100 shadow-gray-200/40 hover:shadow-xl'
                    }`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${slotInfo.color}`} />

                  <div>
                    <div className="flex justify-between items-start mb-3 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 font-bold">
                          <Icon icon="solar:pill-bold" className="w-6 h-6" />
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg leading-tight">{med.name}</h3>
                          <span className="text-xs text-blue-600 font-semibold">{med.dosage}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 font-semibold rounded-full text-xs flex items-center gap-1">
                        <Icon icon="solar:clock-circle-linear" className="w-3.5 h-3.5" />
                        {med.reminder_time}
                      </span>
                    </div>

                    {med.doctor_name && (
                      <div className="mb-3 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                        <Icon icon="solar:stethoscope-bold" className="w-4 h-4 text-purple-600" />
                        Prescribed by {med.doctor_name}
                      </div>
                    )}

                    {med.instructions && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-4">
                        <span className="font-semibold text-gray-800">Note: </span>
                        {med.instructions}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500 capitalize">
                      Slot: <span className="font-bold text-gray-800">{med.time_of_day}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleLog(med.id, med.time_of_day, 'skipped')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSkipped
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                      >
                        {isSkipped ? 'Skipped' : 'Skip'}
                      </button>

                      <button
                        onClick={() => handleToggleLog(med.id, med.time_of_day, 'taken')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${isTaken
                          ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                          }`}
                      >
                        <Icon icon={isTaken ? 'solar:check-circle-bold' : 'solar:check-read-linear'} className="w-4 h-4" />
                        {isTaken ? 'Taken' : 'Mark Taken'}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Icon icon="solar:pill-bold" className="w-6 h-6 text-blue-600" />
                  Add Custom Medication
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddMedication} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol"
                    value={medName}
                    onChange={e => setMedName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Dosage</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500mg, 1 tablet"
                      value={dosage}
                      onChange={e => setDosage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={e => setFrequency(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Every 8 Hours">Every 8 Hours</option>
                      <option value="As Needed">As Needed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Time Slot</label>
                    <select
                      value={timeOfDay}
                      onChange={e => setTimeOfDay(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="morning">Morning (8 AM)</option>
                      <option value="afternoon">Afternoon (2 PM)</option>
                      <option value="evening">Evening (8 PM)</option>
                      <option value="night">Night (10 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Reminder Time</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={e => setReminderTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Doctor Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Take after breakfast with warm water"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-lg shadow-blue-500/20"
                  >
                    Save Medication
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SharedLayout>
  );
}
