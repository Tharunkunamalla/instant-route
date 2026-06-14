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

export default async function handler(req, res) {
  // Set CORS headers for security and flexibility
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  let query = req.query.data;
  
  // Robust parsing of body in case req.body is URL-encoded string, JSON string, or object
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
    res.status(400).json({ error: "Missing query parameter 'data'" });
    return;
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
        res.status(200).json(data);
        return;
      } else {
        console.warn(`[Proxy] Mirror ${url} returned status ${response.status}`);
      }
    } catch (error) {
      console.warn(`[Proxy] Failed fetching from ${url}:`, error.message);
    }
  }

  res.status(502).json({ error: "Failed to connect to any OpenStreetMap/Overpass servers" });
}
