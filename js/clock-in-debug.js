/**
 * Clock-In Debug Logger
 * Intercepts clock-in responses and logs timing data to console
 */

// Override the global jsonp function to intercept responses
(function() {
  'use strict';
  
  console.log('🔍 Clock-in debug logger initialized');
  
  // Store original jsonp function if it exists
  const originalJsonp = window.jsonp;
  
  // Create enhanced jsonp wrapper
  window.jsonp = function(url, callback) {
    console.log('📡 API Call:', url);
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      
      window[callbackName] = function(data) {
        const endTime = performance.now();
        const totalTime = Math.round(endTime - startTime);
        
        // Log basic info
        console.log(`✅ API Response received (${totalTime}ms total)`);
        
        // If this is a clock-in response with timings, log detailed breakdown
        if (data && data.timings && Array.isArray(data.timings)) {
          console.log('%c⏱️ CLOCK-IN TIMING BREAKDOWN', 'background: #FFC107; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
          console.table(data.timings);
          
          // Log slowest operations
          const sorted = [...data.timings].sort((a, b) => {
            const aTime = a.time || 0;
            const bTime = b.time || 0;
            const prevA = data.timings[data.timings.indexOf(a) - 1];
            const prevB = data.timings[data.timings.indexOf(b) - 1];
            const aDelta = aTime - (prevA ? prevA.time : 0);
            const bDelta = bTime - (prevB ? prevB.time : 0);
            return bDelta - aDelta;
          });
          
          console.log('%c🐌 SLOWEST OPERATIONS:', 'background: #ff9800; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
          sorted.slice(0, 5).forEach((timing, idx) => {
            const prevTiming = data.timings[data.timings.indexOf(timing) - 1];
            const delta = timing.time - (prevTiming ? prevTiming.time : 0);
            console.log(`${idx + 1}. ${timing.step}: ${delta}ms - ${timing.msg}`);
          });
          
          // Visual timeline
          console.log('%c📊 TIMELINE:', 'background: #4CAF50; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
          let lastTime = 0;
          data.timings.forEach(timing => {
            const delta = timing.time - lastTime;
            const bar = '█'.repeat(Math.max(1, Math.round(delta / 50)));
            console.log(`${timing.step.padEnd(20)} ${bar} ${delta}ms`);
            lastTime = timing.time;
          });
        }
        
        // Log response data
        console.log('📦 Response data:', data);
        
        delete window[callbackName];
        resolve(data);
        if (callback) callback(data);
      };
      
      const script = document.createElement('script');
      const separator = url.indexOf('?') !== -1 ? '&' : '?';
      script.src = `${url}${separator}callback=${callbackName}`;
      script.onerror = (error) => {
        console.error('❌ API call failed:', error);
        delete window[callbackName];
        reject(error);
      };
      document.body.appendChild(script);
    });
  };
  
  console.log('✅ jsonp wrapper installed for clock-in debugging');
})();

// Also intercept fetch calls if they're used
(function() {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    console.log('📡 Fetch call:', url);
    const startTime = performance.now();
    
    return originalFetch.apply(this, args)
      .then(response => {
        const endTime = performance.now();
        console.log(`✅ Fetch response (${Math.round(endTime - startTime)}ms):`, response);
        
        // Clone response to read it
        const clonedResponse = response.clone();
        clonedResponse.json()
          .then(data => {
            if (data && data.timings && Array.isArray(data.timings)) {
              console.log('%c⏱️ CLOCK-IN TIMING BREAKDOWN', 'background: #FFC107; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
              console.table(data.timings);
            }
          })
          .catch(() => {}); // Ignore if not JSON
        
        return response;
      })
      .catch(error => {
        console.error('❌ Fetch failed:', error);
        throw error;
      });
  };
  
  console.log('✅ fetch wrapper installed for clock-in debugging');
})();
