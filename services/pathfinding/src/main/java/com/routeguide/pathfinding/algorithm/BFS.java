package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import java.util.*;

public class BFS {

    public static Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId) {
        Queue<String> queue = new LinkedList<>();
        queue.add(startNodeId);
        
        Set<String> visited = new HashSet<>();
        visited.add(startNodeId);
        
        Map<String, String> previous = new HashMap<>();
        List<String> visitedOrder = new ArrayList<>();
        Map<String, Double> distances = new HashMap<>();

        for (String node : graph.keySet()) {
            previous.put(node, null);
            distances.put(node, Double.POSITIVE_INFINITY);
        }
        distances.put(startNodeId, 0.0);

        boolean found = false;
        while (!queue.isEmpty()) {
            String current = queue.poll();
            visitedOrder.add(current);

            if (current.equals(endNodeId)) {
                found = true;
                break;
            }

            Node currentNode = graph.get(current);
            if (currentNode == null || currentNode.neighbors == null) continue;

            Map<String, Double> neighbors = currentNode.neighbors;
            for (Map.Entry<String, Double> entry : neighbors.entrySet()) {
                String neighborId = entry.getKey();
                double weight = entry.getValue();

                if (!visited.contains(neighborId)) {
                    visited.add(neighborId);
                    previous.put(neighborId, current);
                    distances.put(neighborId, distances.get(current) + weight);
                    queue.add(neighborId);
                }
            }
        }

        // Reconstruct path
        List<String> path = new ArrayList<>();
        if (found) {
            String u = endNodeId;
            while (u != null) {
                path.add(0, u);
                u = previous.get(u);
            }
        }

        return new Result(visitedOrder, path, distances.getOrDefault(endNodeId, Double.POSITIVE_INFINITY));
    }
}
