export interface Medication {
  id: string;
  patient_id: string;
  doctor_id?: string;
  doctor_name?: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  reminder_time: string;
  instructions?: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  date: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  status: 'taken' | 'skipped' | 'pending';
  taken_at?: string;
}

export interface DietPlan {
  id: string;
  patient_id: string;
  doctor_name?: string;
  title: string;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
  recommended_foods: string[];
  restricted_foods: string[];
  notes?: string;
  updated_at: string;
}

const LOCAL_MEDS_KEY = 'swasth_patient_medications';
const LOCAL_LOGS_KEY = 'swasth_medication_logs';
const LOCAL_DIETS_KEY = 'swasth_diet_plans';

const DEFAULT_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    patient_id: 'default',
    doctor_name: 'Dr. Sarah Sharma',
    name: 'Amoxicillin 500mg',
    dosage: '1 Capsule',
    frequency: 'Daily',
    time_of_day: 'morning',
    reminder_time: '08:00',
    instructions: 'Take with warm water after breakfast',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'med-2',
    patient_id: 'default',
    doctor_name: 'Dr. Sarah Sharma',
    name: 'Multivitamin Complex',
    dosage: '1 Tablet',
    frequency: 'Daily',
    time_of_day: 'afternoon',
    reminder_time: '14:00',
    instructions: 'Take after lunch',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 'med-3',
    patient_id: 'default',
    doctor_name: 'Dr. Rajesh Patel',
    name: 'Metformin 850mg',
    dosage: '1 Tablet',
    frequency: 'Daily',
    time_of_day: 'evening',
    reminder_time: '20:00',
    instructions: 'Take with meal',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

const DEFAULT_DIET_PLAN: DietPlan = {
  id: 'diet-1',
  patient_id: 'default',
  doctor_name: 'Dr. Ananya Roy (Clinical Nutritionist)',
  title: 'Balanced Health & Recovery Diet Plan',
  target_calories: 2100,
  protein_g: 90,
  carbs_g: 240,
  fats_g: 55,
  breakfast: 'Oatmeal with almonds & berries + 1 cup Green Tea',
  lunch: 'Brown rice, steamed dal, mixed vegetable curry & fresh salad',
  dinner: 'Grilled paneer/tofu or light soup with whole wheat roti',
  snacks: 'Handful of roasted walnuts & fresh apple slices',
  recommended_foods: ['Leafy Greens', 'Whole Grains', 'Legumes', 'Fresh Fruits', 'Nuts & Seeds'],
  restricted_foods: ['Processed Sugars', 'Deep Fried Foods', 'High Sodium Snacks', 'Carbonated Drinks'],
  notes: 'Stay hydrated with at least 3 Liters of water daily. Avoid heavy eating after 8:30 PM.',
  updated_at: new Date().toISOString()
};

export function getLocalMedications(patientId: string): Medication[] {
  try {
    const data = localStorage.getItem(`${LOCAL_MEDS_KEY}_${patientId}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  const defaultMeds = DEFAULT_MEDICATIONS.map(m => ({ ...m, patient_id: patientId }));
  saveLocalMedications(patientId, defaultMeds);
  return defaultMeds;
}

export function saveLocalMedications(patientId: string, meds: Medication[]) {
  try {
    localStorage.setItem(`${LOCAL_MEDS_KEY}_${patientId}`, JSON.stringify(meds));
  } catch (e) {
    console.error(e);
  }
}

export function addLocalMedication(patientId: string, med: Omit<Medication, 'id' | 'created_at'>): Medication {
  const current = getLocalMedications(patientId);
  const newMed: Medication = {
    ...med,
    id: `med-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  const updated = [newMed, ...current];
  saveLocalMedications(patientId, updated);
  return newMed;
}

export function getLocalMedicationLogs(patientId: string, dateStr: string): MedicationLog[] {
  try {
    const data = localStorage.getItem(`${LOCAL_LOGS_KEY}_${patientId}_${dateStr}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveLocalMedicationLogs(patientId: string, dateStr: string, logs: MedicationLog[]) {
  try {
    localStorage.setItem(`${LOCAL_LOGS_KEY}_${patientId}_${dateStr}`, JSON.stringify(logs));
  } catch (e) {
    console.error(e);
  }
}

export function toggleMedicationLog(
  patientId: string,
  dateStr: string,
  medicationId: string,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
  status: 'taken' | 'skipped'
): MedicationLog[] {
  const currentLogs = getLocalMedicationLogs(patientId, dateStr);
  const existingIdx = currentLogs.findIndex(l => l.medication_id === medicationId && l.time_of_day === timeOfDay);

  if (existingIdx >= 0) {
    if (currentLogs[existingIdx].status === status) {
      currentLogs.splice(existingIdx, 1);
    } else {
      currentLogs[existingIdx].status = status;
      currentLogs[existingIdx].taken_at = new Date().toISOString();
    }
  } else {
    currentLogs.push({
      id: `log-${Date.now()}`,
      medication_id: medicationId,
      patient_id: patientId,
      date: dateStr,
      time_of_day: timeOfDay,
      status: status,
      taken_at: new Date().toISOString()
    });
  }

  saveLocalMedicationLogs(patientId, dateStr, currentLogs);
  return currentLogs;
}

export function getLocalDietPlan(patientId: string): DietPlan {
  try {
    const data = localStorage.getItem(`${LOCAL_DIETS_KEY}_${patientId}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  const defaultDiet = { ...DEFAULT_DIET_PLAN, patient_id: patientId };
  saveLocalDietPlan(patientId, defaultDiet);
  return defaultDiet;
}

export function saveLocalDietPlan(patientId: string, plan: DietPlan) {
  try {
    localStorage.setItem(`${LOCAL_DIETS_KEY}_${patientId}`, JSON.stringify(plan));
  } catch (e) {
    console.error(e);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notifications.');
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function sendPushNotification(title: string, body: string, iconUrl?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const options: NotificationOptions = {
      body,
      icon: iconUrl || '/favicon.ico',
      badge: '/favicon.ico'
    };
    new Notification(title, options);
  }
  playNotificationSound();
}

export function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio playback not allowed or failed:', e);
  }
}
