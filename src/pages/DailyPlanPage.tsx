import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export function DailyPlanPage() {
  const { state, generateDailyPlan, getClient, updateAppointment } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const existingPlan = state.dailyPlans.find((p) => p.date === selectedDate);
    if (!existingPlan) {
      generateDailyPlan(selectedDate);
    }
  }, [selectedDate, state.dailyPlans]);

  const todayAppointments = state.appointments.filter((a) => a.date === selectedDate);
  const pendingAssignments = state.assignments.filter(
    (a) => a.status !== 'completed' && a.deadline >= selectedDate
  );
  const lowStockProducts = state.products.filter((p) => p.quantity <= p.minQuantity);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'missed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kunlik Reja</h1>
          <p className="text-gray-500">Bugungi kun rejalari va vazifalari</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-1.5">
          <Calendar size={18} className="text-blue-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="py-1 border-0 focus:ring-0 focus:outline-none text-sm font-medium text-gray-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Qabullar</p>
            <p className="text-3xl font-bold text-gray-900">{todayAppointments.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Clock size={20} className="text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Topshiriqlar</p>
            <p className="text-3xl font-bold text-gray-900">{pendingAssignments.length}</p>
          </div>
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <FileText size={20} className="text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Kam qolgan tovarlar</p>
            <p className="text-3xl font-bold text-gray-900">{lowStockProducts.length}</p>
          </div>
          <div className="p-2.5 bg-red-50 rounded-xl">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Bugungi qabullar</h2>
          </div>
          <div className="p-4">
            {todayAppointments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Bugun qabul yo'q</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((appointment) => {
                    const client = getClient(appointment.clientId);
                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between flex-wrap gap-2 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{appointment.time}</p>
                            <p className="text-xs text-gray-400">{appointment.duration} daq</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {client ? `${client.firstName} ${client.lastName}` : 'Noma\'lum'}
                            </p>
                            <p className="text-sm text-gray-500">{appointment.notes || 'Eslatma yo\'q'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </span>
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => updateAppointment({ ...appointment, status: 'completed' })}
                              className="p-1 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Bajarildi"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Vazifalar</h2>
          </div>
          <div className="p-4">
            {pendingAssignments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Pending vazifalar yo'q</p>
            ) : (
              <div className="space-y-3">
                {pendingAssignments.map((assignment) => {
                  const client = getClient(assignment.clientId);
                  return (
                    <div
                      key={assignment.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-medium text-gray-800">{assignment.title}</p>
                          <p className="text-sm text-gray-500">
                            {client ? `${client.firstName} ${client.lastName}` : 'Noma\'lum'} • {assignment.exerciseType}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          Muddat: {new Date(assignment.deadline).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Diqqat! Kam qolgan tovarlar</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="font-medium text-red-800">{product.name}</p>
                  <p className="text-sm text-red-600">
                    Qoldiq: {product.quantity} {product.unit} (min: {product.minQuantity})
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
