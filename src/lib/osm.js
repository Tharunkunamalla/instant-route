import { toast } from "@/hooks/use-toast";

const OVERPASS_API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];

// Helper for fetch with timeout
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

// Helper to calculate distance between two coordinates in meters (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Fetches road network data from Overpass API around a center point.
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} radius - Search radius in meters
 */
export const fetchRoadNetwork = async (lat, lng, radius = 2000) => {
  const query = `
    [out:json];
    (
      way["highway"](around:${radius},${lat},${lng});
    );
    (._;>;);
    out body;
  `;

  const body = `data=${encodeURIComponent(query)}`;
  
  for (const url of OVERPASS_API_URLS) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }, 20000); // 20 second timeout per mirror

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      // Continue to next mirror silently
    }
  }

  // If all mirrors fail
  toast({
      title: "Map Data Error",
      description: "Failed to connect to any OpenStreetMap servers. Please check your internet or try again later.",
      variant: "destructive"
  });
  return null;
};

/**
 * Converts raw OSM JSON data into a weighted adjacency graph.
 * @param {object} osmData 
 */
export const buildGraphFromOSM = (osmData) => {
  if (!osmData) return {};

  const nodes = {};
  const graph = {};

  // 1. Parse Nodes
  osmData.elements.forEach(el => {
    if (el.type === 'node') {
      nodes[el.id] = { id: el.id, lat: el.lat, lng: el.lon };
    }
  });

  // 2. Build Edges from Ways
  osmData.elements.forEach(el => {
    if (el.type === 'way' && el.nodes && el.nodes.length > 1) {
      // Determine if one-way
      // const isOneWay = el.tags?.oneway === 'yes'; 
      // For simplicity in this visualizer, let's treat mostly as bidirectional 
      // unless strictly specified, but let's default to undirected for broader reachability.
      
      for (let i = 0; i < el.nodes.length - 1; i++) {
        const uId = el.nodes[i];
        const vId = el.nodes[i + 1];
        
        // Ensure nodes exist (sometimes Overpass might return a way but missing a node if outside bbox?)
        // Usually (._;>;) ensures we have all nodes.
        if (!nodes[uId] || !nodes[vId]) continue;

        const dist = getDistance(nodes[uId].lat, nodes[uId].lng, nodes[vId].lat, nodes[vId].lng);

        // Initialize graph entries if needed
        if (!graph[uId]) graph[uId] = { ...nodes[uId], neighbors: {} };
        if (!graph[vId]) graph[vId] = { ...nodes[vId], neighbors: {} };

        // Add edge U -> V
        graph[uId].neighbors[vId] = dist;
        
        // Add edge V -> U (Assuming undirected for "highway" generally walking/driving locally)
        graph[vId].neighbors[uId] = dist;
      }
    }
  });

  return graph;
};

/**
 * Finds the nearest node in the graph to a given lat/lng.
 * @param {number} lat 
 * @param {number} lng 
 * @param {object} graph 
 */
export const findNearestNode = (lat, lng, graph) => {
    let nearestId = null;
    let minDist = Infinity;

    Object.values(graph).forEach(node => {
        const d = getDistance(lat, lng, node.lat, node.lng);
        if (d < minDist) {
            minDist = d;
            nearestId = node.id;
        }
    });

    return { nodeId: nearestId, distance: minDist };
};
