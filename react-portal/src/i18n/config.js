import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../services/storage';
import en from './en.json';
import es from './es.json';
import pt from './pt.json';

// Initialize language from storage or browser settings
const getInitialLanguage = () => {
  // First check localStorage
  const stored = storage.getLanguage();
  if (stored && ['en', 'es', 'pt'].includes(stored)) {
    return stored;
  }
  
  // Then check browser language
  const browserLang = navigator.language?.split('-')[0] || 'en';
  if (['es', 'pt'].includes(browserLang)) {
    return browserLang;
  }
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    // Enable debug mode to see what's happening
    debug: false,
  });

export default i18n;
