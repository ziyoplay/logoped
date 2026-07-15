import { useState } from 'react';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

const VALID_LOGIN = 'Iroda';
const VALID_PASSWORD = 'Iroda';

export function LoginPage({ onLogin }: LoginPageProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login.trim() === VALID_LOGIN && password === VALID_PASSWORD) {
      setError('');
      onLogin();
    } else {
      setError("Login yoki parol noto'g'ri");
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logotip */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Stethoscope size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Logoped</h1>
          <p className="text-sm text-gray-400 mt-1">Klinik boshqaruv tizimi</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tizimga kirish</h2>
          <p className="text-sm text-gray-500 mb-6">Login va parolingizni kiriting</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
              <input
                type="text"
                required
                autoFocus
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kirish
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          {new Date().getFullYear()} · Logoped klinik boshqaruv tizimi
        </p>
      </div>
    </div>
  );
}
