import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Activity, Clock, Layers, Navigation, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const fetchAnalytics = async () => {
  const response = await fetch('/api/analytics');
  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }
  return response.json();
};

const Analytics = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['pathfinding-analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-background">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">Loading telemetry analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-background">
        <Card className="max-w-md mx-auto border-destructive/30 shadow-lg shadow-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              Telemetry Error
            </CardTitle>
            <CardDescription>
              We encountered an issue fetching metrics from the analytics broker.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {error.message}
            </p>
            <button 
              onClick={() => refetch()} 
              className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded font-medium transition"
            >
              Retry Connection
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process data for charts
  const rawAlgorithms = data?.algorithms || {};
  
  // Transform to Recharts-compatible arrays
  const chartData = Object.keys(rawAlgorithms).map(key => {
    const item = rawAlgorithms[key];
    const avgTime = item.runs > 0 ? parseFloat((item.totalTimeMs / item.runs).toFixed(2)) : 0;
    const avgNodes = item.runs > 0 ? Math.round(item.totalNodesExplored / item.runs) : 0;
    
    // User-friendly names
    let displayName = key;
    if (key === "AStar") displayName = "A*";
    else if (key === "BidirectionalDijkstra") displayName = "Bidir Dijkstra";
    else if (key === "BidirectionalAStar") displayName = "Bidir A*";

    return {
      name: displayName,
      runs: item.runs,
      avgTimeMs: avgTime,
      avgNodesExplored: avgNodes,
    };
  }).filter(item => item.runs > 0 || item.name !== ""); // only show active algorithms

  // Fallback to mock/zero data if no runs have occurred
  const hasRuns = data?.totalRuns > 0;
  
  const pieData = chartData.map((item, idx) => ({
    name: item.name,
    value: item.runs,
    color: COLORS[idx % COLORS.length]
  }));

  // Calculations for cards
  const totalRuns = data?.totalRuns || 0;
  
  let bestLatencyAlgo = "N/A";
  let bestNodesAlgo = "N/A";
  
  if (hasRuns) {
    const activeAlgos = chartData.filter(c => c.runs > 0);
    if (activeAlgos.length > 0) {
      const sortedByTime = [...activeAlgos].sort((a, b) => a.avgTimeMs - b.avgTimeMs);
      const sortedByNodes = [...activeAlgos].sort((a, b) => a.avgNodesExplored - b.avgNodesExplored);
      bestLatencyAlgo = sortedByTime[0].name;
      bestNodesAlgo = sortedByNodes[0].name;
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gradient-to-br from-background via-secondary/10 to-background">
      <div className="container mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Event-Driven <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Telemetry Analytics</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Real-time monitoring of pathfinding algorithm performance streaming via Apache Kafka.
            </p>
          </motion.div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <Badge variant="outline" className="px-3 py-1 bg-background/50 backdrop-blur border-border/80 text-xs font-semibold gap-1.5 flex items-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Feed
            </Badge>
            {isFetching && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
          </div>
        </div>

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Simulations</p>
                <h3 className="text-3xl font-bold">{totalRuns}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fastest Algorithm</p>
                <h3 className="text-3xl font-bold text-emerald-500">{bestLatencyAlgo}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Most Efficient Explorations</p>
                <h3 className="text-2xl font-bold text-purple-500">{bestNodesAlgo}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Microservices</p>
                <h3 className="text-3xl font-bold">4 / 4</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {hasRuns ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Latency Comparison */}
            <Card className="lg:col-span-2 bg-card/65 backdrop-blur shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle className="text-xl">Avg Execution Latency (ms)</CardTitle>
                <CardDescription>Lower values indicate faster calculation speeds.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="ms" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelClassName="font-bold text-foreground"
                    />
                    <Bar dataKey="avgTimeMs" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Simulation Share */}
            <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle className="text-xl">Run Share</CardTitle>
                <CardDescription>Distribution of pathfinding executions.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col items-center justify-center">
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                      <span>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Node Expansion Efficiency */}
            <Card className="lg:col-span-3 bg-card/65 backdrop-blur shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle className="text-xl">Avg Nodes Explored (Search Space)</CardTitle>
                <CardDescription>Measures the search frontier size. Smaller values show high directional accuracy.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelClassName="font-bold text-foreground"
                    />
                    <Bar dataKey="avgNodesExplored" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        ) : (
          <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50 p-12 text-center">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <Navigation className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">No Telemetry Events Collected Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Trigger simulations by opening the <a href="/map" className="text-primary hover:underline font-semibold">Map View</a>, selecting coordinates, and finding routes. Calculation metrics will stream instantly into this dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Runs Table */}
        <Card className="bg-card/65 backdrop-blur shadow-elegant border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">Kafka Event Audit Log</CardTitle>
            <CardDescription>Raw execution events captured and decoded from the Kafka topic.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentRuns && data.recentRuns.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Algorithm</TableHead>
                      <TableHead>Path Coordinates (Src → Dest)</TableHead>
                      <TableHead className="text-right">Execution Time</TableHead>
                      <TableHead className="text-right">Nodes Visited</TableHead>
                      <TableHead className="text-right">Distance</TableHead>
                      <TableHead className="text-right">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentRuns.map((run) => (
                      <TableRow key={run.id} className="hover:bg-muted/50 transition">
                        <TableCell className="font-semibold">
                          <Badge variant="secondary" className="font-medium">
                            {run.algorithm}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {run.source} → {run.destination}
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-500 font-semibold">
                          {run.executionTimeMs} ms
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-400">
                          {run.nodesExplored}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {run.pathLength ? `${(run.pathLength / 1000).toFixed(2)} km` : '0 km'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(run.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Waiting for event stream transactions...
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Analytics;
