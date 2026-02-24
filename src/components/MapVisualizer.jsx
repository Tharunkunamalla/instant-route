import React, { useEffect, useState, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, useMapEvents, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createPinIcon = (color) => L.divIcon({
  className: 'custom-pin-icon',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 30], // Tip is at x=12, y=22 in 24x24 box. Scaled to 32x32 approx y=29.3. 30 is safe.
  popupAnchor: [0, -32]
});

const bluePin = createPinIcon('#3b82f6');
const redPin = createPinIcon('#ef4444');

const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e),
  });
  return null;
};

// 1. Static Edges Layer - Renders only when graph changes
const StaticEdges = memo(({ graph }) => {
    return (
      <>
        {Object.values(graph).map(node => (
            Object.entries(node.neighbors).map(([neighborId, weight]) => {
            const neighbor = graph[neighborId];
            if (!neighbor) return null;
            // Key needs to be unique but consistent. Sort IDs? 
            // Actually, we render both directions (u->v and v->u). It's fine for visualization opacity.
            return (
                <Polyline 
                key={`${node.id}-${neighborId}`}
                positions={[[node.lat, node.lng], [neighbor.lat, neighbor.lng]]}
                pathOptions={{ color: 'gray', weight: 1, opacity: 0.3 }}
                />
            );
            })
        ))}
      </>
    );
}, (prev, next) => prev.graph === next.graph); // Custom comparison if needed, but strict equality of ref should suffice if immutable

// 2. Dynamic Visited Nodes Layer - Renders when visitedCount changes
// Optimized to avoid React render overhead for thousands of nodes
const VisitedNodesLayer = memo(({ visitedOrder, visitedCount, graph }) => {
    const map = useMap();
    const layerGroupRef = React.useRef(null);
    const lastCountRef = React.useRef(0);

    useEffect(() => {
        if (!layerGroupRef.current) {
            layerGroupRef.current = L.layerGroup().addTo(map);
        }

        // If visitedCount reset to 0
        if (visitedCount === 0) {
            layerGroupRef.current.clearLayers();
            lastCountRef.current = 0;
            return;
        }

        // Check if we actually have data to draw
        if (!visitedOrder || visitedOrder.length === 0) {
            return;
        }

        // If something weird happened and we went backwards
        if (visitedCount < lastCountRef.current) {
            layerGroupRef.current.clearLayers();
            lastCountRef.current = 0;
        }

        // Add only NEW nodes
        const start = lastCountRef.current;
        const end = visitedCount;

        if (start < end) {
            let drawn = 0;
            // Just iterate indices - no array copying!
            for (let i = start; i < end; i++) {
                 // Safety check: if our count is ahead of our data, stop.
                 // This handles the race condition where count updates before order.
                 if (i >= visitedOrder.length) break;

                 const id = visitedOrder[i];
                 const node = graph[id];
                 if (node) {
                     L.circleMarker([node.lat, node.lng], {
                         radius: 3,  // Slightly larger
                         color: "blue",
                         fillColor: "#0959d9ff", // Reverting to nice blue
                         fillOpacity: 1,
                         weight: 0,
                         interactive: false 
                     }).addTo(layerGroupRef.current);
                     drawn++;
                 }
            }
            lastCountRef.current = Math.min(end, visitedOrder.length);
        }
    }, [visitedCount, visitedOrder, graph, map]);
    
    // Cleanup on unmount
     useEffect(() => {
        return () => {
             if (layerGroupRef.current) {
                 layerGroupRef.current.remove();
             }
        };
     }, [map]);

    return null;
});

// 3. Path Layer - Renders when path changes
const PathLayer = memo(({ path, graph }) => {
    if (!path || path.length === 0) return null;
    
    // Draw edges for path
    const positions = path.map(id => {
        const n = graph[id];
        return n ? [n.lat, n.lng] : null;
    }).filter(p => p !== null);

    return (
        <Polyline
            positions={positions}
            pathOptions={{ color: 'yellow', weight: 5, opacity: 0.9 }}
        />
    );
});

// 4. Interaction Points (Source/Dest) - Always distinct
const ControlPoints = ({ source, destination, graph, radius, onNodeClick }) => {
    return (
        <>
             {/* Source */}
             {source && graph[source] && (
                 <>
                    <Marker
                        position={[graph[source].lat, graph[source].lng]}
                        icon={bluePin}
                        eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onNodeClick(source); }}}
                    >
                         <Popup>Source: {source}</Popup>
                    </Marker>
                    <Circle 
                        center={[graph[source].lat, graph[source].lng]}
                        radius={radius}
                        pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.05, weight: 1, dashArray: '5, 5' }}
                        interactive={false}
                    />
                 </>
             )}
             
             {/* Destination */}
             {destination && graph[destination] && (
                 <Marker
                    position={[graph[destination].lat, graph[destination].lng]}
                    icon={redPin}
                    eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onNodeClick(destination); }}}
                >
                     <Popup>Destination: {destination}</Popup>
                </Marker>
             )}
        </>
    );
};

// Helper to resize map when container dimension changes
const MapResizer = ({ isExpanded }) => {
  const map = useMap();
  
  useEffect(() => {
    // Wait for transition to finish roughly (or trigger immediately and repeatedly)
    // The layout transition is 500ms. We should check a few times or use ResizeObserver.
    // Ideally, ResizeObserver on container, but pure hook approach:
    const timeoutId = setTimeout(() => {
        map.invalidateSize();
    }, 550); // Just after transition

    // Also trigger immediately just in case
    map.invalidateSize();

    return () => clearTimeout(timeoutId);
  }, [map, isExpanded]);

  return null;
};

// 5. Auto Zoom - Fits bounds when path is set
const AutoZoom = ({ path, graph }) => {
    const map = useMap();

    useEffect(() => {
        if (!path || path.length === 0) return;

        const points = path.map(id => {
            const node = graph[id];
            return node ? [node.lat, node.lng] : null;
        }).filter(p => p !== null);

        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            try {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
            } catch (error) {
                console.error("Error in fitBounds:", error);
            }
        }
    }, [path, graph, map]);

    return null;
};

// 6. Map FlyTo - Programmatic navigation
const MapFlyTo = ({ targetLocation }) => {
    const map = useMap();
    useEffect(() => {
        if (targetLocation) {
            map.flyTo(targetLocation, 14, { duration: 2 });
        }
    }, [targetLocation, map]);
    return null;
};

const MapVisualizer = ({ 
  graph, 
  source, 
  destination, 
  path,
  zoomPath, 
  visitedOrder,
  visitedCount, 
  radius, 
  targetLocation, // New prop for city search
  isExpanded,
  onNodeClick, 
  onMapClick 
}) => {
  const center = [17.4474, 78.3762]; // Default center (Hyderabad approx)
  const zoom = 13;

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={true} 
      preferCanvas={true}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapResizer isExpanded={isExpanded} />
      <AutoZoom path={zoomPath || path} graph={graph} />
      <MapFlyTo targetLocation={targetLocation} />
      <MapEvents onMapClick={onMapClick} />

      <StaticEdges graph={graph} />
      <VisitedNodesLayer visitedOrder={visitedOrder} visitedCount={visitedCount} graph={graph} />
      <PathLayer path={path} graph={graph} />
      
      <ControlPoints 
        source={source} 
        destination={destination} 
        graph={graph} 
        radius={radius} 
        onNodeClick={onNodeClick} 
      />

    </MapContainer>
  );
};

export default MapVisualizer;
