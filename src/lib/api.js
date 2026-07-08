import { dijkstra } from "@/algorithms/dijkstra";
import { astar } from "@/algorithms/astar";
import { bfs } from "@/algorithms/bfs";

/**
 * Calculates a route between source and destination using the backend Java pathfinding microservice.
 * Falls back to local JavaScript implementation if the backend is unreachable or returns an error.
 * 
 * @param {object} graph - Graph object representing road network
 * @param {string} source - ID of start node
 * @param {string} destination - ID of end node
 * @param {string} algorithm - "Dijkstra" | "A*" | "BFS"
 * @returns {Promise<{visitedOrder: string[], path: string[], distance: number, source: 'microservice'|'client-fallback'}>}
 */
export const getRoute = async (graph, source, destination, algorithm) => {
  try {
    const response = await fetch("/api/pathfind", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        graph,
        source: String(source),
        destination: String(destination),
        algorithm
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        visitedOrder: data.visitedOrder || [],
        path: data.path || [],
        distance: data.distance || 0,
        source: "microservice"
      };
    }
    throw new Error(`Microservice endpoint returned status: ${response.status}`);
  } catch (error) {
    console.warn("Backend pathfinding microservice failed or unreachable. Falling back to local JS execution.", error);
    
    // Graceful fallback to client-side JS implementation
    let localResult;
    if (algorithm === "Dijkstra") {
      localResult = dijkstra(graph, String(source), String(destination));
    } else if (algorithm === "A*") {
      localResult = astar(graph, String(source), String(destination));
    } else {
      localResult = bfs(graph, String(source), String(destination));
    }

    return {
      ...localResult,
      source: "client-fallback"
    };
  }
};
