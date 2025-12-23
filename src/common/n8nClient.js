const config = require('../config');

/**
 * N8N Client để gọi webhooks từ n8n
 */
class N8nClient {
  constructor() {
    this.baseUrl = config.n8n.baseUrl;
    this.apiKey = config.n8n.apiKey;
  }

  /**
   * Trigger một webhook trong n8n
   * @param {string} webhookPath - Path của webhook (e.g., 'document-upload')
   * @param {object} data - Data gửi đến webhook
   * @param {string} method - HTTP method (GET, POST, etc.)
   */
  async triggerWebhook(webhookPath, data = {}, method = 'POST') {
    const url = `${this.baseUrl}/webhook/${webhookPath}`.replace(/([^:]\/)\/+/g, "$1"); // Fix double slashes
    
    console.log('=== N8N WEBHOOK TRIGGER ===');
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Data keys:', Object.keys(data));
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      console.log('N8N Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8N Error response:', errorText);
        throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('N8N Response success:', result);
      return result;
    } catch (error) {
      console.error('=== N8N WEBHOOK ERROR ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Trigger webhook test mode
   * @param {string} webhookPath - Path của webhook
   * @param {object} data - Data gửi đến webhook
   */
  async triggerTestWebhook(webhookPath, data = {}) {
    const url = `${this.baseUrl}/webhook-test/${webhookPath}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`N8N test webhook error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

module.exports = new N8nClient();
