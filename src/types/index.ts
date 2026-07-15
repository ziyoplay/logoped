export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  diagnosis: string;
  notes: string;
  status: 'active' | 'inactive' | 'completed';
  startDate: string;
  sessionsTotal: number;
  sessionsCompleted: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  notes: string;
  exercises: string[];
}

export interface Assignment {
  id: string;
  clientId: string;
  title: string;
  description: string;
  exerciseType: string;
  frequency: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  instructions: string[];
}

export interface ProgressRecord {
  id: string;
  clientId: string;
  date: string;
  exerciseType: string;
  score: number;
  maxScore: number;
  notes: string;
  period: 'before' | 'after';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  minQuantity: number;
  supplier: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  appointments: Appointment[];
  tasks: string[];
  notes: string;
}

export type Page = 
  | 'daily-plan' 
  | 'clients' 
  | 'appointments' 
  | 'assignments' 
  | 'monitoring' 
  | 'exercises' 
  | 'progress' 
  | 'products' 
  | 'reports';
