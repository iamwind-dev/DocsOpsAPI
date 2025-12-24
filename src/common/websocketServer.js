/**
 * WebSocket Server Module
 * 
 * Provides real-time event broadcasting for frontend updates.
 * Events include: SIGNER_SIGNED, REQUEST_COMPLETED, REQUEST_EXPIRED, etc.
 * 
 * KHÔNG ảnh hưởng đến code hiện tại - module độc lập
 */

const WebSocket = require('ws');

// Store connected clients by request ID for targeted broadcasting
const clients = new Map(); // Map<requestId, Set<WebSocket>>
const allClients = new Set(); // All connected clients

// Event types
const EVENT_TYPES = {
  SIGNER_SIGNED: 'SIGNER_SIGNED',
  REQUEST_COMPLETED: 'REQUEST_COMPLETED',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  REMINDER_SENT: 'REMINDER_SENT',
  APPROVAL_UPDATED: 'APPROVAL_UPDATED',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
};

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 * @returns {WebSocket.Server}
 */
const initWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/e-signature'
  });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    allClients.add(ws);

    // Parse request ID from query if provided
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestId = url.searchParams.get('requestId');

    if (requestId) {
      if (!clients.has(requestId)) {
        clients.set(requestId, new Set());
      }
      clients.get(requestId).add(ws);
    }

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle subscription to specific request
        if (data.type === 'SUBSCRIBE' && data.requestId) {
          if (!clients.has(data.requestId)) {
            clients.set(data.requestId, new Set());
          }
          clients.get(data.requestId).add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', requestId: data.requestId }));
        }

        // Handle unsubscription
        if (data.type === 'UNSUBSCRIBE' && data.requestId) {
          if (clients.has(data.requestId)) {
            clients.get(data.requestId).delete(ws);
          }
          ws.send(JSON.stringify({ type: 'UNSUBSCRIBED', requestId: data.requestId }));
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      allClients.delete(ws);
      
      // Remove from all request subscriptions
      for (const [requestId, clientSet] of clients.entries()) {
        clientSet.delete(ws);
        if (clientSet.size === 0) {
          clients.delete(requestId);
        }
      }
    });

    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'CONNECTED', 
      message: 'Connected to E-Signature WebSocket',
      timestamp: new Date().toISOString()
    }));
  });

  console.log('WebSocket server initialized at /ws/e-signature');
  return wss;
};

/**
 * Broadcast event to all subscribers of a specific request
 * @param {string} requestId - Request ID
 * @param {string} eventType - Event type from EVENT_TYPES
 * @param {Object} data - Event data
 */
const broadcastToRequest = (requestId, eventType, data = {}) => {
  const message = JSON.stringify({
    type: eventType,
    requestId,
    data,
    timestamp: new Date().toISOString(),
  });

  if (clients.has(requestId)) {
    for (const client of clients.get(requestId)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  console.log(`Broadcast ${eventType} to request ${requestId}`);
};

/**
 * Broadcast event to all connected clients
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
const broadcastToAll = (eventType, data = {}) => {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of allClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }

  console.log(`Broadcast ${eventType} to all clients (${allClients.size})`);
};

/**
 * Get connected client count
 * @returns {Object} - Client stats
 */
const getClientStats = () => {
  return {
    totalClients: allClients.size,
    requestSubscriptions: clients.size,
  };
};

/**
 * Broadcast from HTTP endpoint (for n8n integration)
 * Called via internal API
 */
const handleBroadcastRequest = (requestId, eventType, data) => {
  if (requestId) {
    broadcastToRequest(requestId, eventType, data);
  } else {
    broadcastToAll(eventType, data);
  }
};

module.exports = {
  initWebSocketServer,
  broadcastToRequest,
  broadcastToAll,
  getClientStats,
  handleBroadcastRequest,
  EVENT_TYPES,
};
