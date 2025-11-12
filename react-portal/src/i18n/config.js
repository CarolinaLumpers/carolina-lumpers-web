import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../services/storage';
import en from './en.json';
import es from './es.json';
import pt from './pt.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
    lng: storage.getLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
