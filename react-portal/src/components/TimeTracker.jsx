/**
 * TimeTracker Component
 * Simplified clock in/out with dedicated break buttons
 * Features:
 * - Clock In/Out with GPS
 * - Start/End Break buttons
 * - Live time display
 * - Automatic hour calculation
 * - Multiple breaks per shift
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../services/supabase';

export default function TimeTracker({ onClockInOut }) {
    const { user } = useAuth();
    const [activeShift, setActiveShift] = useState(null);
    const [activeBreak, setActiveBreak] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [location, setLocation] = useState(null);
    const [hoursToday, setHoursToday] = useState(0);
    const [elapsedWork, setElapsedWork] = useState(0); // Seconds of work time
    const [elapsedBreak, setElapsedBreak] = useState(0); // Seconds of break time

    // Fetch active shift on mount
    useEffect(() => {
        fetchActiveShift();
        fetchTodayHours();
    }, []);

    // Update timers every second
    useEffect(() => {
        const timer = setInterval(() => {
            if (activeShift && !activeBreak) {
                // Calculate work time since clock in minus total breaks
                const workStart = new Date(activeShift.clock_in_time);
                const now = new Date();
                const totalSeconds = Math.floor((now - workStart) / 1000);
                const breakSeconds = (activeShift.total_break_minutes || 0) * 60;
                setElapsedWork(totalSeconds - breakSeconds);
            } else if (activeBreak) {
                // Calculate break time
                const breakStart = new Date(activeBreak.break_start);
                const now = new Date();
                setElapsedBreak(Math.floor((now - breakStart) / 1000));
            }
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, [activeShift, activeBreak]);

    const fetchActiveShift = async () => {
        try {
            const { data, error } = await supabase
                .from('time_events')
                .select(`
          *,
          break_periods(*)
        `)
                .eq('worker_id', user.workerId)
                .is('clock_out_time', null)
                .order('clock_in_time', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                // Table doesn't exist yet (migration not run)
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    setError('⏳ Time tracking system is being upgraded. Please check back soon.');
                    return;
                }

                // No active shift found (PGRST116)
                if (error.code === 'PGRST116') {
                    return;
                }

                console.error('Error fetching active shift:', error);
                return;
            }

            setActiveShift(data);

            // Check for active break
            if (data?.break_periods) {
                const ongoingBreak = data.break_periods.find(b => !b.break_end);
                setActiveBreak(ongoingBreak);
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Unable to load time tracking. Please refresh the page.');
        }
    };

    const fetchTodayHours = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('time_events')
                .select('hours_worked')
                .eq('worker_id', user.workerId)
                .eq('event_date', today)
                .not('hours_worked', 'is', null);

            if (error) {
                // Table doesn't exist yet - silently skip
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    return;
                }
            }

            if (data) {
                const total = data.reduce((sum, event) => sum + (event.hours_worked || 0), 0);
                setHoursToday(total);
            }
        } catch (err) {
            console.error('Error fetching today hours:', err);
        }
    };

    const calculateCurrentHours = () => {
        if (!activeShift) return;

        const clockIn = new Date(activeShift.clock_in_time);
        const now = new Date();
        const minutesElapsed = (now - clockIn) / 1000 / 60;
        const hours = ((minutesElapsed - (activeShift.total_break_minutes || 0)) / 60).toFixed(2);

        setActiveShift(prev => ({
            ...prev,
            current_hours: parseFloat(hours)
        }));
    };

    const getLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    const handleClockIn = async () => {
        setLoading(true);
        setError('');

        try {
            // Get location
            const loc = await getLocation();
            setLocation(loc);

            // Create time_event
            const { data, error } = await supabase
                .from('time_events')
                .insert({
                    worker_id: user.workerId,
                    event_date: new Date().toISOString().split('T')[0],
                    clock_in_time: new Date().toISOString(),
                    clock_in_latitude: loc.latitude,
                    clock_in_longitude: loc.longitude,
                    device_info: getDeviceInfo(),
                    status: 'in_progress'
                })
                .select()
                .single();

            if (error) throw error;

            setActiveShift(data);
            setError('');
            if (onClockInOut) onClockInOut();
        } catch (err) {
            console.error('Clock in error:', err);
            setError(err.message || 'Failed to clock in');
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!activeShift) return;

        // Confirm if on active break
        if (activeBreak) {
            const confirmed = window.confirm(
                'You are currently on a break. End break and clock out?'
            );
            if (!confirmed) return;

            // End break first
            await handleEndBreak();
        }

        setLoading(true);
        setError('');

        try {
            // Get location
            const loc = await getLocation();

            // Update time_event with clock_out
            const { data, error } = await supabase
                .from('time_events')
                .update({
                    clock_out_time: new Date().toISOString(),
                    clock_out_latitude: loc.latitude,
                    clock_out_longitude: loc.longitude
                })
                .eq('id', activeShift.id)
                .select()
                .single();

            if (error) throw error;

            setActiveShift(null);
            setActiveBreak(null);
            fetchTodayHours();
            setError('');
            if (onClockInOut) onClockInOut();
        } catch (err) {
            console.error('Clock out error:', err);
            setError(err.message || 'Failed to clock out');
        } finally {
            setLoading(false);
        }
    };

    const handleStartBreak = async (breakType = 'lunch') => {
        if (!activeShift) return;

        setLoading(true);
        setError('');

        try {
            // Create break_period
            const { data, error } = await supabase
                .from('break_periods')
                .insert({
                    time_event_id: activeShift.id,
                    break_start: new Date().toISOString(),
                    break_type: breakType
                })
                .select()
                .single();

            if (error) throw error;

            setActiveBreak(data);
            setError('');
        } catch (err) {
            console.error('Start break error:', err);
            setError(err.message || 'Failed to start break');
        } finally {
            setLoading(false);
        }
    };

    const handleEndBreak = async () => {
        if (!activeBreak) return;

        setLoading(true);
        setError('');

        try {
            // Update break_period with end time
            const { data, error } = await supabase
                .from('break_periods')
                .update({
                    break_end: new Date().toISOString()
                })
                .eq('id', activeBreak.id)
                .select()
                .single();

            if (error) throw error;

            setActiveBreak(null);

            // Refresh active shift to get updated total_break_minutes
            await fetchActiveShift();

            setError('');
        } catch (err) {
            console.error('End break error:', err);
            setError(err.message || 'Failed to end break');
        } finally {
            setLoading(false);
        }
    };

    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        let device = 'Unknown';
        let browser = 'Unknown';

        // Detect device
        if (/iPhone/i.test(ua)) device = 'iPhone';
        else if (/iPad/i.test(ua)) device = 'iPad';
        else if (/Android/i.test(ua)) device = 'Android';
        else if (/Windows/i.test(ua)) device = 'Windows';
        else if (/Mac/i.test(ua)) device = 'macOS';

        // Detect browser
        if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Edge/i.test(ua)) browser = 'Edge';

        return `${device} - ${browser}`;
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    // Format seconds to HH:MM:SS
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Main Action Buttons */}
            <div className="space-y-3">
                {!activeShift ? (
                    // Clock In Button
                    <button
                        onClick={handleClockIn}
                        disabled={loading}
                        className="w-full bg-cls-amber hover:bg-amber-500 text-cls-charcoal font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {loading ? 'Getting Location...' : 'Clock In'}
                    </button>
                ) : (
                    <>
                        {/* Break Buttons */}
                        <div className="flex gap-3">
                            {!activeBreak ? (
                                <button
                                    onClick={() => handleStartBreak('lunch')}
                                    disabled={loading}
                                    className="flex-1 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {loading ? 'Starting...' : 'Start Break'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleEndBreak}
                                    disabled={loading}
                                    className="flex-1 bg-cls-amber hover:bg-amber-500 text-cls-charcoal font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {loading ? 'Ending...' : 'End Break'}
                                </button>
                            )}

                            {/* Clock Out Button */}
                            <button
                                onClick={handleClockOut}
                                disabled={loading}
                                className="flex-1 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {loading ? 'Clocking Out...' : 'Clock Out'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Active Status Indicator */}
            {activeShift && (
                <div className="flex justify-center">
                    {activeBreak ? (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                            <span className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-pulse"></span>
                            On Break
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium bg-cls-amber text-cls-charcoal border border-cls-amber">
                            <span className="w-2.5 h-2.5 bg-cls-charcoal rounded-full animate-pulse"></span>
                            Working
                        </span>
                    )}
                </div>
            )}

            {/* Work/Break Timer */}
            <div>
                {activeShift && !activeBreak && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-t-4 border-cls-amber p-8 text-center">
                        <div className="text-sm font-semibold text-cls-amber uppercase tracking-wider mb-2">Work Time</div>
                        <div className="text-5xl font-bold text-gray-800 dark:text-white font-mono">{formatTime(elapsedWork)}</div>
                    </div>
                )}
                {activeBreak && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-t-4 border-yellow-500 p-8 text-center">
                        <div className="text-sm font-semibold text-yellow-500 uppercase tracking-wider mb-2">Break Time</div>
                        <div className="text-5xl font-bold text-gray-800 dark:text-white font-mono">{formatTime(elapsedBreak)}</div>
                    </div>
                )}
                {!activeShift && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-t-4 border-gray-300 dark:border-gray-700 p-8 text-center">
                        <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Not Clocked In</div>
                        <div className="text-5xl font-bold text-gray-400 dark:text-gray-600 font-mono">--:--:--</div>
                    </div>
                )}
            </div>

            {/* Today's Hours Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Hours Today</div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">
                        {hoursToday.toFixed(2)}
                    </div>
                </div>

                {activeShift && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border-2 border-cls-amber">
                        <div className="text-sm text-cls-amber uppercase tracking-wide mb-2">Current Shift</div>
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                            {activeShift.current_hours?.toFixed(2) || '0.00'}
                        </div>
                    </div>
                )}

                {activeShift && activeShift.total_break_minutes > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Break Time</div>
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                            {formatDuration(activeShift.total_break_minutes)}
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center font-medium">
                    {error}
                </div>
            )}
        </div>
    );
}
