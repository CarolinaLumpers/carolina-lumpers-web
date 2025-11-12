import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await api.login(email, password);
      login(userData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-cls-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-cls-charcoal rounded-lg shadow-lg p-8 border-t-4 border-cls-amber">
          <h1 className="text-3xl font-anton text-cls-charcoal dark:text-cls-amber mb-6 text-center">
            {t('login.title')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cls-amber focus:border-cls-amber"
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cls-amber focus:border-cls-amber"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cls-amber hover:bg-cls-gold text-cls-charcoal font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.loading') : t('login.submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-700 dark:text-gray-400">
            {t('login.noAccount')}{' '}
            <Link to="/signup" className="text-cls-amber hover:text-cls-gold hover:underline font-medium">
              {t('login.signupLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
