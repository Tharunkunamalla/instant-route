import express from 'express';
import cors from 'cors';
import { Kafka } from 'kafkajs';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const OVERPASS_API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];

const fetchWithTimeout = async (url, options, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }
}

const cache = new MemoryCache();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

const osmHandler = async (req, res) => {
  let query = req.query.data;
  
  if (!query && req.body) {
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        query = parsed.data;
      } catch (e) {
        const params = new URLSearchParams(req.body);
        query = params.get('data');
      }
    } else if (typeof req.body === 'object') {
      query = req.body.data;
    }
  }

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'data'" });
  }

  // Check Cache first
  const cachedData = cache.get(query);
  if (cachedData) {
    console.log(`[Proxy] Cache hit for OSM query. Serving cached data.`);
    return res.status(200).json(cachedData);
  }

  const body = `data=${encodeURIComponent(query)}`;

  for (const url of OVERPASS_API_URLS) {
    try {
      console.log(`[Proxy] Cache miss. Forwarding query to ${url}...`);
      const response = await fetchWithTimeout(url, {
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "InstantRouteGuide/1.0 (contact@example.com)"
        },
      }, 20000); // 20 second timeout per mirror

      if (response.ok) {
        const data = await response.json();
        // Save to cache on success
        cache.set(query, data, CACHE_TTL_MS);
        return res.status(200).json(data);
      } else {
        console.warn(`[Proxy] Mirror ${url} returned status ${response.status}`);
      }
    } catch (error) {
      console.warn(`[Proxy] Failed fetching from ${url}:`, error.message);
    }
  }

  res.status(502).json({ error: "Failed to connect to any OpenStreetMap/Overpass servers" });
};

// Telemetry state and consumer configuration
const kafkaBootstrapServers = process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092';
const telemetryData = {
  totalRuns: 0,
  algorithms: {
    BFS: { runs: 0, totalTimeMs: 0, totalNodesExplored: 0, totalPathLength: 0 },
    Dijkstra: { runs: 0, totalTimeMs: 0, totalNodesExplored: 0, totalPathLength: 0 },
    AStar: { runs: 0, totalTimeMs: 0, totalNodesExplored: 0, totalPathLength: 0 },
    BidirectionalDijkstra: { runs: 0, totalTimeMs: 0, totalNodesExplored: 0, totalPathLength: 0 },
    BidirectionalAStar: { runs: 0, totalTimeMs: 0, totalNodesExplored: 0, totalPathLength: 0 }
  },
  recentRuns: []
};

if (process.env.NODE_ENV !== 'test') {
  const kafka = new Kafka({
    clientId: 'osm-proxy-consumer',
    brokers: [kafkaBootstrapServers],
    retry: {
      initialRetryTime: 300,
      retries: 5
    }
  });

  const consumer = kafka.consumer({ groupId: 'osm-proxy-group' });

  const runKafkaConsumer = async () => {
    let connected = false;
    let retries = 0;
    const maxRetries = 15;

    while (!connected && retries < maxRetries) {
      try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'pathfinding-telemetry', fromBeginning: true });

        await consumer.run({
          eachMessage: async ({ message }) => {
            try {
              const rawValue = message.value.toString();
              const data = JSON.parse(rawValue);

              let algo = data.algorithm;
              if (algo === "A*") algo = "AStar";
              else if (algo === "Bidirectional Dijkstra") algo = "BidirectionalDijkstra";
              else if (algo === "Bidirectional A*") algo = "BidirectionalAStar";

              // Update stats
              telemetryData.totalRuns += 1;
              if (!telemetryData.algorithms[algo]) {
                telemetryData.algorithms[algo] = { runs: 0, totalTimeMs: 0, totalNodesExplored: 0, totalPathLength: 0 };
              }

              telemetryData.algorithms[algo].runs += 1;
              telemetryData.algorithms[algo].totalTimeMs += Number(data.executionTimeMs || 0);
              telemetryData.algorithms[algo].totalNodesExplored += Number(data.nodesExplored || 0);
              telemetryData.algorithms[algo].totalPathLength += Number(data.pathLength || 0);

              // Add to recent runs list (keep last 15)
              telemetryData.recentRuns.unshift({
                id: `${data.timestamp}-${Math.random().toString(36).substring(2, 6)}`,
                algorithm: data.algorithm,
                source: data.source,
                destination: data.destination,
                executionTimeMs: data.executionTimeMs,
                pathLength: data.pathLength,
                nodesExplored: data.nodesExplored,
                timestamp: data.timestamp
              });

              if (telemetryData.recentRuns.length > 15) {
                telemetryData.recentRuns.pop();
              }

              console.log(`[Kafka] Processed telemetry event for ${data.algorithm} (${data.executionTimeMs}ms)`);
            } catch (err) {
              console.error("[Kafka] Parse error:", err.message);
            }
          }
        });

        console.log("[Kafka] Consumer connected & subscribed to topic 'pathfinding-telemetry'");
        connected = true;
      } catch (error) {
        retries++;
        console.warn(`[Kafka] Connection attempt ${retries}/${maxRetries} failed: ${error.message}. Retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!connected) {
      console.error("[Kafka] Failed to establish consumer connection after max retries.");
    }
  };

  runKafkaConsumer();
}

// Route handlers
app.post('/api/osm', osmHandler);
app.get('/api/osm', osmHandler);
app.post('/', osmHandler);
app.get('/', osmHandler);

app.get('/api/analytics', (req, res) => {
  res.status(200).json(telemetryData);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Live Location WebSocket State
// rooms: Map<sessionId, Map<userId, { username, lat, lng, ws }>>
const rooms = new Map();

// Create HTTP server wrapping express app
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (parsedUrl.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Broadcast helper
const broadcastToRoom = (sessionId, message, excludeUserId = null) => {
  const room = rooms.get(sessionId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const [memberId, member] of room.entries()) {
    if (excludeUserId && memberId === excludeUserId) continue;
    if (member.ws && member.ws.readyState === 1) { // OPEN
      member.ws.send(data);
    }
  }
};

// WebSocket connection handler
wss.on('connection', (ws) => {
  let userSessionId = null;
  let userMemberId = null;

  ws.on('message', (messageStr) => {
    try {
      const data = JSON.parse(messageStr.toString());

      if (data.type === 'join') {
        const { username } = data;
        let { sessionId } = data;

        // Generate room code if not provided
        if (!sessionId) {
          sessionId = 'LIV-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        } else {
          sessionId = sessionId.toUpperCase().trim();
        }

        // Clean up from any previous room
        if (userSessionId && rooms.has(userSessionId)) {
          const room = rooms.get(userSessionId);
          room.delete(userMemberId);
          broadcastToRoom(userSessionId, { type: 'member-left', userId: userMemberId });
          if (room.size === 0) rooms.delete(userSessionId);
        }

        userSessionId = sessionId;
        userMemberId = 'usr-' + Math.random().toString(36).substring(2, 7);

        if (!rooms.has(sessionId)) {
          rooms.set(sessionId, new Map());
        }

        const room = rooms.get(sessionId);
        
        // Add new member
        const newMember = {
          userId: userMemberId,
          username: username || 'Anonymous',
          lat: data.lat || null,
          lng: data.lng || null,
          ws
        };
        room.set(userMemberId, newMember);

        // Prepare member list for the joining client (excluding socket details)
        const membersList = [];
        for (const [mId, m] of room.entries()) {
          membersList.push({
            userId: m.userId,
            username: m.username,
            lat: m.lat,
            lng: m.lng
          });
        }

        // Acknowledge join to the user
        ws.send(JSON.stringify({
          type: 'joined',
          sessionId,
          userId: userMemberId,
          members: membersList
        }));

        // Broadcast join to other members
        broadcastToRoom(sessionId, {
          type: 'member-joined',
          member: {
            userId: userMemberId,
            username: newMember.username,
            lat: newMember.lat,
            lng: newMember.lng
          }
        }, userMemberId);

        console.log(`[WS] User ${newMember.username} (${userMemberId}) joined room ${sessionId}`);
      }

      else if (data.type === 'update-location') {
        if (!userSessionId || !userMemberId || !rooms.has(userSessionId)) return;
        
        const room = rooms.get(userSessionId);
        const member = room.get(userMemberId);
        if (member) {
          member.lat = data.lat;
          member.lng = data.lng;

          // Broadcast coordinate update to room
          broadcastToRoom(userSessionId, {
            type: 'location-updated',
            userId: userMemberId,
            lat: data.lat,
            lng: data.lng
          }, userMemberId);
        }
      }
    } catch (err) {
      console.error('[WS] Error processing message:', err.message);
    }
  });

  ws.on('close', () => {
    if (userSessionId && userMemberId && rooms.has(userSessionId)) {
      const room = rooms.get(userSessionId);
      const member = room.get(userMemberId);
      const username = member ? member.username : 'Unknown';
      
      room.delete(userMemberId);
      console.log(`[WS] User ${username} (${userMemberId}) disconnected from room ${userSessionId}`);

      broadcastToRoom(userSessionId, {
        type: 'member-left',
        userId: userMemberId
      });

      if (room.size === 0) {
        rooms.delete(userSessionId);
        console.log(`[WS] Room ${userSessionId} deleted as it is empty`);
      }
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, '0.0.0.0', () => {
    console.log(`OSM Proxy microservice running on port ${port} (HTTP & WebSockets)`);
  });
}

export default app;
