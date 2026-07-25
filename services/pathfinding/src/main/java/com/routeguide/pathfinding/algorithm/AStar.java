package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import org.springframework.stereotype.Component;
import java.util.*;

@Component("A*")
public class AStar implements PathfindingStrategy {

    private static class PathNode implements Comparable<PathNode> {
        String id;
        double fScore;

        PathNode(String id, double fScore) {
            this.id = id;
            this.fScore = fScore;
        }

        @Override
        public int compareTo(PathNode other) {
            return Double.compare(this.fScore, other.fScore);
        }
    }

    @Override
    public Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId) {
        Map<String, Double> gScore = new HashMap<>();
        Map<String, Double> fScore = new HashMap<>();
        Map<String, String> previous = new HashMap<>();
        Set<String> visited = new HashSet<>();
        List<String> visitedOrder = new ArrayList<>();
        PriorityQueue<PathNode> pq = new PriorityQueue<>();

        // Initialize
        for (String nodeId : graph.keySet()) {
            gScore.put(nodeId, Double.POSITIVE_INFINITY);
            fScore.put(nodeId, Double.POSITIVE_INFINITY);
            previous.put(nodeId, null);
        }

        Node startNode = graph.get(startNodeId);
        Node endNode = graph.get(endNodeId);

        gScore.put(startNodeId, 0.0);
        double hStart = heuristic(startNode, endNode);
        fScore.put(startNodeId, hStart);
        pq.add(new PathNode(startNodeId, hStart));

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

            Node currentNode = graph.get(u);
            if (currentNode == null || currentNode.neighbors == null) continue;

            for (Map.Entry<String, Double> entry : currentNode.neighbors.entrySet()) {
                String v = entry.getKey();
                double weight = entry.getValue();

                if (visited.contains(v)) {
                    continue;
                }

                double tentativeG = gScore.get(u) + weight;
                if (tentativeG < gScore.get(v)) {
                    previous.put(v, u);
                    gScore.put(v, tentativeG);
                    Node neighborNode = graph.get(v);
                    double f = tentativeG + heuristic(neighborNode, endNode);
                    fScore.put(v, f);
                    pq.add(new PathNode(v, f));
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
