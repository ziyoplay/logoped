const STORAGE_KEYS = {
  CLIENTS: 'logoped_clients',
  APPOINTMENTS: 'logoped_appointments',
  ASSIGNMENTS: 'logoped_assignments',
  EXERCISES: 'logoped_exercises',
  PROGRESS: 'logoped_progress',
  PRODUCTS: 'logoped_products',
  DAILY_PLANS: 'logoped_daily_plans',
};

export function loadData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export { STORAGE_KEYS };
