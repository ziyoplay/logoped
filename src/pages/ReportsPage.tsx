import { useState } from 'react';
import { Download, Calendar, Users, BarChart3, Package } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export function ReportsPage() {
  const { state } = useStore();
  const [reportType, setReportType] = useState<string>('clients');
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const filteredAppointments = state.appointments.filter(
    (a) => a.date >= dateFrom && a.date <= dateTo
  );

  const filteredProgress = state.progress.filter(
    (p) => p.date >= dateFrom && p.date <= dateTo
  );

  const totalAppointments = filteredAppointments.length;
  const completedAppointments = filteredAppointments.filter((a) => a.status === 'completed').length;
  const missedAppointments = filteredAppointments.filter((a) => a.status === 'missed').length;
  const cancelledAppointments = filteredAppointments.filter((a) => a.status === 'cancelled').length;

  const averageScore =
    filteredProgress.length > 0
      ? Math.round(
          filteredProgress.reduce((sum, p) => sum + (p.score / p.maxScore) * 100, 0) /
            filteredProgress.length
        )
      : 0;

  const clientStats = state.clients.map((client) => {
    const clientAppts = filteredAppointments.filter((a) => a.clientId === client.id);
    const clientProgress = filteredProgress.filter((p) => p.clientId === client.id);
    const avgScore =
      clientProgress.length > 0
        ? Math.round(
            clientProgress.reduce((sum, p) => sum + (p.score / p.maxScore) * 100, 0) /
              clientProgress.length
          )
        : 0;

    return {
      client,
      appointments: clientAppts.length,
      completed: clientAppts.filter((a) => a.status === 'completed').length,
      progress: clientProgress.length,
      avgScore,
    };
  });

  const categoryStats = state.exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = { count: 0, difficulty: { easy: 0, medium: 0, hard: 0 } };
    }
    acc[exercise.category].count++;
    acc[exercise.category].difficulty[exercise.difficulty]++;
    return acc;
  }, {} as Record<string, { count: number; difficulty: { easy: number; medium: number; hard: number } }>);

  const generateReport = () => {
    let report = `LOGOPED ILOVASI — HISOBOT\n`;
    report += `Sana: ${new Date().toLocaleDateString('uz-UZ')}\n`;
    report += `Davr: ${dateFrom} dan ${dateTo} gacha\n`;
    report += `${'='.repeat(50)}\n\n`;

    if (reportType === 'clients' || reportType === 'all') {
      report += `MIJOZLAR HISOBOTI\n`;
      report += `${'-'.repeat(30)}\n`;
      report += `Jami mijozlar: ${state.clients.length}\n`;
      report += `Faol: ${state.clients.filter((c) => c.status === 'active').length}\n`;
      report += `Nofaol: ${state.clients.filter((c) => c.status === 'inactive').length}\n`;
      report += `Tugallangan: ${state.clients.filter((c) => c.status === 'completed').length}\n\n`;

      clientStats.forEach((stat) => {
        report += `• ${stat.client.firstName} ${stat.client.lastName}\n`;
        report += `  Qabullar: ${stat.appointments} (bajarilgan: ${stat.completed})\n`;
        report += `  Progress yozuvlari: ${stat.progress}\n`;
        report += `  O'rtacha ball: ${stat.avgScore}%\n\n`;
      });
    }

    if (reportType === 'appointments' || reportType === 'all') {
      report += `QABULLAR HISOBOTI\n`;
      report += `${'-'.repeat(30)}\n`;
      report += `Jami qabullar: ${totalAppointments}\n`;
      report += `Bajarilgan: ${completedAppointments} (${totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0}%)\n`;
      report += `O'tkazib yuborilgan: ${missedAppointments}\n`;
      report += `Bekor qilingan: ${cancelledAppointments}\n\n`;
    }

    if (reportType === 'progress' || reportType === 'all') {
      report += `PROGRESS HISOBOTI\n`;
      report += `${'-'.repeat(30)}\n`;
      report += `Jami yozuvlar: ${filteredProgress.length}\n`;
      report += `O'rtacha ball: ${averageScore}%\n\n`;
    }

    if (reportType === 'products' || reportType === 'all') {
      report += `TOVARLAR HISOBOTI\n`;
      report += `${'-'.repeat(30)}\n`;
      report += `Jami mahsulotlar: ${state.products.length}\n`;
      const totalValue = state.products.reduce((sum, p) => sum + p.quantity * p.price, 0);
      report += `Umumiy qiymat: ${totalValue.toLocaleString('uz-UZ')} so'm\n`;
      const lowStock = state.products.filter((p) => p.quantity <= p.minQuantity);
      report += `Kam qolgan: ${lowStock.length}\n\n`;
      lowStock.forEach((p) => {
        report += `  ⚠ ${p.name}: ${p.quantity} ${p.unit} (min: ${p.minQuantity})\n`;
      });
    }

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisobot_${dateFrom}_${dateTo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hisobot</h1>
          <p className="text-gray-500">Tizim bo'yicha batafsil hisobotlar</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={20} />
          Hisobotni yuklab olish
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hisobot turi</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Barchasi</option>
            <option value="clients">Mijozlar</option>
            <option value="appointments">Qabullar</option>
            <option value="progress">Progress</option>
            <option value="products">Tovarlar</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dan</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gacha</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Jami mijozlar</p>
            <p className="text-3xl font-bold text-gray-900">{state.clients.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Users size={20} className="text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Davr ichida qabullar</p>
            <p className="text-3xl font-bold text-gray-900">{totalAppointments}</p>
          </div>
          <div className="p-2.5 bg-green-50 rounded-xl">
            <Calendar size={20} className="text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">O'rtacha ball</p>
            <p className="text-3xl font-bold text-gray-900">{averageScore}%</p>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <BarChart3 size={20} className="text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Mahsulotlar</p>
            <p className="text-3xl font-bold text-gray-900">{state.products.length}</p>
          </div>
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Package size={20} className="text-orange-600" />
          </div>
        </div>
      </div>

      {(reportType === 'clients' || reportType === 'all') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Mijozlar bo'yicha hisobot</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Mijoz</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Holat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Qabullar</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Bajarilgan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Progress</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">O'rtacha ball</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientStats.map((stat) => (
                  <tr key={stat.client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {stat.client.firstName} {stat.client.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          stat.client.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : stat.client.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {stat.client.status === 'active'
                          ? 'Faol'
                          : stat.client.status === 'completed'
                          ? 'Tugallangan'
                          : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{stat.appointments}</td>
                    <td className="px-4 py-3 text-gray-600">{stat.completed}</td>
                    <td className="px-4 py-3 text-gray-600">{stat.progress}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${stat.avgScore}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{stat.avgScore}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(reportType === 'appointments' || reportType === 'all') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Qabullar statistikasi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{totalAppointments}</p>
              <p className="text-sm text-gray-600">Jami</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{completedAppointments}</p>
              <p className="text-sm text-gray-600">Bajarilgan</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{missedAppointments}</p>
              <p className="text-sm text-gray-600">O'tkazib yuborilgan</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{cancelledAppointments}</p>
              <p className="text-sm text-gray-600">Bekor qilingan</p>
            </div>
          </div>
        </div>
      )}

      {(reportType === 'progress' || reportType === 'all') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Progress statistikasi</h2>
          {filteredProgress.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Bu davrda progress yo'q</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                filteredProgress.reduce((acc, p) => {
                  if (!acc[p.exerciseType]) acc[p.exerciseType] = [];
                  acc[p.exerciseType].push(p);
                  return acc;
                }, {} as Record<string, typeof filteredProgress>)
              ).map(([exerciseType, records]) => {
                const avg = Math.round(
                  records.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / records.length
                );
                return (
                  <div key={exerciseType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-800">{exerciseType}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{records.length} yozuv</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${avg}%` }} />
                      </div>
                      <span className="font-bold text-gray-800 w-12 text-right">{avg}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(reportType === 'products' || reportType === 'all') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tovarlar hisoboti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Kategoriyalar bo'yicha</p>
              {Object.entries(categoryStats).map(([category, stats]) => (
                <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2">
                  <span className="text-gray-700">{category}</span>
                  <span className="text-sm text-gray-500">{stats.count} ta</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Umumiy qiymat</p>
              <p className="text-3xl font-bold text-gray-800">
                {state.products
                  .reduce((sum, p) => sum + p.quantity * p.price, 0)
                  .toLocaleString('uz-UZ')}{' '}
                so'm
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
