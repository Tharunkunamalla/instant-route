import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Loader2, Play, Pause, StepForward, RotateCcw, Maximize2, Minimize2, Map as MapIcon, ArrowLeft, Navigation, Search } from "lucide-react";
import MapVisualizer from '@/components/MapVisualizer';
import { buildGraphFromOSM, fetchRoadNetwork, findNearestNode } from '@/lib/osm';
import { dijkstra } from '@/algorithms/dijkstra';
import { astar } from '@/algorithms/astar';
import { bfs } from '@/algorithms/bfs';
import { useToast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';

const RADIUS_METERS = 2500; // 2.5km radius for better performance

// Memoized Sidebar to prevent re-renders during animation
const ControlSidebar = React.memo(({ 
    isGraphLoading, 
    graph, 
    routeInfo, 
    algorithm, 
    setAlgorithm, 
    speed, 
    setSpeed, 
    source, 
    destination, 
    isLoading, 
    isCalculating, 
    calculateRoute, 

    // Playback Props
    isPlaying,
    togglePlay,
    stepForward,
    visitedCount,
    
    // Data Props
    visitedOrder,
    finalPath,

    handleReset,
    city,
    setCity,
    handleCitySearch
}) => {
    return (
      <aside className="w-[420px] h-full flex-shrink-0 bg-zinc-950/80 backdrop-blur-md border-r border-white/10 flex flex-col z-20 shadow-[10px_0_30px_-10px_rgba(0,0,0,0.5)]">
         
         {/* Header */}
         <div className="p-8 border-b border-white/5 bg-zinc-900/20">
             {/* Custom Scrollbar Styles for this component only */}
             <style>{`
                 .custom-scrollbar::-webkit-scrollbar {
                   width: 6px;
                 }
                 .custom-scrollbar::-webkit-scrollbar-track {
                   background: transparent;
                 }
                 .custom-scrollbar::-webkit-scrollbar-thumb {
                   background-color: rgba(255, 255, 255, 0.1); /* Subtle visibility */
                   border-radius: 20px;
                   transition: background-color 0.3s;
                 }
                 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                   background-color: rgba(255, 255, 255, 0.3); /* Brighter on hover */
                 }
             `}</style>
             <div className="flex items-center gap-4 mb-1">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
                    <MapIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        GraphPath
                    </h1>
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                        Pro Console
                    </p>
                </div>
             </div>
             <Link to="/map" className="inline-block mt-4 group">
                 <Button variant="link" className="p-0 h-auto text-xs text-zinc-500 group-hover:text-blue-400 transition-colors">
                    <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Standard View
                 </Button>
             </Link>
         </div>

         {/* Scrollable Content */}
         <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar">
             
             {/* Status Grid */}
             <div className="grid grid-cols-2 gap-3">
                 <div className="bg-zinc-900/40 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Status</span>
                     <div className="mt-2 flex items-center gap-2">
                         {isGraphLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 text-yellow-500 animate-spin"/> 
                                <span className="text-sm font-medium text-zinc-200">Loading...</span>
                            </>
                         ) : (
                            <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-medium text-zinc-200">Online</span>
                            </>
                         )}
                     </div>
                 </div>
                 <div className="bg-zinc-900/40 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nodes Loaded</span>
                     <div className="mt-2">
                         <span className="text-xl font-mono text-zinc-200 tracking-tight">{Object.keys(graph).length.toLocaleString()}</span>
                     </div>
                 </div>
             </div>
             
             {routeInfo && (
                <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-xl p-5 border border-blue-500/10 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block mb-1">Total Distance</span>
                            <span className="text-2xl font-bold text-white tracking-tight">{routeInfo.distance}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block mb-1">Est. Time</span>
                            <span className="text-lg font-medium text-white">{routeInfo.duration}</span>
                        </div>
                    </div>
                    <div className="w-full bg-blue-950/50 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>
             )}

             {/* Algorithm Selection */}
             <div className="space-y-4">
                 <div className="flex items-center justify-between">
                     <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Pathfinding Strategy</label>
                 </div>
                 <Select value={algorithm} onValueChange={setAlgorithm}>
                    <SelectTrigger className="bg-zinc-900/50 border-white/10 h-12 text-zinc-200 focus:ring-blue-500/20 hover:bg-zinc-900 transition-colors">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 shadow-2xl">
                        <SelectItem value="Dijkstra" className="py-3">Dijkstra's Algorithm</SelectItem>
                        <SelectItem value="A*" className="py-3">A* Search (Heuristic)</SelectItem>
                        <SelectItem value="BFS" className="py-3">Breadth-First Search</SelectItem>
                    </SelectContent>
                 </Select>
                 <div className="p-3 rounded-lg bg-zinc-900/30 border border-white/5 text-xs text-zinc-400 leading-relaxed">
                     {algorithm === 'Dijkstra' && "Guarantees the absolute shortest path by aggressively exploring all directions evenly. Computationally expensive."}
                     {algorithm === 'A*' && "Uses GPS heuristics to 'guess' the direction, prioritizing nodes closer to the destination. Fastest for road networks."}
                     {algorithm === 'BFS' && "Explores layer by layer. Ignores road lengths, just counts number of turns/intersections. Good for unweighted graphs."}
                 </div>
             </div>

             {/* Speed Control */}
             <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Visualization Speed</label>
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-white/5">{speed}ms delay</span>
                 </div>
                 <Slider 
                    value={[speed]} 
                    onValueChange={(v) => setSpeed(v[0])} 
                    min={0} 
                    max={300} 
                    step={10} 
                    className="cursor-pointer py-2"
                 />
                 <div className="flex justify-between text-[10px] text-zinc-600 font-bold tracking-widest">
                     <span>SUPERSONIC</span>
                     <span>WALKING PACE</span>
                 </div>
             </div>

              {/* Locations */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                   <div className="space-y-3">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Target Region</label>
                       <div className="relative group">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors pointer-events-none"/>
                           <Input 
                               value={city} 
                               onChange={(e) => setCity(e.target.value)} 
                               onKeyDown={handleCitySearch}
                               placeholder="Search City..." 
                               className="pl-10 h-11 bg-zinc-900/50 border-white/10 text-zinc-300 placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all hover:bg-zinc-900"
                           />
                       </div>
                   </div>

                   <div className="space-y-3">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Coordinates</label>
                       <div className="space-y-2">
                           {/* Source Input */}
                           <div className="group relative transition-all duration-300 hover:translate-x-1">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 flex justify-center">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/10"></div>
                                </div>
                                <Input 
                                   value={source !== null ? `Lat: ${graph[source]?.lat.toFixed(4)}` : ''} 
                                   readOnly 
                                   placeholder="Set Start Point" 
                                   className="pl-10 h-10 bg-transparent border-none text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 cursor-default"
                                />
                                {source === null && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 italic">Click map</span>}
                           </div>
                           
                           {/* Divider Line */}
                           <div className="w-px h-4 bg-gradient-to-b from-blue-500 to-red-500 ml-4 opacity-30"></div>

                           {/* Destination Input */}
                           <div className="group relative transition-all duration-300 hover:translate-x-1">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 flex justify-center">
                                    <div className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-500/10"></div>
                                </div>
                                <Input 
                                   value={destination !== null ? `Node: ${destination}` : ''} 
                                   readOnly 
                                   placeholder="Set Destination" 
                                   className="pl-10 h-10 bg-transparent border-none text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 cursor-default"
                                />
                                {destination === null && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 italic">Click map</span>}
                           </div>
                       </div>
                   </div>
              </div>

         </div>

         {/* Footer Actions */}
         <div className="p-6 bg-zinc-900/30 border-t border-white/5 backdrop-blur-md space-y-4">
             {(visitedOrder.length > 0 || finalPath.length > 0) && !isCalculating ? (
                 <div className="flex gap-3">
                     <Button 
                        onClick={togglePlay} 
                        className="flex-1 h-12 text-sm font-semibold tracking-wide bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                     >
                        {isPlaying ? (
                             <><Pause className="mr-2 h-4 w-4 fill-current"/> PAUSE</>
                        ) : (
                             <><Play className="mr-2 h-4 w-4 fill-current"/> {visitedCount >= visitedOrder.length ? "REPLAY" : "RESUME"}</>
                        )}
                     </Button>
                     <Button 
                        onClick={stepForward} 
                        className="h-12 w-14 bg-zinc-800 border border-white/10 hover:bg-zinc-700 hover:border-white/20 transition-all text-zinc-400 hover:text-white"
                        title={visitedCount >= visitedOrder.length ? "Animation Finished" : "Step Forward"}
                        disabled={visitedCount >= visitedOrder.length}
                     >
                        <StepForward className="h-5 w-5"/>
                     </Button>
                 </div>
             ) : (
                 <Button 
                    onClick={calculateRoute} 
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 text-sm font-semibold tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading || isCalculating || !destination}
                 >
                    {isCalculating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/> CALCULATING PROBABILITY...
                        </>
                    ) : (
                        <>
                            <Navigation className="mr-2 h-4 w-4 fill-current"/> INITIATE SEQUENCE
                        </>
                    )}
                 </Button>
             )}
             
             <Button 
                variant="ghost" 
                onClick={handleReset} 
                className="w-full text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 uppercase tracking-widest"
             >
                Reset Systems
             </Button>
         </div>

      </aside>
    )
}, (prev, next) => {
    // Only re-render if key props change. 
    // This is optional optimization but good for "Immersive" feel to avoid jitter.
    // Simplifying to shallow compare logic or just true if performance is fine.
    // Actually, just returning false usually safe.
    // If we want to be strict:
    /*
    return prev.visitedCount === next.visitedCount && 
           prev.isPlaying === next.isPlaying &&
           prev.isCalculating === next.isCalculating &&
           prev.graph === next.graph;
           ...
    */
    return false; // Always re-render on props change is safer for now unless lagging
});

const ImmersiveMapPage = () => {
  const [graph, setGraph] = useState({});
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [algorithm, setAlgorithm] = useState("Dijkstra");
  const [path, setPath] = useState([]);
  const [zoomPath, setZoomPath] = useState([]); // Added missing state
  const [visitedNodes, setVisitedNodes] = useState([]); // Deprecated in favor of visitedOrder/visitedCount
  const [visitedOrder, setVisitedOrder] = useState([]);
  const [visitedCount, setVisitedCount] = useState(0);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [speed, setSpeed] = useState(50);

  const [routeInfo, setRouteInfo] = useState(null);
  const [city, setCity] = useState("");
  const [targetLocation, setTargetLocation] = useState(null);
  const { toast } = useToast();

  const [finalPath, setFinalPath] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCitySearch = async (e) => {
    if (e.key === 'Enter' && city.trim() !== "") {
        try {
            toast({ title: "Searching Region", description: `Looking for ${city}...` });
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLocation = [parseFloat(lat), parseFloat(lon)];
                setTargetLocation(newLocation);
                toast({ title: "Region Found", description: `Flying to ${data[0].display_name}` });
            } else {
                toast({ title: "Region Not Found", description: "Could not locate this place.", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Search Error", description: "Failed to connect to search service.", variant: "destructive" });
        }
    }
  };

  const loadGraph = async (lat, lng) => {
      setIsGraphLoading(true);
      try {
          toast({ title: "Loading Region", description: "Fetching road network..." });
          const osmData = await fetchRoadNetwork(lat, lng, RADIUS_METERS);
          if (!osmData) { setIsGraphLoading(false); return null; }

          const newGraph = buildGraphFromOSM(osmData);
          if (Object.keys(newGraph).length === 0) {
              setIsGraphLoading(false);
              return null;
          }
          setGraph(newGraph);
          window.dispatchEvent(new CustomEvent('region-update', { detail: "Telangana (Hyd)" }));
          return newGraph;
      } catch (err) {
          console.error(err);
          return null;
      } finally {
          setIsGraphLoading(false);
      }
  };

  // Load Map Data on Mount
  useEffect(() => {
    // Listen for custom region updates if we want to sync
    const handleRegionUpdate = (e) => {
        // Just purely for visual feedback if needed
    };
    window.addEventListener('region-update', handleRegionUpdate);
    return () => window.removeEventListener('region-update', handleRegionUpdate);
  }, []);

  const handleMapClick = async (arg1, arg2) => {
      let lat, lng;
      if (arg1 && arg1.latlng) {
          lat = arg1.latlng.lat;
          lng = arg1.latlng.lng;
      } else {
          lat = arg1;
          lng = arg2;
      }

      if (source !== null && destination !== null) return; 

      let currentGraph = graph;

      // If graph is empty, load it first
      if (!currentGraph || Object.keys(currentGraph).length === 0) {
           const newGraph = await loadGraph(lat, lng);
           if (!newGraph) return;
           currentGraph = newGraph;
      } else {
          // Check bounds logic
          const centerNode = Object.values(currentGraph)[0]; 
          const dist = Math.sqrt(Math.pow(lat - centerNode.lat, 2) + Math.pow(lng - centerNode.lng, 2));
           if (dist > 0.05) { 
                toast({ 
                    title: "Out of Bounds", 
                    description: 'Please click within the loaded active region.', 
                    variant: "destructive" 
                });
                return;
           }
      }

      // Setting Source or Destination
      const nearest = findNearestNode(lat, lng, currentGraph);
      if (nearest && nearest.nodeId) {
         if (source === null) {
             setSource(String(nearest.nodeId));
             toast({ title: "Source Set", description: "Now select a destination." });
         } else {
             setDestination(String(nearest.nodeId));
             toast({ title: "Destination Set", description: "Ready to visualize." });
         }
      }
  };

  const handleReset = () => {
    setGraph({});
    setSource(null);
    setDestination(null);
    setPath([]);
    setFinalPath([]);
    setZoomPath([]);
    setVisitedNodes([]);
    setVisitedOrder([]);
    setVisitedCount(0);
    setIsPlaying(false);
    setIsLoading(false);
    setRouteInfo(null);
    toast({ title: "Reset", description: "Map cleared. Click to set new source." });
  };

  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Main Animation Loop
  useEffect(() => {
    if (!isPlaying) return;

    if (visitedCount >= visitedOrder.length) {
        setIsPlaying(false);
        setIsLoading(false);
        setPath(finalPath); // Show yellow path
        return;
    }

    const currentDelay = speedRef.current;
    let timeoutId;
    let animationFrameId;

    const step = () => {
        setVisitedCount(prev => {
            const batchSize = currentDelay === 0 ? 100 : (currentDelay <= 5 ? 10 : 1);
            return Math.min(prev + batchSize, visitedOrder.length);
        });
    };

    if (currentDelay === 0) {
        animationFrameId = requestAnimationFrame(step);
    } else {
        timeoutId = setTimeout(step, currentDelay);
    }

    return () => {
        clearTimeout(timeoutId);
        cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, visitedCount, visitedOrder.length, finalPath]);

  const togglePlay = () => {
      if (visitedCount >= visitedOrder.length && visitedOrder.length > 0) {
          setVisitedCount(0); // Replay
          setPath([]);
      }
      setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
      setIsPlaying(false);
      if (visitedCount < visitedOrder.length) {
          setVisitedCount(prev => Math.min(prev + 1, visitedOrder.length));
      }
  };

  const calculateRoute = () => {
    if (source === null || destination === null) return;

    setIsCalculating(true);
    setIsPlaying(false);
    setVisitedCount(0);
    setPath([]);
    setVisitedOrder([]);

    // Use setTimeout to allow UI to render "Calculating..." state before heavy operation
    setTimeout(() => {
        try {
            let result;
            if (algorithm === "Dijkstra") result = dijkstra(graph, String(source), String(destination));
            else if (algorithm === "A*") result = astar(graph, String(source), String(destination));
            else result = bfs(graph, String(source), String(destination));

            if (!result || result.path.length === 0) {
                toast({ title: "No Path", description: "No route found.", variant: "destructive" });
                setIsCalculating(false);
                return;
            }

            const d = result.distance;
            const distanceStr = d > 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;
            const seconds = Math.round(d / 10);
            const durationStr = seconds > 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;

            setIsCalculating(false);
            setZoomPath(result.path); // Zoom immediately
            
            // Setup Animation
            setVisitedOrder(result.visitedOrder);
            setFinalPath(result.path);
            setRouteInfo({ distance: distanceStr, duration: durationStr });
            
            // Auto-Start
            setIsLoading(true);
            setIsPlaying(true);
        } catch (error) {
            console.error("Algorithm Error:", error);
            setIsCalculating(false);
            toast({ title: "Calculation Error", description: "An error occurred while calculating the route.", variant: "destructive" });
        }
    }, 100);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      
      <ControlSidebar
        isGraphLoading={isGraphLoading}
        graph={graph}
        routeInfo={routeInfo}
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
        speed={speed}
        setSpeed={setSpeed}
        source={source}
        destination={destination}
        isLoading={isLoading}
        isCalculating={isCalculating}
        calculateRoute={calculateRoute}
        
        // New Props
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        stepForward={stepForward}
        visitedOrder={visitedOrder}
        visitedCount={visitedCount}
        finalPath={finalPath}

        handleReset={handleReset}
        city={city}
        setCity={setCity}
        handleCitySearch={handleCitySearch}
      />

      {/* Main Map Area */}
      <main className="flex-1 relative h-full bg-zinc-900">
          <MapVisualizer 
              graph={graph}
              source={source}
              destination={destination}
              path={path}
              zoomPath={zoomPath}
              visitedOrder={visitedOrder}
              visitedCount={visitedCount}
              radius={RADIUS_METERS}
              targetLocation={targetLocation}
              isExpanded={true} 
              onNodeClick={() => {}} // handled via map click for source/dest mainly
              onMapClick={handleMapClick}
          />
          
          {/* Legend Overlay */}
          <div className="absolute bottom-8 right-8 bg-zinc-950/80 backdrop-blur p-4 rounded-xl border border-zinc-800 shadow-2xl z-[500] pointer-events-none">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Legend</h4>
                <div className="space-y-2 text-sm text-zinc-300">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400"></span>
                        <span>Start Point</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 border border-red-400"></span>
                        <span>Destination</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-1 bg-yellow-400"></span>
                        <span>Optimal Path</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/50"></span>
                        <span>Explored</span>
                    </div>
                </div>
          </div>
      </main>

    </div>
  );
};

export default ImmersiveMapPage;
