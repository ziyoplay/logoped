import { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { Assignment } from '../types';
import { Modal } from '../components/Modal';

export function AssignmentsPage() {
  const { state, addAssignment, updateAssignment, deleteAssignment, getClient } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    description: '',
    exerciseType: '',
    frequency: 'Kuniga 1 marta',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
  });

  const filteredAssignments = state.assignments.filter(
    (a) => filterStatus === 'all' || a.status === filterStatus
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAssignment) {
      updateAssignment({ ...editingAssignment, ...formData });
    } else {
      addAssignment(formData);
    }
    setIsModalOpen(false);
    setEditingAssignment(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      title: '',
      description: '',
      exerciseType: '',
      frequency: 'Kuniga 1 marta',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    });
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      clientId: assignment.clientId,
      title: assignment.title,
      description: assignment.description,
      exerciseType: assignment.exerciseType,
      frequency: assignment.frequency,
      deadline: assignment.deadline,
      status: assignment.status,
    });
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Kutilmoqda';
      case 'in_progress': return 'Bajarilmoqda';
      case 'completed': return 'Bajarildi';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle size={16} className="text-yellow-600" />;
      case 'in_progress': return <Clock size={16} className="text-blue-600" />;
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mijozga Topshiriqlar</h1>
          <p className="text-gray-500">{state.assignments.length} ta topshiriq</p>
        </div>
        <button
          onClick={() => {
            setEditingAssignment(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yangi topshiriq
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Barchasi' },
          { value: 'pending', label: 'Kutilmoqda' },
          { value: 'in_progress', label: 'Bajarilmoqda' },
          { value: 'completed', label: 'Bajarildi' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredAssignments.map((assignment) => {
          const client = getClient(assignment.clientId);
          return (
            <div
              key={assignment.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(assignment.status)}
                  <div>
                    <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
                    <p className="text-sm text-gray-500">
                      {client ? `${client.firstName} ${client.lastName}` : 'Noma\'lum mijoz'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{assignment.exerciseType}</span>
                      <span>{assignment.frequency}</span>
                      <span>Muddat: {new Date(assignment.deadline).toLocaleDateString('uz-UZ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                    {getStatusText(assignment.status)}
                  </span>

                  {assignment.status !== 'completed' && (
                    <>
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() =>
                            updateAssignment({ ...assignment, status: 'in_progress' })
                          }
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Bajarilmoqda"
                        >
                          <Clock size={18} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          updateAssignment({ ...assignment, status: 'completed' })
                        }
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Bajarildi"
                      >
                        <CheckCircle size={18} />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleEdit(assignment)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteAssignment(assignment.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {filterStatus !== 'all'
              ? 'Bu holatda topshiriqlar yo\'q'
              : "Hozircha topshiriqlar yo'q"}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAssignment(null);
          resetForm();
        }}
        title={editingAssignment ? 'Topshiriqni tahrirlash' : 'Yangi topshiriq qo\'shish'}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sarlavha</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masalan: Artikulyatsiya mashqlari"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mashq turi</label>
              <input
                type="text"
                value={formData.exerciseType}
                onChange={(e) => setFormData({ ...formData, exerciseType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masalan: Artikulyatsiya"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chastotasi</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Kuniga 1 marta">Kuniga 1 marta</option>
                <option value="Kuniga 2 marta">Kuniga 2 marta</option>
                <option value="Kuniga 3 marta">Kuniga 3 marta</option>
                <option value="Haftada 1 marta">Haftada 1 marta</option>
                <option value="Haftada 2 marta">Haftada 2 marta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Muddat</label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                <option value="pending">Kutilmoqda</option>
                <option value="in_progress">Bajarilmoqda</option>
                <option value="completed">Bajarildi</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingAssignment(null);
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
              {editingAssignment ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FileText({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}
