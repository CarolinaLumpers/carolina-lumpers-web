import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import { api } from '../services/api';
import { storage } from '../services/storage';
import Button from './Button';

const ClockInButton = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(''); // 'gps' | 'recording'
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent race conditions

  const handleClockIn = async () => {
    // Prevent concurrent clock-in attempts
    if (isProcessing || loading) {
      console.log('⚠️ Clock-in already in progress, ignoring duplicate click...');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLoading(true);
    setLoadingStage('gps');

    try {
      // Get user's current position
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error(t('errors.geolocationNotSupported', 'Geolocation is not supported by your browser')));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => {
            console.error('Geolocation error:', err);
            reject(new Error(t('errors.geolocationDenied', 'Location access denied. Please enable location services.')));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      const { latitude, longitude } = position.coords;
      const lang = storage.getLanguage() || 'en';
      
      // Update loading stage
      setLoadingStage('recording');
      
      // Call clock-in API
      const result = await api.clockIn(
        user.workerId,
        latitude,
        longitude,
        lang,
        user.email
      );

      if (result.success) {
        // Success! Trigger refresh of clock-in history
        if (onSuccess) onSuccess();
      } else {
        // Handle error response from backend
        let errorMsg = result.error || result.message || t('errors.timeInFailed', 'Time in failed. Please try again.');
        
        // Check if it's the backend distance calculation error
        if (errorMsg.includes('toFixed') || errorMsg.includes('undefined')) {
          errorMsg = '⚠️ Backend error detected. This location may be too far from a job site. Please contact your supervisor if this persists.';
        }
        
        console.error('Clock-in failed:', result);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Clock-in error:', err);
      let errorMsg = err.message || t('errors.timeInFailed', 'Time in failed. Please try again.');
      
      // Extract more specific error info if available
      if (err.error) {
        errorMsg = err.error;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
      setLoadingStage('');
      // Re-enable button after a delay to prevent rapid double-clicks
      setTimeout(() => setIsProcessing(false), 3000); // Increased to 3 seconds
    }
  };

  const getButtonText = () => {
    if (loadingStage === 'gps') {
      return t('dashboard.acquiringGPS', 'Acquiring GPS...');
    }
    if (loadingStage === 'recording') {
      return t('dashboard.recordingTime', 'Recording time entry...');
    }
    return t('dashboard.timeIn', 'Time In / Time Out');
  };

  return (
    <div>
      <Button
        variant="primary"
        size="lg"
        loading={loading}
        disabled={isProcessing || loading}
        onClick={handleClockIn}
        className="w-full"
        icon={({ className }) => (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      >
        {getButtonText()}
      </Button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockInButton;
