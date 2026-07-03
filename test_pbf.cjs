const fs = require('fs');
const path = require('path');
const Parser = require('osm-pbf-parser');

const pbfPath = path.join(__dirname, 'dist', 'data', 'telangana-latest.osm.pbf');
console.log('Reading from:', pbfPath);

// Warangal center
const targetLat = 17.9830;
const targetLng = 79.5307;
const radius = 2500; // meters

const latDelta = (radius * 1.5) / 111320;
const lngDelta = (radius * 1.5) / (111320 * Math.cos(targetLat * Math.PI / 180));
const minLat = targetLat - latDelta;
const maxLat = targetLat + latDelta;
const minLng = targetLng - lngDelta;
const maxLng = targetLng + lngDelta;

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

const nodesMap = new Map();
const ways = [];
const pbfParser = new Parser();

console.time('Parsing PBF');
fs.createReadStream(pbfPath)
  .pipe(pbfParser)
  .on('data', (items) => {
    for (const item of items) {
      if (item.type === 'node') {
        if (item.lat >= minLat && item.lat <= maxLat && item.lon >= minLng && item.lon <= maxLng) {
          const dist = getDistance(targetLat, targetLng, item.lat, item.lon);
          if (dist <= radius * 1.5) {
            nodesMap.set(item.id, { id: item.id, lat: item.lat, lon: item.lon });
          }
        }
      } else if (item.type === 'way') {
        if (item.tags && item.tags.highway) {
          let hasNodeInRadius = false;
          for (const ref of item.refs) {
            if (nodesMap.has(ref)) {
              hasNodeInRadius = true;
              break;
            }
          }
          if (hasNodeInRadius) {
            ways.push(item);
          }
        }
      }
    }
  })
  .on('end', () => {
    console.timeEnd('Parsing PBF');
    console.log(`Found ${nodesMap.size} nodes and ${ways.length} ways within radius.`);
    
    const referencedNodes = new Set();
    for (const way of ways) {
      for (const ref of way.refs) {
        referencedNodes.add(ref);
      }
    }
    
    const finalElements = [];
    for (const nodeId of referencedNodes) {
      const node = nodesMap.get(nodeId);
      if (node) {
        finalElements.push({
          type: 'node',
          id: node.id,
          lat: node.lat,
          lon: node.lon
        });
      }
    }
    
    for (const way of ways) {
      finalElements.push({
        type: 'way',
        id: way.id,
        nodes: way.refs,
        tags: way.tags
      });
    }
    
    console.log(`Final output elements count: ${finalElements.length}`);
  })
  .on('error', (err) => {
    console.error('Error:', err);
  });
