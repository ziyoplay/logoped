import { useState } from 'react';
import { Plus, Edit2, Trash2, Dumbbell, Clock, BarChart } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { Exercise } from '../types';
import { Modal } from '../components/Modal';

export function ExercisesPage() {
  const { state, addExercise, updateExercise, deleteExercise } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Artikulyatsiya',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 10,
    instructions: [''] as string[],
  });

  const categories = [...new Set(state.exercises.map((e) => e.category))];

  const filteredExercises = state.exercises.filter(
    (e) => filterCategory === 'all' || e.category === filterCategory
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredInstructions = formData.instructions.filter((i) => i.trim() !== '');
    if (editingExercise) {
      updateExercise({ ...editingExercise, ...formData, instructions: filteredInstructions });
    } else {
      addExercise({ ...formData, instructions: filteredInstructions });
    }
    setIsModalOpen(false);
    setEditingExercise(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Artikulyatsiya',
      description: '',
      difficulty: 'medium',
      duration: 10,
      instructions: [''],
    });
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      category: exercise.category,
      description: exercise.description,
      difficulty: exercise.difficulty,
      duration: exercise.duration,
      instructions: exercise.instructions.length > 0 ? exercise.instructions : [''],
    });
    setIsModalOpen(true);
  };

  const addInstruction = () => {
    setFormData({ ...formData, instructions: [...formData.instructions, ''] });
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const removeInstruction = (index: number) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index),
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Oson';
      case 'medium': return 'O\'rta';
      case 'hard': return 'Qiyin';
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mashq turlari</h1>
          <p className="text-gray-500">{state.exercises.length} ta mashq</p>
        </div>
        <button
          onClick={() => {
            setEditingExercise(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yangi mashq
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Barchasi
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilterCategory(category)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Dumbbell size={18} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800">{exercise.name}</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(exercise)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => deleteExercise(exercise.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>

            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {exercise.category}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                {getDifficultyText(exercise.difficulty)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{exercise.duration} daq</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart size={14} />
                <span>{exercise.instructions.length} qadam</span>
              </div>
            </div>

            {exercise.instructions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Qo'llanma:</p>
                <ol className="text-xs text-gray-600 space-y-1">
                  {exercise.instructions.slice(0, 3).map((instruction, idx) => (
                    <li key={idx}>
                      {idx + 1}. {instruction}
                    </li>
                  ))}
                  {exercise.instructions.length > 3 && (
                    <li className="text-gray-400">+{exercise.instructions.length - 3} qadam...</li>
                  )}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {filterCategory !== 'all'
              ? 'Bu kategoriyada mashqlar yo\'q'
              : "Hozircha mashqlar yo'q"}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExercise(null);
          resetForm();
        }}
        title={editingExercise ? 'Mashqni tahrirlash' : 'Yangi mashq qo\'shish'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masalan: Artikulyatsiya"
              />
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qiyinchilik</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Oson</option>
                <option value="medium">O'rta</option>
                <option value="hard">Qiyin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Davomiylik (daqiqa)</label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Qo'llanma qadamlari</label>
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`${index + 1}-qadam`}
                />
                {formData.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addInstruction}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Qadam qo'shish
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingExercise(null);
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
              {editingExercise ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
