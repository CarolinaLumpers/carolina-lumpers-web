import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';

// Color theme options
const COLOR_THEMES = {
  current: {
    name: 'Current (Amber Dominant)',
    pageBackground: 'bg-white dark:bg-cls-dark',
    cardBackground: 'bg-white dark:bg-cls-charcoal',
    cardBorder: 'border-t-4 border-cls-amber',
    titleColor: 'text-cls-amber',
    labelColor: 'text-gray-700 dark:text-gray-300',
    inputBg: 'bg-white dark:bg-gray-800',
    inputBorder: 'border-gray-300 dark:border-gray-600',
    inputFocus: 'focus:ring-2 focus:ring-cls-amber focus:border-cls-amber',
    buttonBg: 'bg-cls-amber hover:bg-cls-gold',
    buttonText: 'text-white',
    linkColor: 'text-cls-amber hover:text-cls-gold',
    footerText: 'text-gray-600 dark:text-gray-400',
  },
  subtle: {
    name: 'Subtle Amber (Professional)',
    pageBackground: 'bg-gray-50 dark:bg-cls-dark',
    cardBackground: 'bg-white dark:bg-cls-charcoal',
    cardBorder: 'border-t-4 border-cls-amber',
    titleColor: 'text-cls-charcoal dark:text-cls-amber',
    labelColor: 'text-gray-900 dark:text-gray-300',
    inputBg: 'bg-gray-50 dark:bg-gray-800',
    inputBorder: 'border-gray-300 dark:border-gray-600',
    inputFocus: 'focus:ring-2 focus:ring-cls-amber focus:border-cls-amber',
    buttonBg: 'bg-cls-amber hover:bg-cls-gold',
    buttonText: 'text-cls-charcoal',
    linkColor: 'text-cls-amber hover:text-cls-gold',
    footerText: 'text-gray-700 dark:text-gray-400',
  },
  minimal: {
    name: 'Minimal (Clean)',
    pageBackground: 'bg-gray-50 dark:bg-cls-dark',
    cardBackground: 'bg-white dark:bg-cls-charcoal',
    cardBorder: 'border border-gray-200 dark:border-gray-700',
    titleColor: 'text-cls-charcoal dark:text-cls-amber',
    labelColor: 'text-gray-900 dark:text-gray-300',
    inputBg: 'bg-white dark:bg-gray-800',
    inputBorder: 'border-gray-300 dark:border-gray-600',
    inputFocus: 'focus:ring-2 focus:ring-cls-amber focus:border-cls-amber',
    buttonBg: 'bg-transparent hover:bg-cls-amber border-2 border-cls-amber',
    buttonText: 'text-cls-amber hover:text-cls-charcoal',
    linkColor: 'text-cls-amber hover:text-cls-gold hover:underline',
    footerText: 'text-gray-700 dark:text-gray-400',
  },
  bold: {
    name: 'Bold (High Contrast)',
    pageBackground: 'bg-cls-charcoal dark:bg-cls-dark',
    cardBackground: 'bg-white dark:bg-gray-800',
    cardBorder: 'border-t-4 border-cls-amber',
    titleColor: 'text-cls-amber',
    labelColor: 'text-gray-900 dark:text-gray-300',
    inputBg: 'bg-gray-50 dark:bg-gray-900',
    inputBorder: 'border-gray-300 dark:border-gray-700',
    inputFocus: 'focus:ring-2 focus:ring-cls-amber focus:border-cls-amber',
    buttonBg: 'bg-cls-amber hover:bg-cls-gold',
    buttonText: 'text-cls-charcoal',
    linkColor: 'text-cls-amber hover:text-cls-gold',
    footerText: 'text-gray-700 dark:text-gray-400',
  },
};

function LoginColorDemo() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('current');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const colors = COLOR_THEMES[theme];

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
    <div className={`min-h-screen ${colors.pageBackground} flex items-center justify-center p-4`}>
      {/* Theme Selector - Fixed at top */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color Theme Demo
          </label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {Object.entries(COLOR_THEMES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className={`${colors.cardBackground} rounded-lg shadow-lg p-8 ${colors.cardBorder}`}>
          <h1 className={`text-3xl font-anton ${colors.titleColor} mb-6 text-center`}>
            {t('login.title')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-3 py-2 border ${colors.inputBorder} rounded-lg ${colors.inputBg} text-gray-900 dark:text-gray-100 ${colors.inputFocus}`}
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-3 py-2 border ${colors.inputBorder} rounded-lg ${colors.inputBg} text-gray-900 dark:text-gray-100 ${colors.inputFocus}`}
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
              className={`w-full ${colors.buttonBg} ${colors.buttonText} font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? t('login.loading') : t('login.submit')}
            </button>
          </form>

          <p className={`mt-6 text-center ${colors.footerText}`}>
            {t('login.noAccount')}{' '}
            <Link to="/signup" className={`${colors.linkColor} font-medium`}>
              {t('login.signupLink')}
            </Link>
          </p>
        </div>

        {/* Color Info Panel */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">
            Current Theme: {colors.name}
          </h3>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-cls-amber rounded"></span>
              <span>Amber (#FFBF00)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-cls-gold rounded"></span>
              <span>Gold (#E8A317)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-cls-charcoal rounded"></span>
              <span>Charcoal (#1a1a1a)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginColorDemo;
