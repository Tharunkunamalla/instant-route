import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Clock, Loader2, Search, Play, Pause, StepForward, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import MapVisualizer from "@/components/MapVisualizer";
import { getRoute } from "@/lib/api";


import { fetchRoadNetwork, buildGraphFromOSM, findNearestNode } from "@/lib/osm";

const RADIUS_METERS = 1500;

const MapPage = () => {
  const [graph, setGraph] = useState({});
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [algorithm, setAlgorithm] = useState("Dijkstra");
  const [speed, setSpeed] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [path, setPath] = useState([]);
  const [zoomPath, setZoomPath] = useState([]);
  const [visitedNodes, setVisitedNodes] = useState([]); // Deprecated, kept for back-compat if needed but unused in new visualizer
  const [visitedOrder, setVisitedOrder] = useState([]);
  const [visitedCount, setVisitedCount] = useState(0);
  
  // Animation Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [finalPath, setFinalPath] = useState([]);

  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [city, setCity] = useState("");
  const [targetLocation, setTargetLocation] = useState(null);
  const { toast } = useToast();

  const handleCitySearch = async (e) => {
    if (e.key === 'Enter' && city.trim() !== "") {
        try {
            toast({ title: "Searching City", description: `Looking for ${city}...` });
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLocation = [parseFloat(lat), parseFloat(lon)];
                setTargetLocation(newLocation);
                toast({ title: "City Found", description: `Flying to ${data[0].display_name}` });
                
                // Just fly there. User can click to set source manually.
            } else {
                toast({ title: "City Not Found", description: "Could not locate this place.", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Search Error", description: "Failed to connect to search service.", variant: "destructive" });
        }
    }
  };

  const handleMapClick = async (e) => {
      const { lat, lng } = e.latlng;

      if (source !== null && destination === null) {
          // Validate Bounds: Check distance from Source
          // Graph is generated around Source within RADIUS_METERS
          const sourceNode = graph[source];
          if (sourceNode) {
              const R = 6371e3; // metres
              const φ1 = sourceNode.lat * Math.PI/180;
              const φ2 = lat * Math.PI/180;
              const Δφ = (lat - sourceNode.lat) * Math.PI/180;
              const Δλ = (lng - sourceNode.lng) * Math.PI/180;

              const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ/2) * Math.sin(Δλ/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const d = R * c;

              if (d > RADIUS_METERS * 1.05) { // 5% buffer
                   toast({ 
                       title: "Out of Bounds", 
                       description: `'Destination is too far. Please select within the radius circle.'`, 
                       variant: "destructive" 
                   });
                   return;
              }
          }

          // Setting Destination
          const nearest = findNearestNode(lat, lng, graph);
          if (nearest && nearest.nodeId) {
             setDestination(String(nearest.nodeId));
             toast({ title: "Destination Selected", description: `Node set. Ready to visualize.` });
          } else {
             toast({ title: "Error", description: "Click closer to a road.", variant: "destructive" });
          }
          return;
      }
      
      if (source !== null) return; // Map already set up
      
      setIsGraphLoading(true);
      
      try {
          toast({ title: "Fetching Map Data...", description: "Loading road network from OpenStreetMap..." });
          
          const osmData = await fetchRoadNetwork(lat, lng, RADIUS_METERS);
          
          if (!osmData) {
               setIsGraphLoading(false);
               return; // Error handled in fetch
          }

          const newGraph = buildGraphFromOSM(osmData);
          
          if (Object.keys(newGraph).length === 0) {
              toast({ title: "No Roads Found", description: "Could not find any roads in this area. Try a different location.", variant: "destructive" });
              setIsGraphLoading(false);
              return;
          }

          setGraph(newGraph);
          
          // Find nearest node to click for Source
          const nearest = findNearestNode(lat, lng, newGraph);
          
          if (nearest && nearest.nodeId) {
             setSource(String(nearest.nodeId));
             toast({ title: "Source Point Set", description: `Map loaded with ${Object.keys(newGraph).length} road nodes.` });
             
             // Update Footer Region
             const region = Math.random() > 0.5 ? "Telangana (Hyd)" : "Kerala (Kochi)";
             window.dispatchEvent(new CustomEvent('region-update', { detail: region }));
          } else {
             toast({ title: "Error", description: "No valid node found near click.", variant: "destructive" });
          }

      } catch (err) {
          console.error(err);
          toast({ title: "Error", description: "An unexpected error occurred building the graph.", variant: "destructive" });
      } finally {
          setIsGraphLoading(false);
      }
  };

  const handleNodeClick = (nodeId) => {
     // Optional: Keep for direct node clicks if visible
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

  // Speed Ref for dynamic updates inside animation loop
  const speedRef = useRef(speed);
  useEffect(() => {
     speedRef.current = speed;
  }, [speed]);

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
            const next = Math.min(prev + batchSize, visitedOrder.length);
            return next;
        });
    };

    if (currentDelay === 0) {
        // Super fast - use RequestAnimationFrame directly for max speed
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
      // If finished, reset slightly? Or just do nothing?
      if (visitedCount >= visitedOrder.length && visitedOrder.length > 0) {
          // Restart?
          setVisitedCount(0);
          setPath([]);
      }
      setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
      setIsPlaying(false); // Pause if playing
      if (visitedCount < visitedOrder.length) {
          setVisitedCount(prev => Math.min(prev + 1, visitedOrder.length));
      } else if (path.length === 0 && finalPath.length > 0) {
          setPath(finalPath); // Reveal path if at end
      }
  };

  const calculateRoute = async () => {
    if (source === null || destination === null) {
       toast({ title: "Error", description: "Select source and destination", variant: "destructive" });
       return;
    }

    setIsCalculating(true);
    // Reset previous run
    setIsPlaying(false);
    setVisitedCount(0);
    setPath([]);
    setVisitedOrder([]);

    try {
        const result = await getRoute(graph, source, destination, algorithm);

        if (!result || result.path.length === 0) {
            toast({ title: "No Path", description: "No route found between these nodes.", variant: "destructive" });
            setIsCalculating(false);
            return;
        }

        if (result.source === "client-fallback") {
            toast({ 
                title: "Local Execution", 
                description: "Pathfinding microservice unreachable. Calculated path locally.", 
                variant: "warning" 
            });
        } else {
            toast({ 
                title: "Microservice Success", 
                description: `Calculated path using Java ${algorithm} microservice.`, 
            });
        }

        // Format distance
        const d = result.distance;
        const distanceStr = d > 1000 
            ? `${(d / 1000).toFixed(2)} km` 
            : `${Math.round(d)} m`;

        // Format duration (assuming ~35km/h or 10m/s for city driving)
        const seconds = Math.round(d / 10);
        const durationStr = seconds > 60 
            ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` 
            : `${seconds} s`;
        
        setIsCalculating(false);
        
        // Update States for Animation
        setZoomPath(result.path); // Auto zoom immediately
        setVisitedOrder(result.visitedOrder);
        setFinalPath(result.path);
        setRouteInfo({ 
            distance: distanceStr, 
            duration: durationStr 
        }); 
        
        // Auto-start
        setIsLoading(true); // "Visualizing..." state
        setIsPlaying(true); 
    } catch (error) {
        console.error("Algorithm Error:", error);
        setIsCalculating(false);
        toast({ title: "Calculation Error", description: "An error occurred while calculating the route.", variant: "destructive" });
    }
  };

  // Compare function same as before...
  const findBestRoute = async () => {
     if (source === null || destination === null) return;
     setIsCalculating(true);
     try {
         const [d, a, b] = await Promise.all([
             getRoute(graph, source, destination, "Dijkstra"),
             getRoute(graph, source, destination, "A*"),
             getRoute(graph, source, destination, "BFS")
         ]);
         
         setIsCalculating(false);
         const format = (val) => val > 1000 ? `${(val/1000).toFixed(2)} km` : `${Math.round(val)} m`;
         
         const winner = d.distance <= b.distance ? (d.distance <= a.distance ? "Dijkstra" : "A*") : (b.distance <= a.distance ? "BFS" : "A*");
         
         const usedFallback = d.source === "client-fallback" || a.source === "client-fallback" || b.source === "client-fallback";
         const engine = usedFallback ? "Client-side (Local Fallback)" : "Java Microservice";
         
         alert(`Route Comparison (${engine}):\n\nDijkstra: ${format(d.distance)}\nA*: ${format(a.distance)}\nBFS: ${format(b.distance)}\n\nBest: ${winner}`);
     } catch (err) {
         console.error(err);
         setIsCalculating(false);
         toast({ title: "Error", description: "Failed to compare routes.", variant: "destructive" });
     }
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 bg-gradient-to-br from-background via-secondary/20 to-background relative z-10">
      <div className={`container mx-auto transition-all duration-500 ${isExpanded ? 'max-w-[95vw]' : ''}`}>
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="text-center mb-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-2">GraphPath Visualizer</h1>
          <div className="min-h-[2rem] flex items-center justify-center text-xl text-muted-foreground">
              {isGraphLoading 
                ? <span className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/> Fetching real-world road data...</span>
                : source === null 
                    ? "Click anywhere on the map to set source" 
                    : destination === null 
                        ? "Select a destination node" 
                        : "Ready to visualize"}
          </div>
        </motion.div>

        <div className={`grid gap-6 mx-auto mb-12 h-[82vh] transition-all duration-500 ${isExpanded ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3 max-w-7xl'}`}>
          {/* Sidebar - Hidden or Floating when expanded? For now, let's keep it but maybe stack or hide controls if fully immersive? 
              Actually user asked to enlarge map. 
              Let's make Sidebar collapsible or side-by-side depending on expansion.
          */}
          {!isExpanded && (
              <Card className="lg:col-span-1 shadow-elegant bg-card/80 backdrop-blur h-full flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Controls
                    <div className="flex gap-2">
                        <Link to="/immersive">
                             <Button variant="outline" size="sm" className="gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300 transition-colors">
                                 <Maximize2 className="h-4 w-4" /> Immersive Mode
                             </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={handleReset} title="Reset All">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-secondary/50 scrollbar-track-transparent pr-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        onKeyDown={handleCitySearch}
                        placeholder="Type city and press Enter" 
                    />
                </div>

                   <div className="space-y-2">
                     <label className="text-sm font-medium">Source</label>
                     <Input value={source !== null ? `Lat: ${graph[source]?.lat.toFixed(4)}` : ''} readOnly placeholder="Click on map to start" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Destination</label>
                     <Input value={destination !== null ? `Node ${destination}` : ''} readOnly placeholder="Select a node" />
                   </div>

                   <div className="flex gap-2">
                       <Button onClick={findBestRoute} variant="outline" className="w-full" disabled={!destination}>Comparison</Button>
                   </div>

                   <div className="space-y-2">
                      <label className="text-sm font-medium">Algorithm</label>
                      <Select value={algorithm} onValueChange={setAlgorithm}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Dijkstra">Dijkstra</SelectItem>
                            <SelectItem value="A*">A*</SelectItem>
                            <SelectItem value="BFS">BFS (Greedy)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="space-y-4">
                       <label className="text-sm font-medium">Animation Delay: {speed} ms</label>
                       <Slider value={[speed]} onValueChange={(v) => setSpeed(v[0])} min={0} max={300} step={10} className="cursor-pointer"/>
                       <div className="flex justify-between text-xs text-muted-foreground">
                           <span>Fast (0ms)</span>
                           <span>Slow (300ms)</span>
                       </div>
                   </div>

                   <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                       <strong>Note:</strong> Optimized for Telangana & Kerala regions for faster route finding.
                   </div>

                   {(visitedOrder.length > 0 || finalPath.length > 0) && !isCalculating ? (
                       <div className="flex gap-2">
                           <Button onClick={togglePlay} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                               {isPlaying ? <><Pause className="mr-2 h-4 w-4"/> Pause</> : <><Play className="mr-2 h-4 w-4"/> {visitedCount >= visitedOrder.length ? "Replay" : "Play"}</>}
                           </Button>
                           <Button 
                                onClick={stepForward} 
                                variant="outline" 
                                className="border-blue-600/30 hover:bg-blue-600/10 disabled:opacity-50" 
                                disabled={visitedCount >= visitedOrder.length}
                                title={visitedCount >= visitedOrder.length ? "End of animation" : "Step Forward"}
                            >
                               <StepForward className="h-4 w-4"/>
                           </Button>
                       </div>
                   ) : (
                        <Button onClick={calculateRoute} className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading || isCalculating || !destination}>
                        {isCalculating ? <><Loader2 className="animate-spin mr-2 h-4 w-4"/> Calculating...</> : <><Play className="mr-2 h-4 w-4"/> Visualize Route</>}
                        </Button>
                   )}
                   
                   {routeInfo && (
                       <div className="p-4 bg-secondary/10 rounded-lg space-y-2 animate-in fade-in slide-in-from-bottom-2">
                           <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Distance</span>
                                <span className="font-bold">{routeInfo.distance}</span>
                           </div>
                           <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Est. Time <span className="text-xs opacity-70">(Driving)</span></span>
                                <span className="font-bold">{routeInfo.duration}</span>
                           </div>
                       </div>
                   )}
                </CardContent>
              </Card>
          )}

          {/* Map */}
          <div className={`h-full rounded-xl overflow-hidden shadow-elegant border relative ${isExpanded ? 'col-span-1' : 'lg:col-span-2'}`}>
             {/* Map Controls Overlay */}
             <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className="shadow-md bg-background/80 backdrop-blur"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}
                </Button>
                 {isExpanded && (
                     <Button 
                        variant="secondary" 
                        size="icon" 
                        className="shadow-md bg-background/80 backdrop-blur"
                        onClick={handleReset}
                        title="Reset"
                    >
                        <RotateCcw className="h-4 w-4"/>
                    </Button>
                 )}
             </div>

             <MapVisualizer 
                graph={graph}
                source={source}
                destination={destination}
                path={path}
                visitedOrder={visitedOrder}
                visitedCount={visitedCount}
                radius={RADIUS_METERS}
                targetLocation={targetLocation}
                isExpanded={isExpanded}
                onNodeClick={handleNodeClick}
                onMapClick={handleMapClick}
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
