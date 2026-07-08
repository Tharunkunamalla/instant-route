package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import java.util.*;

public class AStar {

    public static Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId) {
        Map<String, Double> gScore = new HashMap<>();
        Map<String, Double> fScore = new HashMap<>();
        Map<String, String> previous = new HashMap<>();
        Set<String> openSet = new HashSet<>();
        Set<String> closedSet = new HashSet<>();
        List<String> visitedOrder = new ArrayList<>();

        // Initialize
        for (String nodeId : graph.keySet()) {
            gScore.put(nodeId, Double.POSITIVE_INFINITY);
            fScore.put(nodeId, Double.POSITIVE_INFINITY);
            previous.put(nodeId, null);
        }

        Node startNode = graph.get(startNodeId);
        Node endNode = graph.get(endNodeId);

        gScore.put(startNodeId, 0.0);
        fScore.put(startNodeId, heuristic(startNode, endNode));
        openSet.add(startNodeId);

        while (!openSet.isEmpty()) {
            // Node in openSet with lowest fScore
            String current = null;
            double lowestF = Double.POSITIVE_INFINITY;

            for (String nodeId : openSet) {
                double score = fScore.getOrDefault(nodeId, Double.POSITIVE_INFINITY);
                if (score < lowestF) {
                    lowestF = score;
                    current = nodeId;
                }
            }

            if (current == null) break;

            if (current.equals(endNodeId)) {
                visitedOrder.add(current);
                break;
            }

            openSet.remove(current);
            closedSet.add(current);
            visitedOrder.add(current);

            Node currentNode = graph.get(current);
            if (currentNode == null || currentNode.neighbors == null) continue;

            Map<String, Double> neighbors = currentNode.neighbors;
            for (Map.Entry<String, Double> entry : neighbors.entrySet()) {
                String neighborId = entry.getKey();
                double weight = entry.getValue();

                if (closedSet.contains(neighborId)) continue;

                double tentativeG = gScore.get(current) + weight;

                if (!openSet.contains(neighborId)) {
                    openSet.add(neighborId);
                } else if (tentativeG >= gScore.get(neighborId)) {
                    continue;
                }

                previous.put(neighborId, current);
                gScore.put(neighborId, tentativeG);
                Node neighborNode = graph.get(neighborId);
                fScore.put(neighborId, tentativeG + heuristic(neighborNode, endNode));
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

        return new Result(visitedOrder, path, gScore.getOrDefault(endNodeId, Double.POSITIVE_INFINITY));
    }

    // Euclidean distance heuristic
    private static double heuristic(Node nodeA, Node nodeB) {
        if (nodeA == null || nodeB == null) return 0.0;
        double lat1 = nodeA.lat;
        double lon1 = nodeA.lng;
        double lat2 = nodeB.lat;
        double lon2 = nodeB.lng;
        return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2)) * 111000; 
    }
}
