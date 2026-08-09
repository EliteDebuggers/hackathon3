import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import {
  getSimulationSettings,
  updateSimulationSettings,
  getSyncQueue,
  clearSyncQueue,
  synchronizeQueue,
  getResilienceLogs,
  subscribeToResilience,
} from '../../lib/resilience';

export default function ResilienceHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(getSimulationSettings());
  const [queue, setQueue] = useState(getSyncQueue());
  const [logs, setLogs] = useState(getResilienceLogs());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleNetworkChange = () => {
      setOnline(navigator.onLine);
    };
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    const unsubscribe = subscribeToResilience(() => {
      setSettings(getSimulationSettings());
      setQueue(getSyncQueue());
      setLogs([...getResilienceLogs()]);
    });

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      unsubscribe();
    };
  }, []);

  const toggleSetting = (key: 'simulateOffline' | 'simulateDbError' | 'simulateAiError') => {
    updateSimulationSettings({ [key]: !settings[key] });
  };

  const handleSyncNow = async () => {
    await synchronizeQueue();
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the offline queue?')) {
      clearSyncQueue();
    }
  };

  const isNetworkOffline = !online || settings.simulateOffline;
  const isDbOffline = settings.simulateDbError;
  const isAiOffline = settings.simulateAiError;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full text-white shadow-xl hover:shadow-2xl transition duration-300 ${isNetworkOffline || isDbOffline || isAiOffline
            ? 'bg-amber-600 hover:bg-amber-500 animate-pulse'
            : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
      >
        <Icon icon="solar:shield-bold" className="w-5 h-5" />
        <span className="text-xs font-bold tracking-wider">
          {isOpen ? 'Close Control Panel' : 'Resilience Panel'}
        </span>
        {queue.length > 0 && (
          <span className="bg-red-500 text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full text-white border border-white">
            {queue.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-3xl shadow-2xl p-5 overflow-hidden transition-all duration-300">

          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-50 p-1.5 rounded-xl">
                <Icon icon="solar:shield-check-bold" className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Resilience Console</h3>
                <p className="text-[10px] text-gray-500">Fault Injection & Recovery</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <Icon icon="solar:close-square-linear" className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className={`p-2.5 rounded-2xl border text-center ${isNetworkOffline
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
              <Icon icon={isNetworkOffline ? 'solar:wifi-router-minimal-broken' : 'solar:wifi-router-bold'} className="w-5 h-5 mx-auto mb-1" />
              <p className="text-[9px] font-extrabold uppercase">Network</p>
              <p className="text-[8px] font-medium opacity-80">{isNetworkOffline ? 'Offline' : 'Online'}</p>
            </div>

            <div className={`p-2.5 rounded-2xl border text-center ${isNetworkOffline || isDbOffline
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
              <Icon icon="solar:database-bold" className="w-5 h-5 mx-auto mb-1" />
              <p className="text-[9px] font-extrabold uppercase">Database</p>
              <p className="text-[8px] font-medium opacity-80">
                {isNetworkOffline || isDbOffline ? 'Disconnected' : 'Connected'}
              </p>
            </div>

            <div className={`p-2.5 rounded-2xl border text-center ${isNetworkOffline || isAiOffline
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
              <Icon icon="solar:cpu-bold" className="w-5 h-5 mx-auto mb-1" />
              <p className="text-[9px] font-extrabold uppercase">AI Cluster</p>
              <p className="text-[8px] font-medium opacity-80">
                {isNetworkOffline || isAiOffline ? 'Degraded' : 'Operational'}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
            <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Inject Failures (Test Resilience)</h4>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon icon="solar:shield-warning-linear" className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-semibold text-gray-700">Simulate Offline Mode</span>
              </div>
              <button
                onClick={() => toggleSetting('simulateOffline')}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-300 focus:outline-none ${settings.simulateOffline ? 'bg-amber-600 justify-end' : 'bg-gray-300 justify-start'
                  }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon icon="solar:database-broken" className="w-4 h-4 text-red-500" />
                <span className="text-[11px] font-semibold text-gray-700">Simulate DB Failure (500)</span>
              </div>
              <button
                onClick={() => toggleSetting('simulateDbError')}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-300 focus:outline-none ${settings.simulateDbError ? 'bg-red-600 justify-end' : 'bg-gray-300 justify-start'
                  }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon icon="solar:cpu-bolt-linear" className="w-4 h-4 text-purple-500" />
                <span className="text-[11px] font-semibold text-gray-700">Simulate AI Outage</span>
              </div>
              <button
                onClick={() => toggleSetting('simulateAiError')}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-300 focus:outline-none ${settings.simulateAiError ? 'bg-purple-600 justify-end' : 'bg-gray-300 justify-start'
                  }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>

          <div className="mb-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Offline Sync Queue</h4>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {queue.length} items
              </span>
            </div>

            {queue.length > 0 ? (
              <div className="space-y-1 max-h-24 overflow-y-auto mb-2 pr-1 border border-gray-200/50 rounded-xl p-1.5 bg-white">
                {queue.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-[9px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'document' || item.type === 'file_upload' ? 'bg-blue-500' :
                          item.type === 'appointment' ? 'bg-amber-500' : 'bg-purple-500'
                        }`} />
                      <span className="font-extrabold uppercase text-gray-600">{item.method}</span>
                      <span className="text-gray-500 truncate max-w-[120px]">{item.type}</span>
                    </div>
                    <span className="text-gray-400 text-[8px]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 italic py-2 text-center">No pending write operations.</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSyncNow}
                disabled={queue.length === 0 || isNetworkOffline}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Icon icon="solar:refresh-circle-linear" className="w-3.5 h-3.5" />
                Sync Now
              </button>
              <button
                onClick={handleClear}
                disabled={queue.length === 0}
                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-3 rounded-xl text-[10px] border border-red-200 transition disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Live Intercept Logs</h4>
            <div className="h-28 overflow-y-auto bg-slate-900 rounded-2xl p-2.5 font-mono text-[9px] text-emerald-400/90 space-y-1.5 border border-slate-800">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i} className="leading-normal break-all">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic text-center py-6">Waiting for operations...</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
