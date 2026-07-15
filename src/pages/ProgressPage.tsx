import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { ProgressRecord } from '../types';
import { Modal } from '../components/Modal';

export function ProgressPage() {
  const { state, addProgress, deleteProgress, getClient } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [formData, setFormData] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    exerciseType: '',
    score: 0,
    maxScore: 10,
    notes: '',
    period: 'before' as 'before' | 'after',
  });

  const filteredProgress = selectedClientId
    ? state.progress.filter((p) => p.clientId === selectedClientId)
    : state.progress;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProgress(formData);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      clientId: selectedClientId || '',
      date: new Date().toISOString().split('T')[0],
      exerciseType: '',
      score: 0,
      maxScore: 10,
      notes: '',
      period: 'before',
    });
  };

  const groupedProgress = filteredProgress.reduce((acc, record) => {
    if (!acc[record.clientId]) {
      acc[record.clientId] = [];
    }
    acc[record.clientId].push(record);
    return acc;
  }, {} as Record<string, ProgressRecord[]>);

  const getProgressTrend = (records: ProgressRecord[]) => {
    if (records.length < 2) return 'stable';
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const lastScore = sorted[sorted.length - 1].score / sorted[sorted.length - 1].maxScore;
    const prevScore = sorted[sorted.length - 2].score / sorted[sorted.length - 2].maxScore;
    if (lastScore > prevScore) return 'up';
    if (lastScore < prevScore) return 'down';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={20} className="text-green-600" />;
      case 'down':
        return <TrendingDown size={20} className="text-red-600" />;
      default:
        return <Minus size={20} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oldingi va keyingi holat</h1>
          <p className="text-gray-500">Mijozlarning rivojlanishini kuzatish</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yangi yozuv
        </button>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-700"
        >
          <option value="">Barcha mijozlar</option>
          {state.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.firstName} {client.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedProgress).map(([clientId, records]) => {
          const client = getClient(clientId);
          const trend = getProgressTrend(records);
          const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
          const beforeRecords = sortedRecords.filter((r) => r.period === 'before');
          const afterRecords = sortedRecords.filter((r) => r.period === 'after');

          return (
            <div
              key={clientId}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {client ? `${client.firstName} ${client.lastName}` : 'Noma\'lum mijoz'}
                  </h2>
                  <p className="text-sm text-gray-500">{records.length} ta yozuv</p>
                </div>
                {getTrendIcon(trend)}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                    Oldingi holat (Before)
                  </h3>
                  {beforeRecords.length === 0 ? (
                    <p className="text-gray-400 text-sm">Ma'lumot yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {beforeRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{record.exerciseType}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">
                              {record.score}/{record.maxScore}
                            </span>
                            <button
                              onClick={() => deleteProgress(record.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                    Keyingi holat (After)
                  </h3>
                  {afterRecords.length === 0 ? (
                    <p className="text-gray-400 text-sm">Ma'lumot yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {afterRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{record.exerciseType}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">
                              {record.score}/{record.maxScore}
                            </span>
                            <button
                              onClick={() => deleteProgress(record.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {beforeRecords.length > 0 && afterRecords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">O'zgarishlar:</h4>
                  <div className="space-y-2">
                    {[...new Set(records.map((r) => r.exerciseType))].map((exerciseType) => {
                      const before = beforeRecords.filter((r) => r.exerciseType === exerciseType);
                      const after = afterRecords.filter((r) => r.exerciseType === exerciseType);
                      const beforeAvg =
                        before.length > 0
                          ? before.reduce((sum, r) => sum + r.score / r.maxScore, 0) / before.length
                          : 0;
                      const afterAvg =
                        after.length > 0
                          ? after.reduce((sum, r) => sum + r.score / r.maxScore, 0) / after.length
                          : 0;
                      const change = afterAvg - beforeAvg;

                      return (
                        <div
                          key={exerciseType}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-700">{exerciseType}</span>
                          <span
                            className={`text-sm font-medium ${
                              change > 0
                                ? 'text-green-600'
                                : change < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {change > 0 ? '+' : ''}
                            {Math.round(change * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(groupedProgress).length === 0 && (
        <div className="text-center py-12">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {selectedClientId
              ? "Bu mijoz uchun ma'lumot yo'q"
              : "Hozircha progress ma'lumotlari yo'q"}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Yangi progress yozuvi"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Holat</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="before">Oldingi (Before)</option>
                <option value="after">Keyingi (After)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mashq turi</label>
            <input
              type="text"
              required
              value={formData.exerciseType}
              onChange={(e) => setFormData({ ...formData, exerciseType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masalan: Artikulyatsiya"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ball</label>
              <input
                type="number"
                min="0"
                required
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal ball</label>
              <input
                type="number"
                min="1"
                required
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
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
              Qo'shish
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
