import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Users, Share2, Copy, Check, Compass, 
  Footprints, Wifi, WifiOff, AlertCircle, RefreshCw, Loader2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getDistance, fetchRoadNetwork, buildGraphFromOSM, findNearestNode } from "@/lib/osm";
import { getRoute } from "@/lib/api";

// Fix standard Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom glowing pin SVG icons
const createGlowPin = (color, label) => L.divIcon({
  className: "custom-glow-pin",
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      <div style="
        background-color: ${color}; 
        width: 34px; 
        height: 34px; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        display: flex; 
        align-items: center; 
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 0 10px ${color}88, 0 4px 6px rgba(0,0,0,0.3);
      ">
        <div style="
          transform: rotate(45deg); 
          color: white; 
          font-weight: bold; 
          font-size: 11px;
        ">
          ${label.substring(0, 2).toUpperCase()}
        </div>
      </div>
      <div style="
        background: rgba(15, 23, 42, 0.85); 
        color: white; 
        padding: 2px 6px; 
        border-radius: 4px; 
        font-size: 10px; 
        font-weight: 600; 
        white-space: nowrap; 
        margin-top: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.1);
      ">
        ${label}
      </div>
    </div>
  `,
  iconSize: [60, 60],
  iconAnchor: [30, 45],
  popupAnchor: [0, -40]
});

// Component to dynamically fit map to contain all active markers
const FitMapBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const validPoints = markers
      .filter(m => m.lat && m.lng)
      .map(m => [m.lat, m.lng]);

    if (validPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      } catch (err) {
        console.error("Fit bounds error:", err);
      }
    }
  }, [markers, map]);
  return null;
};

const LiveShare = () => {
  const { toast } = useToast();
  
  // App States
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem("live_share_username");
    if (saved) return saved;
    return `Explorer_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [roomCode, setRoomCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentRoom, setCurrentRoom] = useState("");
  const [myUserId, setMyUserId] = useState("");
  const [copied, setCopied] = useState(false);

  // Position & Geolocation States
  const [myLocation, setMyLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Other Members State
  // Array of { userId, username, lat, lng }
  const [members, setMembers] = useState([]);
  
  // Pathfinding integration states
  const [routingFriendId, setRoutingFriendId] = useState(null);
  const [activeRoutePath, setActiveRoutePath] = useState(null);
  const [activeRouteInfo, setActiveRouteInfo] = useState(null);

  // Refs
  const wsRef = useRef(null);
  const geoWatchIdRef = useRef(null);

  // Save username to local storage on change
  useEffect(() => {
    localStorage.setItem("live_share_username", username);
  }, [username]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, []);

  // Connect to WebSocket and initiate Geolocation
  const connectSession = (targetRoom = "") => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a name before sharing location.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    setGeoError(null);

    // 1. Start geolocation tracking
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setIsConnecting(false);
      toast({
        title: "Browser Error",
        description: "Your browser does not support geolocation.",
        variant: "destructive"
      });
      return;
    }

    // Get initial position first to avoid joining empty
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMyLocation(coords);
        
        // Setup watcher for continuous updates
        startGeoTracking();

        // 2. Connect to WebSocket
        initWebSocket(coords, targetRoom);
      },
      (error) => {
        console.error("Geo error:", error);
        let errorMsg = "Please allow location access to share your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Please enable location permissions in your browser settings.";
        }
        setGeoError(errorMsg);
        setIsConnecting(false);
        toast({
          title: "Location Access Required",
          description: errorMsg,
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startGeoTracking = () => {
    if (geoWatchIdRef.current) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
    }
    
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const updatedCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMyLocation(updatedCoords);

        // Send updated location to WebSocket server if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "update-location",
            lat: updatedCoords.lat,
            lng: updatedCoords.lng
          }));
        }
      },
      (err) => {
        console.error("Continuous geo watch error:", err);
      },
      { enableHighAccuracy: true, distanceFilter: 2 } // Update on 2 meter change
    );
  };

  const initWebSocket = (initialCoords, targetRoom) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    let wsUrl = import.meta.env.VITE_WS_API_URL;
    
    if (!wsUrl) {
      const osmApiUrl = import.meta.env.VITE_OSM_API_URL || "";
      if (osmApiUrl && (osmApiUrl.startsWith("http://") || osmApiUrl.startsWith("https://"))) {
        // Replace http/https protocol with ws/wss protocol
        wsUrl = osmApiUrl.replace(/^http/, "ws") + "/ws";
      } else {
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.host;
        wsUrl = `${wsProto}//${wsHost}/ws`;
      }
    }

    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected.");
      // Join/Create room
      ws.send(JSON.stringify({
        type: "join",
        username,
        sessionId: targetRoom || undefined,
        lat: initialCoords.lat,
        lng: initialCoords.lng
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "joined":
            setIsConnected(true);
            setIsConnecting(false);
            setCurrentRoom(data.sessionId);
            setMyUserId(data.userId);
            // Members inside this room (excluding me)
            setMembers(data.members.filter(m => m.userId !== data.userId));
            
            toast({
              title: "Room Connected!",
              description: `Successfully joined room ${data.sessionId} as ${username}.`
            });
            break;

          case "member-joined":
            // Alert user about new joiner
            toast({
              title: "Friend Joined!",
              description: `${data.member.username} entered the room.`
            });
            setMembers(prev => {
              // Avoid duplicates
              const filtered = prev.filter(m => m.userId !== data.member.userId);
              return [...filtered, data.member];
            });
            break;

          case "location-updated":
            // Update coordinates of specific user
            setMembers(prev => prev.map(m => {
              if (m.userId === data.userId) {
                return { ...m, lat: data.lat, lng: data.lng };
              }
              return m;
            }));
            break;

          case "member-left":
            setMembers(prev => {
              const leavingMember = prev.find(m => m.userId === data.userId);
              if (leavingMember) {
                toast({
                  title: "Friend Left",
                  description: `${leavingMember.username} left the room.`
                });
              }
              return prev.filter(m => m.userId !== data.userId);
            });
            
            // Clean up routing path if related to this friend
            setRoutingFriendId(current => {
              if (current === data.userId) {
                setActiveRoutePath(null);
                setActiveRouteInfo(null);
                return null;
              }
              return current;
            });
            break;

          default:
            console.log("Unhandled WS message:", data);
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected:", event.reason);
      setIsConnected(false);
      setIsConnecting(false);
      setCurrentRoom("");
      setMembers([]);
      setActiveRoutePath(null);
      setActiveRouteInfo(null);
      setRoutingFriendId(null);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsConnecting(false);
      toast({
        title: "Connection Error",
        description: "Could not establish real-time link. Please try again.",
        variant: "destructive"
      });
    };
  };

  const disconnectSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (geoWatchIdRef.current) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
    setIsConnected(false);
    setCurrentRoom("");
    setMembers([]);
    setActiveRoutePath(null);
    setActiveRouteInfo(null);
    setRoutingFriendId(null);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom);
    setCopied(true);
    toast({
      title: "Code Copied!",
      description: `Room code ${currentRoom} copied to clipboard.`
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = () => {
    connectSession();
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      toast({
        title: "Room code required",
        description: "Please enter a code to join.",
        variant: "destructive"
      });
      return;
    }
    connectSession(roomCode.toUpperCase().trim());
  };

  // Find exact street routes using Java pathfinding microservice
  const calculateWalkingRoute = async (friend) => {
    if (!myLocation || !friend.lat || !friend.lng) return;

    setRoutingFriendId(friend.userId);
    setActiveRoutePath(null);
    setActiveRouteInfo(null);

    toast({
      title: "Loading street routing...",
      description: `Downloading street intersections between you and ${friend.username}.`
    });

    try {
      // Calculate midpoint coordinates to center bounding box query
      const midLat = (myLocation.lat + friend.lat) / 2;
      const midLng = (myLocation.lng + friend.lng) / 2;

      // Determine appropriate search radius based on distance + padding
      const distanceBetween = getDistance(myLocation.lat, myLocation.lng, friend.lat, friend.lng);
      
      // Radius should be at least 1500 meters and cover at least half of distance + 20% buffer
      const searchRadius = Math.max(1500, Math.min(5000, Math.round((distanceBetween / 2) * 1.3)));

      console.log(`[Routing] Fetching map around ${midLat}, ${midLng} with radius ${searchRadius}m`);
      const osmData = await fetchRoadNetwork(midLat, midLng, searchRadius);

      if (!osmData) {
        toast({
          title: "Map data failed",
          description: "Could not fetch street graph data from OpenStreetMap mirrors.",
          variant: "destructive"
        });
        setRoutingFriendId(null);
        return;
      }

      const streetGraph = buildGraphFromOSM(osmData);
      
      if (!streetGraph || Object.keys(streetGraph).length === 0) {
        toast({
          title: "Routing error",
          description: "No street graphs found between your locations.",
          variant: "destructive"
        });
        setRoutingFriendId(null);
        return;
      }

      // Map lat-lngs to nearest node IDs
      const nearestMe = findNearestNode(myLocation.lat, myLocation.lng, streetGraph);
      const nearestFriend = findNearestNode(friend.lat, friend.lng, streetGraph);

      if (!nearestMe.nodeId || !nearestFriend.nodeId) {
        toast({
          title: "Node mapping failed",
          description: "Failed to map coordinates to OpenStreetMap network intersections.",
          variant: "destructive"
        });
        setRoutingFriendId(null);
        return;
      }

      console.log(`[Routing] Pathfinding from node ${nearestMe.nodeId} to ${nearestFriend.nodeId}`);
      // Query path using A* (best for spatial distance pathfinding)
      const result = await getRoute(streetGraph, nearestMe.nodeId, nearestFriend.nodeId, "A*");

      if (!result || !result.path || result.path.length === 0) {
        toast({
          title: "Route not found",
          description: "Could not establish a street walking connection between you and your friend.",
          variant: "destructive"
        });
        setRoutingFriendId(null);
        return;
      }

      // Build path positions array
      const positions = result.path
        .map(id => {
          const node = streetGraph[id] || streetGraph[Number(id)];
          return node ? [Number(node.lat), Number(node.lng)] : null;
        })
        .filter(p => p !== null);

      // Format distance
      const streetDist = result.distance;
      const streetDistanceStr = streetDist > 1000 
          ? `${(streetDist / 1000).toFixed(2)} km` 
          : `${Math.round(streetDist)} m`;

      // Est time based on walking speed (approx 1.4 m/s or 5 km/h)
      const walkingSeconds = Math.round(streetDist / 1.4);
      const walkingTimeStr = walkingSeconds > 60 
          ? `${Math.floor(walkingSeconds / 60)} min` 
          : `${walkingSeconds} s`;

      setActiveRoutePath(positions);
      setActiveRouteInfo({
        distance: streetDistanceStr,
        duration: walkingTimeStr,
        friendName: friend.username,
        type: result.source === "client-fallback" ? "Local calculation" : "Java Microservice A*"
      });

      toast({
        title: "Route Calculated!",
        description: `Walking distance is ${streetDistanceStr}. Route overlay drawn on map.`
      });
    } catch (err) {
      console.error("Calculated route error:", err);
      toast({
        title: "Calculated route failed",
        description: "An unexpected error occurred during path calculations.",
        variant: "destructive"
      });
    } finally {
      setRoutingFriendId(null);
    }
  };

  // Helper to format straight line distance
  const formatStraightDistance = (friend) => {
    if (!myLocation || !friend.lat || !friend.lng) return "Unknown";
    // Distance in meters
    const dist = getDistance(myLocation.lat, myLocation.lng, friend.lat, friend.lng);
    if (dist > 1000) {
      return `${(dist / 1000).toFixed(2)} km`;
    }
    return `${Math.round(dist)} m`;
  };

  // Map markers collection for fit bounds
  const mapMarkers = [
    ...(myLocation ? [{ ...myLocation, label: "Me (You)", color: "#3b82f6" }] : []),
    ...members.map(m => ({ ...m, label: m.username, color: "#ef4444" }))
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-gradient-to-br from-background via-secondary/15 to-background text-foreground">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 text-primary rounded-full mb-3">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Live Location Sharing</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Connect securely via WebSockets, track friends' movements, and calculate optimal street routes in real-time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[72vh] min-h-[500px]">
          {/* Controls Sidebar (Left) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
            <AnimatePresence mode="wait">
              {!isConnected ? (
                /* JOIN/CREATE PANEL */
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="flex flex-col h-full"
                >
                  <Card className="shadow-elegant border-border/50 bg-card/70 backdrop-blur-md flex-1 flex flex-col justify-between p-2">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Setup Connection
                      </CardTitle>
                      <CardDescription>Enter details to start sharing coordinates</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1 pr-2 overflow-y-auto">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-wide text-muted-foreground">Your Username</label>
                        <div className="relative">
                          <Input 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="bg-background/80"
                            disabled={isConnecting}
                          />
                        </div>
                      </div>

                      {geoError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-start gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{geoError}</span>
                        </div>
                      )}

                      {/* Create Room Option */}
                      <div className="pt-2 border-t border-border/50">
                        <h3 className="text-sm font-semibold mb-2">Option 1: Host a Room</h3>
                        <Button 
                          onClick={handleCreateRoom} 
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Fetching location...</span>
                          ) : (
                            "Create Live Room"
                          )}
                        </Button>
                      </div>

                      {/* Join Room Option */}
                      <div className="pt-2 border-t border-border/50">
                        <h3 className="text-sm font-semibold mb-2">Option 2: Join Existing Room</h3>
                        <form onSubmit={handleJoinRoom} className="space-y-2">
                          <Input 
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            placeholder="Enter Room Code (LIV-XXXXX)"
                            className="uppercase bg-background/80"
                            disabled={isConnecting}
                          />
                          <Button 
                            type="submit" 
                            variant="secondary" 
                            className="w-full hover:bg-secondary/80 font-medium"
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</span>
                            ) : (
                              "Join Room"
                            )}
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                /* LIVE SESSION PANEL */
                <motion.div
                  key="session"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="flex flex-col h-full"
                >
                  <Card className="shadow-elegant border-border/50 bg-card/70 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="pb-4 border-b border-border/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                            <Wifi className="w-5 h-5 text-emerald-500 animate-pulse" /> Live Sharing
                          </CardTitle>
                          <CardDescription className="text-xs">Connected Room</CardDescription>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={disconnectSession}
                          className="h-8 text-xs font-semibold px-3"
                        >
                          Disconnect
                        </Button>
                      </div>

                      {/* Shareable Code Info */}
                      <div className="mt-4 p-3 bg-secondary/30 rounded-lg flex items-center justify-between border border-border/40">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Room Code</span>
                          <span className="text-md font-extrabold font-mono tracking-wider">{currentRoom}</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={copyRoomCode} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardHeader>

                    {/* Active friends list */}
                    <CardContent className="flex-1 overflow-y-auto min-h-0 py-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-secondary/50 scrollbar-track-transparent">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Friends in Room ({members.length})
                      </h3>

                      {members.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg border-border/40 p-4">
                          <p className="text-sm font-semibold">Waiting for friends...</p>
                          <p className="text-xs mt-1">Copy and share the room code above with friends so they can join you.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {members.map((friend) => (
                            <div 
                              key={friend.userId}
                              className="p-3.5 bg-background/50 border border-border/30 rounded-lg space-y-2 hover:border-primary/20 transition-all shadow-sm"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                  <span className="font-bold text-sm">{friend.username}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {friend.lat ? "Active" : "Locating..."}
                                </span>
                              </div>

                              {friend.lat && friend.lng && (
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Distance:</span>
                                    <span className="font-semibold text-foreground">
                                      {formatStraightDistance(friend)}
                                    </span>
                                  </div>

                                  {/* Route calculation button */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => calculateWalkingRoute(friend)}
                                    disabled={routingFriendId !== null}
                                    className="w-full text-xs font-semibold h-8 border-primary/20 hover:bg-primary/5 flex items-center justify-center gap-1"
                                  >
                                    {routingFriendId === friend.userId ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin text-primary" /> Calculating...
                                      </>
                                    ) : (
                                      <>
                                        <Footprints className="w-3.5 h-3.5 text-primary" /> Find Street Route
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display active routing info */}
                      {activeRouteInfo && (
                        <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-300 rounded-lg space-y-1.5 animate-in slide-in-from-bottom-3 duration-300">
                          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Footprints className="w-3.5 h-3.5" /> Street Path Details
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] opacity-70">Walking Distance</span>
                              <span className="font-extrabold text-sm text-foreground">{activeRouteInfo.distance}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] opacity-70">Est. Walk Time</span>
                              <span className="font-extrabold text-sm text-foreground">{activeRouteInfo.duration}</span>
                            </div>
                          </div>
                          <div className="text-[9px] opacity-70 pt-1.5 border-t border-blue-500/20">
                            Path calculated via: {activeRouteInfo.type} to {activeRouteInfo.friendName}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Map (Right) */}
          <div className="lg:col-span-8 h-full rounded-2xl overflow-hidden shadow-elegant border border-border/50 relative bg-secondary/10">
            {myLocation ? (
              <MapContainer 
                center={[myLocation.lat, myLocation.lng]} 
                zoom={14} 
                scrollWheelZoom={true} 
                preferCanvas={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Fit bounds helper */}
                <FitMapBounds markers={mapMarkers} />

                {/* My Marker */}
                <Marker 
                  position={[myLocation.lat, myLocation.lng]}
                  icon={createGlowPin("#3b82f6", "Me (You)")}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold">My Location</p>
                      <p className="text-muted-foreground font-mono">Lat: {myLocation.lat.toFixed(5)}, Lng: {myLocation.lng.toFixed(5)}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Friends' Markers */}
                {members
                  .filter(m => m.lat && m.lng)
                  .map(m => (
                    <Marker 
                      key={m.userId}
                      position={[m.lat, m.lng]}
                      icon={createGlowPin("#ef4444", m.username)}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p className="font-bold">{m.username}</p>
                          <p className="text-muted-foreground font-mono">Lat: {m.lat.toFixed(5)}, Lng: {m.lng.toFixed(5)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Straight line connections (dashed) */}
                {members
                  .filter(m => m.lat && m.lng)
                  .map(m => (
                    <Polyline
                      key={`line-${m.userId}`}
                      positions={[
                        [myLocation.lat, myLocation.lng],
                        [m.lat, m.lng]
                      ]}
                      pathOptions={{
                        color: "#ef4444",
                        weight: 2,
                        dashArray: "6, 8",
                        opacity: 0.6
                      }}
                    />
                  ))}

                {/* Active pathfinding routing path */}
                {activeRoutePath && (
                  <Polyline 
                    positions={activeRoutePath}
                    pathOptions={{
                      color: "#3b82f6", // Nice bright blue
                      weight: 5.5,
                      opacity: 0.9,
                      lineCap: "round",
                      lineJoin: "round"
                    }}
                  />
                )}
              </MapContainer>
            ) : (
              /* EMPTY MAP / NO LOCATION LOADED PLACEHOLDER */
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-card/20 backdrop-blur-sm text-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut"
                  }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"
                >
                  <MapPin className="w-8 h-8" />
                </motion.div>
                <h3 className="font-bold text-lg">Location Sharing Offline</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  Start or join a sharing room in the sidebar to enable live GPS tracking and activate the map.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveShare;
