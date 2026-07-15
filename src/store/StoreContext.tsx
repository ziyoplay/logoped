import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Client, Appointment, Assignment, Exercise, ProgressRecord, Product, DailyPlan } from '../types';
import { loadData, saveData, generateId, STORAGE_KEYS } from '../utils/storage';

interface AppState {
  clients: Client[];
  appointments: Appointment[];
  assignments: Assignment[];
  exercises: Exercise[];
  progress: ProgressRecord[];
  products: Product[];
  dailyPlans: DailyPlan[];
}

type Action =
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'SET_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'DELETE_APPOINTMENT'; payload: string }
  | { type: 'SET_ASSIGNMENTS'; payload: Assignment[] }
  | { type: 'ADD_ASSIGNMENT'; payload: Assignment }
  | { type: 'UPDATE_ASSIGNMENT'; payload: Assignment }
  | { type: 'DELETE_ASSIGNMENT'; payload: string }
  | { type: 'SET_EXERCISES'; payload: Exercise[] }
  | { type: 'ADD_EXERCISE'; payload: Exercise }
  | { type: 'UPDATE_EXERCISE'; payload: Exercise }
  | { type: 'DELETE_EXERCISE'; payload: string }
  | { type: 'SET_PROGRESS'; payload: ProgressRecord[] }
  | { type: 'ADD_PROGRESS'; payload: ProgressRecord }
  | { type: 'DELETE_PROGRESS'; payload: string }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_DAILY_PLANS'; payload: DailyPlan[] }
  | { type: 'ADD_DAILY_PLAN'; payload: DailyPlan }
  | { type: 'UPDATE_DAILY_PLAN'; payload: DailyPlan };

const initialState: AppState = {
  clients: [],
  appointments: [],
  assignments: [],
  exercises: [],
  progress: [],
  products: [],
  dailyPlans: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter((c) => c.id !== action.payload) };
    case 'SET_APPOINTMENTS':
      return { ...state, appointments: action.payload };
    case 'ADD_APPOINTMENT':
      return { ...state, appointments: [...state.appointments, action.payload] };
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_APPOINTMENT':
      return { ...state, appointments: state.appointments.filter((a) => a.id !== action.payload) };
    case 'SET_ASSIGNMENTS':
      return { ...state, assignments: action.payload };
    case 'ADD_ASSIGNMENT':
      return { ...state, assignments: [...state.assignments, action.payload] };
    case 'UPDATE_ASSIGNMENT':
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ASSIGNMENT':
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.payload) };
    case 'SET_EXERCISES':
      return { ...state, exercises: action.payload };
    case 'ADD_EXERCISE':
      return { ...state, exercises: [...state.exercises, action.payload] };
    case 'UPDATE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_EXERCISE':
      return { ...state, exercises: state.exercises.filter((e) => e.id !== action.payload) };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'ADD_PROGRESS':
      return { ...state, progress: [...state.progress, action.payload] };
    case 'DELETE_PROGRESS':
      return { ...state, progress: state.progress.filter((p) => p.id !== action.payload) };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter((p) => p.id !== action.payload) };
    case 'SET_DAILY_PLANS':
      return { ...state, dailyPlans: action.payload };
    case 'ADD_DAILY_PLAN':
      return { ...state, dailyPlans: [...state.dailyPlans, action.payload] };
    case 'UPDATE_DAILY_PLAN':
      return {
        ...state,
        dailyPlans: state.dailyPlans.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  updateAssignment: (assignment: Assignment) => void;
  deleteAssignment: (id: string) => void;
  addExercise: (exercise: Omit<Exercise, 'id'>) => void;
  updateExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  addProgress: (progress: Omit<ProgressRecord, 'id'>) => void;
  deleteProgress: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  getClient: (id: string) => Client | undefined;
  getTodayAppointments: () => Appointment[];
  generateDailyPlan: (date: string) => DailyPlan;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'SET_CLIENTS', payload: loadData<Client>(STORAGE_KEYS.CLIENTS) });
    dispatch({ type: 'SET_APPOINTMENTS', payload: loadData<Appointment>(STORAGE_KEYS.APPOINTMENTS) });
    dispatch({ type: 'SET_ASSIGNMENTS', payload: loadData<Assignment>(STORAGE_KEYS.ASSIGNMENTS) });
    dispatch({ type: 'SET_EXERCISES', payload: loadData<Exercise>(STORAGE_KEYS.EXERCISES) });
    dispatch({ type: 'SET_PROGRESS', payload: loadData<ProgressRecord>(STORAGE_KEYS.PROGRESS) });
    dispatch({ type: 'SET_PRODUCTS', payload: loadData<Product>(STORAGE_KEYS.PRODUCTS) });
    dispatch({ type: 'SET_DAILY_PLANS', payload: loadData<DailyPlan>(STORAGE_KEYS.DAILY_PLANS) });
  }, []);

  useEffect(() => {
    if (state.clients.length > 0) saveData(STORAGE_KEYS.CLIENTS, state.clients);
  }, [state.clients]);

  useEffect(() => {
    if (state.appointments.length > 0) saveData(STORAGE_KEYS.APPOINTMENTS, state.appointments);
  }, [state.appointments]);

  useEffect(() => {
    if (state.assignments.length > 0) saveData(STORAGE_KEYS.ASSIGNMENTS, state.assignments);
  }, [state.assignments]);

  useEffect(() => {
    if (state.exercises.length > 0) saveData(STORAGE_KEYS.EXERCISES, state.exercises);
  }, [state.exercises]);

  useEffect(() => {
    if (state.progress.length > 0) saveData(STORAGE_KEYS.PROGRESS, state.progress);
  }, [state.progress]);

  useEffect(() => {
    if (state.products.length > 0) saveData(STORAGE_KEYS.PRODUCTS, state.products);
  }, [state.products]);

  useEffect(() => {
    if (state.dailyPlans.length > 0) saveData(STORAGE_KEYS.DAILY_PLANS, state.dailyPlans);
  }, [state.dailyPlans]);

  const addClient = (client: Omit<Client, 'id'>) => {
    dispatch({ type: 'ADD_CLIENT', payload: { ...client, id: generateId() } });
  };

  const updateClient = (client: Client) => {
    dispatch({ type: 'UPDATE_CLIENT', payload: client });
  };

  const deleteClient = (id: string) => {
    dispatch({ type: 'DELETE_CLIENT', payload: id });
  };

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    dispatch({ type: 'ADD_APPOINTMENT', payload: { ...appointment, id: generateId() } });
  };

  const updateAppointment = (appointment: Appointment) => {
    dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointment });
  };

  const deleteAppointment = (id: string) => {
    dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
  };

  const addAssignment = (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_ASSIGNMENT',
      payload: { ...assignment, id: generateId(), createdAt: new Date().toISOString() },
    });
  };

  const updateAssignment = (assignment: Assignment) => {
    dispatch({ type: 'UPDATE_ASSIGNMENT', payload: assignment });
  };

  const deleteAssignment = (id: string) => {
    dispatch({ type: 'DELETE_ASSIGNMENT', payload: id });
  };

  const addExercise = (exercise: Omit<Exercise, 'id'>) => {
    dispatch({ type: 'ADD_EXERCISE', payload: { ...exercise, id: generateId() } });
  };

  const updateExercise = (exercise: Exercise) => {
    dispatch({ type: 'UPDATE_EXERCISE', payload: exercise });
  };

  const deleteExercise = (id: string) => {
    dispatch({ type: 'DELETE_EXERCISE', payload: id });
  };

  const addProgress = (progress: Omit<ProgressRecord, 'id'>) => {
    dispatch({ type: 'ADD_PROGRESS', payload: { ...progress, id: generateId() } });
  };

  const deleteProgress = (id: string) => {
    dispatch({ type: 'DELETE_PROGRESS', payload: id });
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    dispatch({ type: 'ADD_PRODUCT', payload: { ...product, id: generateId() } });
  };

  const updateProduct = (product: Product) => {
    dispatch({ type: 'UPDATE_PRODUCT', payload: product });
  };

  const deleteProduct = (id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
  };

  const getClient = (id: string) => state.clients.find((c) => c.id === id);

  const getTodayAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return state.appointments.filter((a) => a.date === today);
  };

  const generateDailyPlan = (date: string): DailyPlan => {
    const dayAppointments = state.appointments.filter((a) => a.date === date);
    const pendingAssignments = state.assignments.filter(
      (a) => a.status !== 'completed' && a.deadline >= date
    );
    const lowStockProducts = state.products.filter((p) => p.quantity <= p.minQuantity);

    const tasks: string[] = [];
    if (pendingAssignments.length > 0) {
      tasks.push(`${pendingAssignments.length} ta topshiriq bajarilishi kerak`);
    }
    if (lowStockProducts.length > 0) {
      tasks.push(`${lowStockProducts.length} ta mahsulot kam qoldi`);
    }

    const existingPlan = state.dailyPlans.find((p) => p.date === date);
    if (existingPlan) return existingPlan;

    const plan: DailyPlan = {
      id: generateId(),
      date,
      appointments: dayAppointments,
      tasks,
      notes: '',
    };

    dispatch({ type: 'ADD_DAILY_PLAN', payload: plan });
    return plan;
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        addClient,
        updateClient,
        deleteClient,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        addExercise,
        updateExercise,
        deleteExercise,
        addProgress,
        deleteProgress,
        addProduct,
        updateProduct,
        deleteProduct,
        getClient,
        getTodayAppointments,
        generateDailyPlan,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
