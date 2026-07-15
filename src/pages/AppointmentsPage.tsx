import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, CheckCircle, Trash2, Users } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { Appointment } from '../types';
import { Modal } from '../components/Modal';

const WEEKDAYS_UZ = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-600 hover:bg-blue-700 text-white',
  completed: 'bg-green-500 hover:bg-green-600 text-white',
  missed: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  cancelled: 'bg-gray-400 hover:bg-gray-500 text-white',
};

const LEGEND = [
  { color: 'bg-blue-600', label: 'Rejalashtirilgan' },
  { color: 'bg-green-500', label: 'Bajarildi' },
  { color: 'bg-yellow-500', label: "O'tkazib yuborildi" },
  { color: 'bg-gray-400', label: 'Bekor qilindi' },
];

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function AppointmentsPage() {
  const { state, addAppointment, updateAppointment, deleteAppointment } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [formData, setFormData] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 30,
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'missed',
    notes: '',
    exercises: [] as string[],
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const todayStr = formatDate(new Date());

  const monthLabel = viewDate.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });

  const changeMonth = (delta: number) => {
    setViewDate(new Date(year, month + delta, 1));
  };

  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const getCellAppointments = (clientId: string, dateStr: string) =>
    state.appointments
      .filter((a) => a.clientId === clientId && a.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));

  const openCreate = (clientId: string, dateStr: string) => {
    setEditingAppointment(null);
    setFormData({
      clientId,
      date: dateStr,
      time: '09:00',
      duration: 30,
      status: 'scheduled',
      notes: '',
      exercises: [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAppointment) {
      updateAppointment({ ...editingAppointment, ...formData });
    } else {
      addAppointment(formData);
    }
    setIsModalOpen(false);
    setEditingAppointment(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      duration: 30,
      status: 'scheduled',
      notes: '',
      exercises: [],
    });
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      clientId: appointment.clientId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      status: appointment.status,
      notes: appointment.notes,
      exercises: appointment.exercises,
    });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (editingAppointment) {
      deleteAppointment(editingAppointment.id);
      setIsModalOpen(false);
      setEditingAppointment(null);
      resetForm();
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Rejalashtirilgan';
      case 'completed': return 'Bajarildi';
      case 'cancelled': return 'Bekor qilindi';
      case 'missed': return "O'tkazib yuborildi";
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Yuqori panel: oy navigatsiyasi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Oldingi oy"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 capitalize min-w-[160px] text-center">
            {monthLabel}
          </h1>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Keyingi oy"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={goToday}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Bugun
          </button>

          <button
            onClick={() => {
              setEditingAppointment(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Yangi qabul
          </button>
        </div>

        {/* Holat belgilari */}
        <div className="flex items-center gap-5 flex-wrap mt-4 pt-3 border-t border-gray-100">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`w-3 h-3 rounded-full ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Kalendar jadvali */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${200 + daysInMonth * 92}px` }}>
            {/* Sarlavha qatori */}
            <div
              className="grid border-b border-gray-200 bg-gray-50"
              style={{ gridTemplateColumns: `200px repeat(${daysInMonth}, minmax(92px, 1fr))` }}
            >
              <div className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-[11px] font-semibold tracking-widest uppercase text-gray-500 border-r border-gray-200 flex items-center">
                Mijozlar
              </div>
              {days.map((d) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = formatDate(d) === todayStr;
                return (
                  <div
                    key={d.getDate()}
                    className={`px-2 py-2 text-center border-r border-gray-100 last:border-r-0 ${
                      isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-100/60' : ''
                    }`}
                  >
                    <p className={`text-xs ${isWeekend ? 'text-red-500' : 'text-gray-400'}`}>
                      {WEEKDAYS_UZ[d.getDay()]}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isToday ? 'text-blue-600' : isWeekend ? 'text-red-500' : 'text-gray-800'
                      }`}
                    >
                      {String(d.getDate()).padStart(2, '0')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Mijoz qatorlari */}
            {state.clients.map((client) => (
              <div
                key={client.id}
                className="grid border-b border-gray-100 last:border-b-0"
                style={{ gridTemplateColumns: `200px repeat(${daysInMonth}, minmax(92px, 1fr))` }}
              >
                <div className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200">
                  <p className="font-bold text-gray-900 text-sm">
                    {client.firstName} {client.lastName}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">{client.phone}</p>
                </div>
                {days.map((d) => {
                  const dateStr = formatDate(d);
                  const cellAppointments = getCellAppointments(client.id, dateStr);
                  const isToday = dateStr === todayStr;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={dateStr}
                      onClick={() => cellAppointments.length === 0 && openCreate(client.id, dateStr)}
                      className={`min-h-[72px] p-1 border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors ${
                        isToday ? 'bg-blue-50/50' : isWeekend ? 'bg-gray-50/60' : ''
                      } hover:bg-blue-50`}
                      title={cellAppointments.length === 0 ? 'Qabul qo\'shish' : undefined}
                    >
                      {cellAppointments.map((appointment) => (
                        <button
                          key={appointment.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(appointment);
                          }}
                          className={`w-full text-left rounded-lg px-2 py-1.5 mb-1 shadow-sm transition-colors ${
                            STATUS_STYLES[appointment.status] || STATUS_STYLES.scheduled
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="shrink-0 opacity-80" />
                            <span className="text-sm font-bold">{appointment.time}</span>
                          </span>
                          <span className="block text-[11px] opacity-90 truncate">
                            {getStatusText(appointment.status)} · {appointment.duration} daq
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {state.clients.length === 0 && (
          <div className="text-center py-16">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              Avval "Mijozlar" sahifasida mijoz qo'shing — qabullar shu jadvalda ko'rinadi
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
          resetForm();
        }}
        title={editingAppointment ? 'Qabulni tahrirlash' : 'Yangi qabul qo\'shish'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz</label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Mijozni tanlang</option>
              {state.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vaqt</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Davomiylik (daqiqa)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holat</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="scheduled">Rejalashtirilgan</option>
                <option value="completed">Bajarildi</option>
                <option value="cancelled">Bekor qilindi</option>
                <option value="missed">O'tkazib yuborildi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eslatmalar</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            {editingAppointment && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                O'chirish
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingAppointment(null);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingAppointment ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
