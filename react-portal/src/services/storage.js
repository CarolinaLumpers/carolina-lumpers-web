/**
 * LocalStorage Service
 * Handles all localStorage operations with consistent keys
 */

const STORAGE_KEYS = {
  WORKER_ID: 'CLS_WorkerID',
  WORKER_NAME: 'CLS_WorkerName',
  EMAIL: 'CLS_Email',
  W9_STATUS: 'CLS_W9Status',
  ROLE: 'CLS_Role',
  LANG: 'CLS_Lang',
  REMEMBER_USER: 'CLS_RememberUser',
  THEME: 'CLS_Theme',
};

export const storage = {
  // User session
  setUser: (userData) => {
    localStorage.setItem(STORAGE_KEYS.WORKER_ID, userData.workerId);
    localStorage.setItem(STORAGE_KEYS.WORKER_NAME, userData.displayName);
    localStorage.setItem(STORAGE_KEYS.EMAIL, userData.email);
    localStorage.setItem(STORAGE_KEYS.W9_STATUS, userData.w9Status || 'none');
    localStorage.setItem(STORAGE_KEYS.ROLE, userData.role || 'Worker');
    localStorage.setItem(STORAGE_KEYS.REMEMBER_USER, 'true');
  },

  getUser: () => {
    const workerId = localStorage.getItem(STORAGE_KEYS.WORKER_ID);
    if (!workerId) return null;

    return {
      workerId,
      displayName: localStorage.getItem(STORAGE_KEYS.WORKER_NAME) || workerId,
      email: localStorage.getItem(STORAGE_KEYS.EMAIL) || '',
      w9Status: localStorage.getItem(STORAGE_KEYS.W9_STATUS) || 'none',
      role: localStorage.getItem(STORAGE_KEYS.ROLE) || 'Worker',
    };
  },

  clearUser: () => {
    localStorage.removeItem(STORAGE_KEYS.WORKER_ID);
    localStorage.removeItem(STORAGE_KEYS.WORKER_NAME);
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
    localStorage.removeItem(STORAGE_KEYS.W9_STATUS);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
  },

  updateW9Status: (status) => {
    localStorage.setItem(STORAGE_KEYS.W9_STATUS, status);
  },

  // Language
  getLanguage: () => {
    return localStorage.getItem(STORAGE_KEYS.LANG) || 'en';
  },

  setLanguage: (lang) => {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  },

  // Theme
  getTheme: () => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  },

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },
};

export default storage;
