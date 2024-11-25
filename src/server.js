// src/server.js
const WebSocket = require('ws');
const http = require('http');
const { bidLimiter } = require('./middleware/rateLimiter');
const AuctionController = require('./controllers/auctionController');
const BidController = require('./controllers/bidController');

const server = http.createServer();
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  // Add ping interval to detect stale connections
  pingInterval: 30000,
  pingTimeout: 5000
});

// Initialize controllers
const auctionController = new AuctionController(wss);
const bidController = new BidController(auctionController);

// Improved connection tracking
const connectionTracker = new Map();
const CONNECTIONS_PER_IP = 2;

// Clean up stale connections periodically
setInterval(() => {
  for (const [ip, connections] of connectionTracker.entries()) {
    // Remove closed connections
    for (const ws of connections) {
      if (ws.readyState === WebSocket.CLOSED) {
        connections.delete(ws);
      }
    }
    // Remove empty IPs
    if (connections.size === 0) {
      connectionTracker.delete(ip);
    }
  }
}, 30000);

wss.on('connection', async (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`New connection attempt from ${clientIp}`);

  // Initialize connection set for this IP
  if (!connectionTracker.has(clientIp)) {
    connectionTracker.set(clientIp, new Set());
  }

  const connections = connectionTracker.get(clientIp);
  
  // Check connection limit
  if (connections.size >= CONNECTIONS_PER_IP) {
    console.log(`Connection limit reached for ${clientIp}`);
    ws.close(1013, 'Too many connections');
    return;
  }

  // Add this connection
  connections.add(ws);
  
  // Set up ping/pong for connection health check
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  console.log(`Client connected from ${clientIp}, total connections: ${connections.size}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch(data.type) {
        case 'joinAuction':
          await auctionController.handleJoinAuction(ws, data.userId, data.auctionId);
          break;

        case 'placeBid':
          await bidController.handleBid(ws, {
            userId: ws.userId,
            auctionId: data.auctionId,
            amount: data.amount
          });
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Message handling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Failed to process message'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected from ${clientIp}`);
    connections.delete(ws);
    if (connections.size === 0) {
      connectionTracker.delete(clientIp);
    }
    auctionController.removeClient(ws);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientIp}:`, error);
    ws.close();
  });
});

// Ping all clients periodically
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Clean up on server close
wss.on('close', () => {
  clearInterval(interval);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

// Handle process termination
process.on('SIGTERM', () => {
  wss.clients.forEach(client => {
    client.close(1000, 'Server shutting down');
  });
  server.close(() => {
    process.exit(0);
  });
});