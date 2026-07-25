import express from 'express';
import cors from 'cors';

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

// Route handlers
app.post('/api/osm', osmHandler);
app.get('/api/osm', osmHandler);
app.post('/', osmHandler);
app.get('/', osmHandler);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`OSM Proxy microservice running on port ${port}`);
});
