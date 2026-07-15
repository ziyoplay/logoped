import { useState } from 'react';
import { Plus, Edit2, Trash2, Package, AlertTriangle, Search } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { Product } from '../types';
import { Modal } from '../components/Modal';

export function ProductsPage() {
  const { state, addProduct, updateProduct, deleteProduct } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Terapevtik',
    quantity: 0,
    unit: 'dona',
    price: 0,
    minQuantity: 5,
    supplier: '',
  });

  const categories = [...new Set(state.products.map((p) => p.category))];

  const filteredProducts = state.products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesLowStock = !showLowStock || p.quantity <= p.minQuantity;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({ ...editingProduct, ...formData });
    } else {
      addProduct(formData);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Terapevtik',
      quantity: 0,
      unit: 'dona',
      price: 0,
      minQuantity: 5,
      supplier: '',
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      minQuantity: product.minQuantity,
      supplier: product.supplier,
    });
    setIsModalOpen(true);
  };

  const lowStockProducts = state.products.filter((p) => p.quantity <= p.minQuantity);
  const totalValue = state.products.reduce((sum, p) => sum + p.quantity * p.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tovarlar</h1>
          <p className="text-gray-500">{state.products.length} ta mahsulot</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yangi mahsulot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Jami mahsulotlar</p>
            <p className="text-3xl font-bold text-gray-900">{state.products.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Package size={20} className="text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Umumiy qiymat</p>
            <p className="text-3xl font-bold text-gray-900">{totalValue.toLocaleString('uz-UZ')} so'm</p>
          </div>
          <div className="p-2.5 bg-green-50 rounded-xl">
            <Package size={20} className="text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-2">Kam qolgan</p>
            <p className="text-3xl font-bold text-gray-900">{lowStockProducts.length}</p>
          </div>
          <div className="p-2.5 bg-red-50 rounded-xl">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Mahsulot qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLowStock(!showLowStock)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            showLowStock
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Kam qolganlar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nomi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kategoriya</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Miqdori</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Narxi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Yetkazib beruvchi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className={`hover:bg-gray-50 ${
                  product.quantity <= product.minQuantity ? 'bg-red-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-800">{product.name}</span>
                    {product.quantity <= product.minQuantity && (
                      <AlertTriangle size={14} className="text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {product.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${product.quantity <= product.minQuantity ? 'text-red-600' : 'text-gray-800'}`}>
                    {product.quantity} {product.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {product.price.toLocaleString('uz-UZ')} so'm
                </td>
                <td className="px-4 py-3 text-gray-600">{product.supplier || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {searchTerm || filterCategory !== 'all' || showLowStock
              ? 'Mahsulot topilmadi'
              : "Hozircha mahsulotlar yo'q"}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          resetForm();
        }}
        title={editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masalan: Terapevtik"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birlik</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="dona">Dona</option>
                <option value="dasta">Dasta</option>
                <option value="quti">Quti</option>
                <option value="litr">Litr</option>
                <option value="kg">Kg</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miqdori</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimal miqdori</label>
              <input
                type="number"
                min="0"
                required
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narxi (so'm)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yetkazib beruvchi</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
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
              {editingProduct ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
