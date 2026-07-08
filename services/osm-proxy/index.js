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

  const body = `data=${encodeURIComponent(query)}`;

  for (const url of OVERPASS_API_URLS) {
    try {
      console.log(`[Proxy] Forwarding query to ${url}...`);
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
