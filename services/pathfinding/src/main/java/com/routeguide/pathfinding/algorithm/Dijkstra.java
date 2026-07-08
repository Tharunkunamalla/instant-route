package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import java.util.*;

public class Dijkstra {

    public static Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId) {
        Map<String, Double> distances = new HashMap<>();
        Map<String, String> previous = new HashMap<>();
        Set<String> unvisited = new HashSet<>();
        List<String> visitedOrder = new ArrayList<>();

        // Initialize
        for (String nodeId : graph.keySet()) {
            distances.put(nodeId, Double.POSITIVE_INFINITY);
            previous.put(nodeId, null);
            unvisited.add(nodeId);
        }
        distances.put(startNodeId, 0.0);

        while (!unvisited.isEmpty()) {
            // Find node with smallest distance
            String currentNodeId = null;
            double smallestDistance = Double.POSITIVE_INFINITY;

            for (String nodeId : unvisited) {
                double dist = distances.get(nodeId);
                if (dist < smallestDistance) {
                    smallestDistance = dist;
                    currentNodeId = nodeId;
                }
            }

            if (currentNodeId == null || distances.get(currentNodeId) == Double.POSITIVE_INFINITY) {
                break; // No reachable nodes left or target unreachable
            }

            if (currentNodeId.equals(endNodeId)) {
                visitedOrder.add(currentNodeId);
                break; // Reached target
            }

            unvisited.remove(currentNodeId);
            visitedOrder.add(currentNodeId);

            // Neighbors
            Node node = graph.get(currentNodeId);
            if (node == null || node.neighbors == null) continue;

            Map<String, Double> neighbors = node.neighbors;
            for (Map.Entry<String, Double> entry : neighbors.entrySet()) {
                String neighborId = entry.getKey();
                double weight = entry.getValue();

                if (unvisited.contains(neighborId)) {
                    double alt = distances.get(currentNodeId) + weight;
                    if (alt < distances.get(neighborId)) {
                        distances.put(neighborId, alt);
                        previous.put(neighborId, currentNodeId);
                    }
                }
            }
        }

        // Reconstruct path
        List<String> path = new ArrayList<>();
        String u = endNodeId;
        if (previous.get(u) != null || u.equals(startNodeId)) {
            while (u != null) {
                path.add(0, u);
                u = previous.get(u);
            }
        }

        return new Result(visitedOrder, path, distances.getOrDefault(endNodeId, Double.POSITIVE_INFINITY));
    }
}
