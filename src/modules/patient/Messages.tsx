import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SharedLayout from '../../components/SharedLayout';
import { Icon } from '@iconify/react';

interface Notification {
  id: string;
  title: string;
  description: string;
  milestone_type: string;
  status: string;
  created_at: string;
  actor_id?: string;
}

export default function Messages() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [filter, setFilter] = useState<'all' | 'doctor_note' | 'action_required' | 'appointment_booked'>('all');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const pid = user ? user.id : 'guest-patient';
    setUserId(pid);
    fetchNotifications(pid);

    // Realtime subscription
    const channel = supabase
      .channel('patient-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'health_milestones', filter: `patient_id=eq.${pid}` },
        () => fetchNotifications(pid)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchNotifications = async (pid: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('health_milestones')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    } catch { /* guest mode fallback */ }
    setLoading(false);
  };

  const markAsRead = async (notifId: string) => {
    await supabase
      .from('health_milestones')
      .update({ status: 'read' })
      .eq('id', notifId);
    fetchNotifications(userId);
  };

  const deleteNotification = async (notifId: string) => {
    await supabase
      .from('health_milestones')
      .delete()
      .eq('id', notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.milestone_type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'doctor_note': return { icon: 'solar:letter-bold', bg: 'bg-violet-100', text: 'text-violet-600' };
      case 'action_required': return { icon: 'solar:danger-triangle-bold', bg: 'bg-amber-100', text: 'text-amber-600' };
      case 'appointment_booked': return { icon: 'solar:calendar-bold', bg: 'bg-blue-100', text: 'text-blue-600' };
      default: return { icon: 'solar:bell-bing-bold', bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'doctor_note': return { label: 'Doctor Message', cls: 'bg-violet-50 text-violet-700 border-violet-200' };
      case 'action_required': return { label: 'Action Required', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'appointment_booked': return { label: 'Appointment', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      default: return { label: 'Update', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const unreadCount = notifications.filter(n => n.status !== 'read').length;
  const doctorMessages = notifications.filter(n => n.milestone_type === 'doctor_note').length;
  const actionItems = notifications.filter(n => n.milestone_type === 'action_required').length;

  return (
    <SharedLayout role="patient">
      <div className="w-full p-2.5 md:p-4 flex-1 h-full flex flex-col gap-3 overflow-hidden">

        {/* Header */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Icon icon="solar:bell-bing-bold" className="w-6 h-6 text-violet-600" />
              Notifications & Messages
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Doctor messages, appointment updates, and action items from your care team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg font-bold border border-violet-200">
                {doctorMessages} Messages
              </span>
              <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-bold border border-amber-200">
                {actionItems} Actions
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-bold border border-red-200">
                  {unreadCount} Unread
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200/80 p-1.5 shadow-sm">
          {([
            { key: 'all', label: 'All', icon: 'solar:inbox-bold' },
            { key: 'doctor_note', label: 'Doctor Messages', icon: 'solar:letter-bold' },
            { key: 'action_required', label: 'Action Required', icon: 'solar:danger-triangle-bold' },
            { key: 'appointment_booked', label: 'Appointments', icon: 'solar:calendar-bold' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
                filter === tab.key
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon icon={tab.icon} className="w-3.5 h-3.5" />
              {tab.label}
              {tab.key !== 'all' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {notifications.filter(n => n.milestone_type === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Icon icon="solar:pulse-bold" className="w-8 h-8 text-violet-400 animate-pulse" />
              <span className="text-xs text-gray-500">Loading notifications…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="p-4 bg-violet-50 rounded-2xl">
                <Icon icon="solar:bell-off-bold-duotone" className="w-12 h-12 text-violet-300" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-gray-800 text-sm">No notifications yet</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  {filter === 'all'
                    ? 'Your notifications from doctors, appointments, and care updates will appear here.'
                    : `No ${filter.replace('_', ' ')} notifications to show.`}
                </p>
              </div>
            </div>
          ) : (
            filtered.map(notif => {
              const iconInfo = getIcon(notif.milestone_type);
              const typeInfo = getTypeLabel(notif.milestone_type);
              const isUnread = notif.status !== 'read';

              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition hover:shadow-md ${
                    isUnread ? 'border-violet-200/80 ring-1 ring-violet-100' : 'border-gray-200/80'
                  }`}
                >
                  <div className="p-4 flex items-start gap-3.5">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-xl shrink-0 ${iconInfo.bg}`}>
                      <Icon icon={iconInfo.icon} className={`w-5 h-5 ${iconInfo.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-sm font-bold leading-tight ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notif.title}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.cls}`}>
                              {typeInfo.label}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                            )}
                          </div>
                          {notif.description && (
                            <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap leading-relaxed">
                              {notif.description}
                            </p>
                          )}
                          <span className="text-[10px] text-gray-400 mt-2 block flex items-center gap-1">
                            <Icon icon="solar:clock-circle-linear" className="w-3 h-3" />
                            {new Date(notif.created_at).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isUnread && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="p-1.5 hover:bg-green-50 rounded-lg transition text-gray-400 hover:text-green-600"
                              title="Mark as read"
                            >
                              <Icon icon="solar:check-read-bold" className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500"
                            title="Delete notification"
                          >
                            <Icon icon="solar:trash-bin-minimalistic-linear" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SharedLayout>
  );
}
