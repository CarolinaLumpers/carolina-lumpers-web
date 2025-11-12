import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white dark:bg-cls-dark flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-anton text-cls-amber mb-4">404</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          {t('errors.notFound')}
        </p>
        <Link
          to="/dashboard"
          className="inline-block bg-cls-amber hover:bg-cls-gold text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          {t('common.back')} to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
