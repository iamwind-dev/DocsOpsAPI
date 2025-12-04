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
    const url = `${this.baseUrl}/webhook/${webhookPath}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
