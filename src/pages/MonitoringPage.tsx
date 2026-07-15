import { useState } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export function MonitoringPage() {
  const { state } = useStore();
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const activeClients = state.clients.filter((c) => c.status === 'active');
  const totalAppointments = state.appointments.length;
  const completedAppointments = state.appointments.filter((a) => a.status === 'completed').length;
  const pendingAssignments = state.assignments.filter((a) => a.status !== 'completed').length;
  const lowStockProducts = state.products.filter((p) => p.quantity <= p.minQuantity);

  const selectedClient = selectedClientId ? state.clients.find((c) => c.id === selectedClientId) : null;
  const clientProgress = selectedClientId
    ? state.progress.filter((p) => p.clientId === selectedClientId)
    : [];
  const clientAppointments = selectedClientId
    ? state.appointments.filter((a) => a.clientId === selectedClientId)
    : [];
  const clientAssignments = selectedClientId
    ? state.assignments.filter((a) => a.clientId === selectedClientId)
    : [];

  const averageScore =
    clientProgress.length > 0
      ? Math.round(
          clientProgress.reduce((sum, p) => sum + (p.score / p.maxScore) * 100, 0) /
            clientProgress.length
        )
      : 0;

  const completedRate =
    totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Avtomatik monitoring</h1>
        <p className="text-gray-500">Tizimning umumiy holati va statistikasi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Faol mijozlar</p>
            <p className="text-3xl font-bold text-gray-900">{activeClients.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Users size={20} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Qabul bajarilish</p>
            <p className="text-3xl font-bold text-gray-900">{completedRate}%</p>
          </div>
          <div className="p-2.5 bg-green-50 rounded-xl">
            <Calendar size={20} className="text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Kutilayotgan topshiriqlar</p>
            <p className="text-3xl font-bold text-gray-900">{pendingAssignments}</p>
          </div>
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <BarChart3 size={20} className="text-orange-600" />
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Mijoz bo'yicha monitoring</h2>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
        >
          <option value="">Mijozni tanlang</option>
          {state.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.firstName} {client.lastName}
            </option>
          ))}
        </select>

        {selectedClient && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-700 mb-1">Umumiy ball</p>
                <p className="text-3xl font-bold text-blue-700">{averageScore}%</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-700 mb-1">Qabullar soni</p>
                <p className="text-3xl font-bold text-green-700">{clientAppointments.length}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm text-orange-700 mb-1">Topshiriqlar</p>
                <p className="text-3xl font-bold text-orange-700">{clientAssignments.length}</p>
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3">Progress dinamikasi</h3>
              {clientProgress.length === 0 ? (
                <p className="text-gray-400">Hozircha ma'lumot yo'q</p>
              ) : (
                <div className="space-y-2">
                  {clientProgress.slice(-10).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{record.exerciseType}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString('uz-UZ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-gray-800">
                            {record.score}/{record.maxScore}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.round((record.score / record.maxScore) * 100)}%
                          </p>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(record.score / record.maxScore) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedClient && (
          <div className="text-center py-8">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Mijozni tanlang</p>
          </div>
        )}
      </div>
    </div>
  );
}
