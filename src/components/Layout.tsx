import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Calendar,
  Users,
  Clock,
  FileText,
  BarChart3,
  Dumbbell,
  TrendingUp,
  Package,
  PieChart,
  Menu,
  X,
  Bell,
  Stethoscope,
} from 'lucide-react';
import type { Page } from '../types';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

interface NavItem {
  id: Page;
  label: string;
  icon: ReactNode;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Asosiy',
    items: [
      { id: 'daily-plan', label: 'Kunlik reja', icon: <Calendar size={19} /> },
      { id: 'clients', label: 'Mijozlar', icon: <Users size={19} /> },
    ],
  },
  {
    title: 'Operatsiyalar',
    items: [
      { id: 'appointments', label: 'Qabul qilish', icon: <Clock size={19} /> },
      { id: 'assignments', label: 'Topshiriqlar', icon: <FileText size={19} /> },
      { id: 'exercises', label: 'Mashq turlari', icon: <Dumbbell size={19} /> },
      { id: 'monitoring', label: 'Avto nazorat', icon: <BarChart3 size={19} /> },
    ],
  },
  {
    title: 'Natijalar',
    items: [
      { id: 'progress', label: 'Before / After', icon: <TrendingUp size={19} /> },
      { id: 'products', label: 'Tovarlar', icon: <Package size={19} /> },
      { id: 'reports', label: 'Hisobot', icon: <PieChart size={19} /> },
    ],
  },
];

const pageTitles: Record<Page, string> = {
  'daily-plan': 'Kunlik reja',
  clients: 'Mijozlar',
  appointments: 'Qabul qilish',
  assignments: 'Topshiriqlar',
  monitoring: 'Avto nazorat',
  exercises: 'Mashq turlari',
  progress: 'Before / After',
  products: 'Tovarlar',
  reports: 'Hisobot',
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-navy-900 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logotip */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Stethoscope size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">Logoped</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1.5 lg:hidden hover:bg-white/10 rounded-lg text-gray-300"
            aria-label="Menyuni yopish"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigatsiya */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="px-5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-500">
                {group.title}
              </p>
              {group.items.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'text-white bg-white/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                    )}
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        active ? 'bg-white/10 text-blue-400' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profil */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
            LG
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Logoped</p>
            <p className="text-xs text-gray-500">admin</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Yuqori panel */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            aria-label="Menyuni ochish"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{pageTitles[currentPage]}</h1>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden md:block text-sm text-gray-500 capitalize">
              {new Date().toLocaleDateString('uz-UZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              aria-label="Bildirishnomalar"
            >
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                LG
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">Logoped</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
