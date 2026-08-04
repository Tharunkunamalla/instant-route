const fs = require('fs');
const path = require('path');
const through = require('through2');
const parseOSM = require('osm-pbf-parser');

const PBF_FILE_PATH = path.join(__dirname, '../telangana-latest.osm (1).pbf');
const OUTPUT_FILE_PATH = path.join(__dirname, '../public/data/telangana_map.json');

// Major highway categories to include in the graph
const ACCEPTED_HIGHWAYS = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'
]);

// Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function run() {
  const referencedNodeIds = new Set();
  const ways = [];

  console.log('--- PASS 1: Collecting ways and referenced node IDs ---');
  let wayCount = 0;
  let elementCount = 0;

  await new Promise((resolve, reject) => {
    const osm = parseOSM();
    fs.createReadStream(PBF_FILE_PATH)
      .pipe(osm)
      .pipe(through.obj((items, enc, next) => {
        items.forEach(item => {
          elementCount++;
          if (item.type === 'way' && item.tags && item.tags.highway) {
            const hw = item.tags.highway;
            if (ACCEPTED_HIGHWAYS.has(hw)) {
              wayCount++;
              ways.push({
                id: item.id,
                refs: item.refs,
                highway: hw
              });
              item.refs.forEach(ref => referencedNodeIds.add(ref));
            }
          }
        });
        if (elementCount % 500000 === 0) {
          console.log(`Processed ${elementCount} PBF elements...`);
        }
        next();
      }))
      .on('finish', resolve)
      .on('error', reject);
  });

  console.log(`Pass 1 finished. Found ${ways.length} major highway ways referencing ${referencedNodeIds.size} unique nodes.`);

  console.log('\n--- PASS 2: Collecting coordinates for referenced nodes ---');
  const nodeCoords = new Map(); // nodeId -> [lat, lon]
  let processedNodes = 0;
  elementCount = 0;

  await new Promise((resolve, reject) => {
    const osm = parseOSM();
    fs.createReadStream(PBF_FILE_PATH)
      .pipe(osm)
      .pipe(through.obj((items, enc, next) => {
        items.forEach(item => {
          elementCount++;
          if (item.type === 'node' && referencedNodeIds.has(item.id)) {
            nodeCoords.set(item.id, [item.lat, item.lon]);
            processedNodes++;
          }
        });
        if (elementCount % 500000 === 0) {
          console.log(`Processed ${elementCount} PBF elements... (Found ${processedNodes} coords)`);
        }
        next();
      }))
      .on('finish', resolve)
      .on('error', reject);
  });

  console.log(`Pass 2 finished. Stored coordinates for ${nodeCoords.size} nodes.`);

  console.log('\n--- Building the Adjacency Graph ---');
  const rawGraph = {};

  ways.forEach(way => {
    for (let i = 0; i < way.refs.length - 1; i++) {
      const uId = way.refs[i];
      const vId = way.refs[i + 1];

      const uCoords = nodeCoords.get(uId);
      const vCoords = nodeCoords.get(vId);

      if (!uCoords || !vCoords) {
        continue; // Skip segments with missing node coordinates
      }

      const [uLat, uLon] = uCoords;
      const [vLat, vLon] = vCoords;
      const dist = getDistance(uLat, uLon, vLat, vLon);

      // Initialize entries in graph
      if (!rawGraph[uId]) {
        rawGraph[uId] = { id: String(uId), lat: uLat, lng: uLon, neighbors: {} };
      }
      if (!rawGraph[vId]) {
        rawGraph[vId] = { id: String(vId), lat: vLat, lng: vLon, neighbors: {} };
      }

      // Add bidirectional edges
      rawGraph[uId].neighbors[vId] = dist;
      rawGraph[vId].neighbors[uId] = dist;
    }
  });

  const rawGraphSize = Object.keys(rawGraph).length;
  console.log(`Initial graph built with ${rawGraphSize} active nodes.`);

  if (rawGraphSize === 0) {
    console.error('Error: Built graph contains 0 nodes. Check PBF parsing filters.');
    return;
  }

  console.log('\n--- Finding Connected Components & Largest Component ---');
  const visited = new Set();
  const components = [];

  for (const nodeId of Object.keys(rawGraph)) {
    if (visited.has(nodeId)) continue;

    const component = [];
    const queue = [nodeId];
    visited.add(nodeId);

    let head = 0;
    while (head < queue.length) {
      const currId = queue[head++];
      component.push(currId);

      const neighbors = Object.keys(rawGraph[currId].neighbors);
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    components.push(component);
  }

  console.log(`Found ${components.length} connected components.`);
  components.sort((a, b) => b.length - a.length);

  for (let i = 0; i < Math.min(5, components.length); i++) {
    console.log(`Component ${i + 1} size: ${components[i].length} nodes`);
  }

  const largestComponent = components[0];
  const lccNodeSet = new Set(largestComponent);

  // Filter rawGraph to keep only the Largest Connected Component (LCC)
  const lccGraph = {};
  for (const nodeId of largestComponent) {
    const rawNode = rawGraph[nodeId];
    const filteredNeighbors = {};

    for (const [neighborId, dist] of Object.entries(rawNode.neighbors)) {
      if (lccNodeSet.has(neighborId)) {
        filteredNeighbors[neighborId] = dist;
      }
    }

    lccGraph[nodeId] = {
      id: rawNode.id,
      lat: rawNode.lat,
      lng: rawNode.lng,
      neighbors: filteredNeighbors
    };
  }

  const finalNodeCount = Object.keys(lccGraph).length;
  console.log(`Filtered graph retains the Largest Connected Component: ${finalNodeCount} nodes.`);

  contractGraph(lccGraph);

  console.log(`\nWriting output to ${OUTPUT_FILE_PATH}...`);
  fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(lccGraph, null, 2), 'utf-8');
  console.log('Success! Graph generated and saved.');
}

function contractGraph(graph) {
  const nodeIds = Object.keys(graph);
  console.log(`\n--- Contracting Graph (Simplifying degree-2 nodes) ---`);
  console.log(`Initial nodes: ${nodeIds.length}`);

  const queue = [];
  for (const id of nodeIds) {
    if (Object.keys(graph[id].neighbors).length === 2) {
      queue.push(id);
    }
  }

  let contractedCount = 0;
  const inQueue = new Set(queue);

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    inQueue.delete(id);

    const node = graph[id];
    if (!node) continue;

    const neighbors = Object.keys(node.neighbors);
    if (neighbors.length !== 2) continue;

    const [uId, wId] = neighbors;
    if (uId === wId) continue;

    const distU = node.neighbors[uId];
    const distW = node.neighbors[wId];
    const newDist = distU + distW;

    const uNode = graph[uId];
    const wNode = graph[wId];

    if (uNode && wNode) {
      // Remove connections to the contracted node
      delete uNode.neighbors[id];
      delete wNode.neighbors[id];

      // Insert/update direct edge between neighbors
      if (uNode.neighbors[wId] !== undefined) {
        uNode.neighbors[wId] = Math.min(uNode.neighbors[wId], newDist);
      } else {
        uNode.neighbors[wId] = newDist;
      }

      if (wNode.neighbors[uId] !== undefined) {
        wNode.neighbors[uId] = Math.min(wNode.neighbors[uId], newDist);
      } else {
        wNode.neighbors[uId] = newDist;
      }

      // Delete the contracted node
      delete graph[id];
      contractedCount++;

      // Re-evaluate neighbors
      if (Object.keys(uNode.neighbors).length === 2 && !inQueue.has(uId)) {
        queue.push(uId);
        inQueue.add(uId);
      }
      if (Object.keys(wNode.neighbors).length === 2 && !inQueue.has(wId)) {
        queue.push(wId);
        inQueue.add(wId);
      }
    }
  }

  console.log(`Contraction finished. Removed ${contractedCount} degree-2 nodes.`);
  console.log(`Final nodes remaining: ${Object.keys(graph).length}`);
}

run().catch(err => {
  console.error('Fatal error running script:', err);
});
