/**
 * API Service Layer
 * Handles all communication with Google Apps Script backend
 */

const API_BASE = 'https://cls-proxy.s-garay.workers.dev';

/**
 * Helper to detect device information
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  let deviceType = 'Unknown';
  if (/iPhone/.test(ua)) deviceType = 'iPhone';
  else if (/iPad/.test(ua)) deviceType = 'iPad';
  else if (/Android/.test(ua)) deviceType = 'Android';
  else if (/Windows/.test(ua)) deviceType = 'Windows';
  else if (/Macintosh|Mac OS X/.test(ua)) deviceType = 'macOS';
  else if (/Linux/.test(ua)) deviceType = 'Linux';
  
  let browserType = 'Unknown Browser';
  if (/Edg\//.test(ua)) browserType = 'Edge';
  else if (/Chrome/.test(ua) && !/Edg/.test(ua)) browserType = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browserType = 'Safari';
  else if (/Firefox/.test(ua)) browserType = 'Firefox';
  else if (/Opera|OPR/.test(ua)) browserType = 'Opera';
  
  return `${deviceType} - ${browserType}`;
}

/**
 * JSONP helper for cross-origin requests (backend expects JSONP callbacks)
 */
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timeout'));
    }, 30000); // 30 second timeout
    
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    
    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
    
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    document.head.appendChild(script);
  });
}

/**
 * API Client
 */
export const api = {
  /**
   * Login user
   */
  login: async (email, password) => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&device=${encodeURIComponent(device)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }
    
    return data;
  },

  /**
   * Sign up new user
   */
  signup: async (email, password) => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=signup&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&device=${encodeURIComponent(device)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Signup failed');
    }
    
    return data;
  },

  /**
   * Get user role
   */
  whoami: async (workerId) => {
    const url = `${API_BASE}?action=whoami&workerId=${encodeURIComponent(workerId)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Clock in/out
   */
  clockIn: async (workerId, lat, lng, lang = 'en', email = '') => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=clockin&workerId=${encodeURIComponent(workerId)}&lat=${lat}&lng=${lng}&lang=${lang}&email=${encodeURIComponent(email)}&device=${encodeURIComponent(device)}`;
    
    try {
      // Use JSONP instead of fetch() - backend expects JSONP callbacks
      const data = await jsonp(url);
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Clock-in failed');
      }
      
      return data;
    } catch (error) {
      console.error('Clock-in error:', error);
      throw error;
    }
  },

  /**
   * Get weekly report
   */
  getReport: async (workerId) => {
    const url = `${API_BASE}?action=report&workerId=${encodeURIComponent(workerId)}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Report fetch error:', error);
      throw error;
    }
  },

  /**
   * Get payroll data
   */
  getPayroll: async (workerId, range = 'week') => {
    const url = `${API_BASE}?action=payroll&workerId=${encodeURIComponent(workerId)}&range=${range}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Get W-9 status
   */
  getW9Status: async (workerId) => {
    const url = `${API_BASE}?action=getW9Status&workerId=${encodeURIComponent(workerId)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Get all reports
   */
  getReportAll: async (workerId, workersCsv = '') => {
    let url = `${API_BASE}?action=reportAll&workerId=${encodeURIComponent(workerId)}`;
    if (workersCsv) {
      url += `&workers=${encodeURIComponent(workersCsv)}`;
    }
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Get time edit requests
   */
  getTimeEditRequests: async (requesterId, status = 'pending') => {
    const url = `${API_BASE}?action=getTimeEditRequests&requesterId=${encodeURIComponent(requesterId)}&status=${status}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Approve time edit
   */
  approveTimeEdit: async (requesterId, requestId) => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=approveTimeEdit&requesterId=${encodeURIComponent(requesterId)}&requestId=${encodeURIComponent(requestId)}&device=${encodeURIComponent(device)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Deny time edit
   */
  denyTimeEdit: async (requesterId, requestId, reason = '') => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=denyTimeEdit&requesterId=${encodeURIComponent(requesterId)}&requestId=${encodeURIComponent(requestId)}&reason=${encodeURIComponent(reason)}&device=${encodeURIComponent(device)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Get pending W-9s
   */
  listPendingW9s: async (requesterId) => {
    const url = `${API_BASE}?action=listPendingW9s&requesterId=${encodeURIComponent(requesterId)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Approve W-9
   */
  approveW9: async (w9RecordId, adminId) => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=approveW9&w9RecordId=${encodeURIComponent(w9RecordId)}&adminId=${encodeURIComponent(adminId)}&device=${encodeURIComponent(device)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Admin: Reject W-9
   */
  rejectW9: async (w9RecordId, adminId, reason) => {
    const device = getDeviceInfo();
    const url = `${API_BASE}?action=rejectW9&w9RecordId=${encodeURIComponent(w9RecordId)}&adminId=${encodeURIComponent(adminId)}&reason=${encodeURIComponent(reason)}&device=${encodeURIComponent(device)}`;
    const response = await fetch(url);
    return response.json();
  },
};

export default api;
