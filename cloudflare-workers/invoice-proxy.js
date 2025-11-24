/**
 * Cloudflare Worker: invoice-proxy.s-garay.workers.dev
 * 
 * Purpose: CORS proxy for InvoiceProject Google Apps Script web app
 * Proxies POST requests from frontend to manage invoices (send email, sync to QBO)
 * 
 * Target Web App: https://script.google.com/macros/s/AKfycbzdxAPBjVHcYLkUhZ5tKHu-nD402ZPIuu0WqgqCm9KQFk3Zt03Ht5iflXFHalepnfby7g/exec
 * 
 * Expected Payloads:
 * 
 * Send Invoice Email:
 * {
 *   "action": "sendInvoiceEmail",
 *   "invoiceNumber": "INV-2025-001"
 * }
 * 
 * Sync to QuickBooks:
 * {
 *   "event": "QBO_Approval",
 *   "invoiceNumber": "INV-2025-001"
 * }
 */

export default {
  async fetch(request) {
    const targetUrl = "https://script.google.com/macros/s/AKfycbzdxAPBjVHcYLkUhZ5tKHu-nD402ZPIuu0WqgqCm9KQFk3Zt03Ht5iflXFHalepnfby7g/exec";
    
    // Handle OPTIONS preflight request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    try {
      // Forward the request to Google Apps Script
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: request.method === 'POST' ? await request.text() : undefined
      });

      // Get response text (Google Apps Script returns JSON via ContentService)
      const responseText = await response.text();
      
      // Parse to validate it's JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (err) {
        // If not valid JSON, return error
        return new Response(JSON.stringify({
          status: 500,
          message: 'Invalid response from InvoiceProject',
          raw: responseText.substring(0, 200)
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept'
          }
        });
      }

      // Return the response with CORS headers
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept'
        }
      });

    } catch (error) {
      // Return error with CORS headers
      return new Response(JSON.stringify({
        status: 500,
        message: error.message || 'Proxy error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept'
        }
      });
    }
  }
};
