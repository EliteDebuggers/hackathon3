export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: string;
  type: string;
  fileName?: string;
  fileData?: string;
}

export interface ResilienceStatus {
  isOnline: boolean;
  supabaseOnline: boolean;
  aiOnline: boolean;
  simulateOffline: boolean;
  simulateDbError: boolean;
  simulateAiError: boolean;
  queueLength: number;
  logs: string[];
}

const STORAGE_KEYS = {
  CACHE_PREFIX: 'swasth_res_cache:',
  QUEUE: 'swasth_res_sync_queue',
  SIMULATION: 'swasth_res_simulation',
};

interface SimulationSettings {
  simulateOffline: boolean;
  simulateDbError: boolean;
  simulateAiError: boolean;
}

let settings: SimulationSettings = {
  simulateOffline: false,
  simulateDbError: false,
  simulateAiError: false,
};

const logs: string[] = [];
let statusListeners: (() => void)[] = [];

function notifyListeners() {
  statusListeners.forEach(l => l());
}

export function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = `[${timestamp}] ${message}`;
  logs.unshift(logMsg);
  if (logs.length > 50) logs.pop();
  console.log(logMsg);
  notifyListeners();
}

try {
  const saved = localStorage.getItem(STORAGE_KEYS.SIMULATION);
  if (saved) {
    settings = JSON.parse(saved);
  }
} catch (e) {
  console.error(e);
}

export function getSimulationSettings(): SimulationSettings {
  return { ...settings };
}

export function updateSimulationSettings(updates: Partial<SimulationSettings>) {
  settings = { ...settings, ...updates };
  localStorage.setItem(STORAGE_KEYS.SIMULATION, JSON.stringify(settings));
  addLog(`Simulation settings updated: ${JSON.stringify(settings)}`);
  notifyListeners();
}

export function subscribeToResilience(listener: () => void) {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener);
  };
}

export function getResilienceLogs(): string[] {
  return logs;
}

export function getSyncQueue(): QueuedRequest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveSyncQueue(queue: QueuedRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    notifyListeners();
  } catch (e) {
    console.error('Failed to save sync queue:', e);
  }
}

export function clearSyncQueue() {
  saveSyncQueue([]);
  addLog('Sync queue cleared.');
}

export function isNetworkAvailable(): boolean {
  return navigator.onLine && !settings.simulateOffline;
}

function getCacheKey(url: string): string {
  try {
    const parsed = new URL(url);
    return STORAGE_KEYS.CACHE_PREFIX + parsed.pathname + parsed.search;
  } catch (e) {
    return STORAGE_KEYS.CACHE_PREFIX + url;
  }
}

function getCachedResponse(url: string): string | null {
  const key = getCacheKey(url);
  return localStorage.getItem(key);
}

function setCachedResponse(url: string, body: string) {
  const key = getCacheKey(url);
  try {
    localStorage.setItem(key, body);
  } catch (e) {
    console.error('Storage cache quota exceeded or error:', e);
  }
}

export async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
  const method = init?.method || 'GET';

  const isSupabase = url.includes('supabase.co');

  if (!isSupabase) {
    if (settings.simulateOffline) {
      throw new TypeError('Failed to fetch (simulated network offline)');
    }
    return fetch(input, init);
  }

  const shouldFail = settings.simulateDbError || !navigator.onLine || settings.simulateOffline;

  if (shouldFail) {
    if (method === 'GET') {
      const cached = getCachedResponse(url);
      if (cached) {
        addLog(`[DEGRADED] Offline GET served from cache: ${url.substring(0, 80)}...`);
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        addLog(`[FAILURE] Offline GET cache miss: ${url.substring(0, 80)}...`);
        const fallbackBody = url.includes('/rest/v1/') && !url.includes('single') ? '[]' : 'null';
        return new Response(fallbackBody, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      addLog(`[OFFLINE QUEUE] Intercepted write (${method}) to ${url.substring(0, 80)}...`);

      const bodyStr = init?.body ? (typeof init.body === 'string' ? init.body : await new Response(init.body).text()) : '';
      let type = 'general';
      if (url.includes('appointments')) type = 'appointment';
      else if (url.includes('documents')) type = 'document';
      else if (url.includes('ai_chat_sessions')) type = 'ai_session';
      else if (url.includes('ai_chat_messages')) type = 'ai_message';
      else if (url.includes('health_milestones')) type = 'milestone';

      let fileData: string | undefined;
      let fileName: string | undefined;

      if (url.includes('/storage/v1/object/medical-records')) {
        type = 'file_upload';
        if (init?.body instanceof File || init?.body instanceof Blob) {
          fileName = url.split('/').pop() || 'offline_document';
          fileData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(init.body as Blob);
          });
        }
      }

      const queued: QueuedRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(5)}`,
        url,
        method,
        headers: (init?.headers as Record<string, string>) || {},
        body: bodyStr,
        timestamp: new Date().toISOString(),
        type,
        fileName,
        fileData,
      };

      const queue = getSyncQueue();
      queue.push(queued);
      saveSyncQueue(queue);

      addLog(`[OFFLINE QUEUE] Saved offline. Queue length: ${queue.length}`);

      let mockRes = '{}';
      try {
        if (bodyStr) {
          const parsed = JSON.parse(bodyStr);
          mockRes = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
        }
      } catch (e) {
      }

      return new Response(mockRes, {
        status: method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const response = await fetch(input, init);

    if (response.ok && method === 'GET') {
      const clone = response.clone();
      clone.text().then(text => {
        setCachedResponse(url, text);
      }).catch(err => console.error('Cache clone error:', err));
    }

    return response;
  } catch (err: any) {
    addLog(`[NETWORK GLITCH] Live fetch failed: ${err.message || err}. Falling back...`);

    if (method === 'GET') {
      const cached = getCachedResponse(url);
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      const bodyStr = init?.body ? (typeof init.body === 'string' ? init.body : '') : '';
      const queued: QueuedRequest = {
        id: `req-${Date.now()}`,
        url,
        method,
        headers: (init?.headers as Record<string, string>) || {},
        body: bodyStr,
        timestamp: new Date().toISOString(),
        type: url.includes('appointments') ? 'appointment' : 'general',
      };
      const queue = getSyncQueue();
      queue.push(queued);
      saveSyncQueue(queue);
      return new Response(bodyStr || '{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }
}

let isSyncing = false;

export async function synchronizeQueue() {
  if (isSyncing) return;
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  if (!navigator.onLine || settings.simulateOffline || settings.simulateDbError) {
    return;
  }

  isSyncing = true;
  addLog(`[SYNC ENGINE] Starting synchronization of ${queue.length} items...`);

  const remainingQueue: QueuedRequest[] = [];

  for (const item of queue) {
    try {
      addLog(`[SYNC ENGINE] Syncing ${item.method} to ${item.url.substring(0, 50)}...`);

      let body: any = item.body;

      if (item.type === 'file_upload' && item.fileData) {
        const res = await fetch(item.fileData);
        body = await res.blob();
      }

      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: body
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`Server returned ${res.status}: ${errTxt}`);
      }

      addLog(`[SYNC ENGINE] Successfully synced item: ${item.id}`);
    } catch (e: any) {
      addLog(`[SYNC ERROR] Failed to sync ${item.id}: ${e.message || e}. Will retry later.`);
      remainingQueue.push(item);
    }
  }

  saveSyncQueue(remainingQueue);
  isSyncing = false;
  addLog(`[SYNC ENGINE] Synchronization cycle complete. Remaining items: ${remainingQueue.length}`);
}

setInterval(synchronizeQueue, 6000);

export function getOfflineAIResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  const greetings = ['hello', 'hi', 'hey', 'greetings', 'help'];
  const fever = ['fever', 'temperature', 'feverish', 'chills', 'hot'];
  const pain = ['pain', 'ache', 'hurts', 'chest pain', 'headache', 'backache'];
  const cough = ['cough', 'cold', 'sore throat', 'coughing', 'flu', 'congestion'];
  const stomach = ['stomach', 'belly', 'diarrhea', 'vomit', 'nausea', 'acid'];

  let reply = "I am operating in **Offline Triage Mode** because connection to the AI cluster is down.\n\n";

  if (greetings.some(g => msg.includes(g))) {
    reply += "Hello! I am your Swasth+ Offline Health Assistant. I can suggest basic home remedies and check-ups. What symptoms are you experiencing today?";
  } else if (fever.some(f => msg.includes(f))) {
    reply += "🩺 **Fever Advisory (Offline Mode)**:\n\n1. **Stay Hydrated**: Drink water, warm teas, or ORS solutions.\n2. **Cool Compress**: Apply a cool, damp cloth to your forehead.\n3. **Rest**: Avoid physical exertion.\n4. **Monitor**: Check temperature every 4 hours. If it exceeds 103°F (39.4°C) or lasts more than 3 days, please book a consultation with our doctors immediately.\n\n*Medication Note: Over-the-counter fever reducers (like Paracetamol) can help, but consult a doctor first.*";
  } else if (pain.some(p => msg.includes(p))) {
    if (msg.includes('chest')) {
      reply += "⚠️ **CRITICAL ADVISORY**:\n\nChest pain can indicate a serious cardiovascular event. Please seek emergency medical assistance immediately. Do not wait for an online consultation.";
    } else {
      reply += "🩹 **Pain Triage (Offline Mode)**:\n\n1. **Locate & Rest**: Avoid putting pressure on the painful area.\n2. **Cold/Warm Compress**: Apply ice packs for swelling or warm pads for muscle stiffness.\n3. **Hydration**: If it's a headache, drink plenty of water.\n\nIf the pain persists, grows severe, or is accompanied by dizziness/nausea, please seek professional care.";
    }
  } else if (cough.some(c => msg.includes(c))) {
    reply += "💨 **Respiratory Care (Offline Mode)**:\n\n1. **Warm Liquids**: Drink herbal teas, warm water with honey, or broth.\n2. **Steam Inhalation**: Inhale steam to relieve throat congestion.\n3. **Saline Gargle**: Gargle warm salt water 2-3 times daily.\n4. **Avoid Irritants**: Keep away from smoke and cold foods.\n\nIf you experience shortness of breath, please see a doctor immediately.";
  } else if (stomach.some(s => msg.includes(s))) {
    reply += "🤢 **Gastrointestinal Advisory (Offline Mode)**:\n\n1. **ORS & Hydration**: Drink fluids in small sips to avoid dehydration.\n2. **BRAT Diet**: Eat light foods like bananas, rice, applesauce, and toast.\n3. **Avoid Trigger Foods**: Skip dairy, greasy food, caffeine, and spicy items.\n\nSeek immediate emergency care if you notice blood in stool or experience severe persistent cramping.";
  } else {
    reply += "I've logged your symptoms. As I am currently in offline mode, I recommend:\n- Checking your prescribed medications under the **Medications** tab.\n- Drinking plenty of fluids and resting.\n- If symptoms are severe, please call your local healthcare provider or use the **Appointments** tab to book a doctor check-up (which will sync as soon as you're back online).";
  }

  return reply;
}
