package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import org.springframework.stereotype.Component;
import java.util.*;

@Component("Dijkstra")
public class Dijkstra implements PathfindingStrategy {

    private static class PathNode implements Comparable<PathNode> {
        String id;
        double distance;

        PathNode(String id, double distance) {
            this.id = id;
            this.distance = distance;
        }

        @Override
        public int compareTo(PathNode other) {
            return Double.compare(this.distance, other.distance);
        }
    }

    @Override
    public Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId) {
        Map<String, Double> distances = new HashMap<>();
        Map<String, String> previous = new HashMap<>();
        Set<String> visited = new HashSet<>();
        List<String> visitedOrder = new ArrayList<>();
        PriorityQueue<PathNode> pq = new PriorityQueue<>();

        // Initialize
        for (String nodeId : graph.keySet()) {
            distances.put(nodeId, Double.POSITIVE_INFINITY);
            previous.put(nodeId, null);
        }
        
        distances.put(startNodeId, 0.0);
        pq.add(new PathNode(startNodeId, 0.0));

        while (!pq.isEmpty()) {
            PathNode current = pq.poll();
            String u = current.id;

            if (visited.contains(u)) {
                continue;
            }
            visited.add(u);
            visitedOrder.add(u);

            if (u.equals(endNodeId)) {
                break;
            }

            Node node = graph.get(u);
            if (node == null || node.neighbors == null) continue;

            for (Map.Entry<String, Double> entry : node.neighbors.entrySet()) {
                String v = entry.getKey();
                double weight = entry.getValue();

                if (visited.contains(v)) {
                    continue;
                }

                double alt = distances.get(u) + weight;
                if (alt < distances.get(v)) {
                    distances.put(v, alt);
                    previous.put(v, u);
                    pq.add(new PathNode(v, alt));
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
