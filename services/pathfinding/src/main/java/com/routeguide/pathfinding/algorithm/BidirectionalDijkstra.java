package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import org.springframework.stereotype.Component;
import java.util.*;

@Component("Bidirectional Dijkstra")
public class BidirectionalDijkstra implements PathfindingStrategy {

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
        if (startNodeId.equals(endNodeId)) {
            return new Result(List.of(startNodeId), List.of(startNodeId), 0.0);
        }

        Map<String, Double> distF = new HashMap<>();
        Map<String, Double> distB = new HashMap<>();
        Map<String, String> prevF = new HashMap<>();
        Map<String, String> prevB = new HashMap<>();
        Set<String> visitedF = new HashSet<>();
        Set<String> visitedB = new HashSet<>();
        List<String> visitedOrder = new ArrayList<>();

        PriorityQueue<PathNode> pqF = new PriorityQueue<>();
        PriorityQueue<PathNode> pqB = new PriorityQueue<>();

        for (String nodeId : graph.keySet()) {
            distF.put(nodeId, Double.POSITIVE_INFINITY);
            distB.put(nodeId, Double.POSITIVE_INFINITY);
            prevF.put(nodeId, null);
            prevB.put(nodeId, null);
        }

        distF.put(startNodeId, 0.0);
        distB.put(endNodeId, 0.0);
        pqF.add(new PathNode(startNodeId, 0.0));
        pqB.add(new PathNode(endNodeId, 0.0));

        double bestDist = Double.POSITIVE_INFINITY;
        String meetingNode = null;

        while (!pqF.isEmpty() && !pqB.isEmpty()) {
            // Early termination check: if the top priorities sum up to >= bestDist, we cannot find a shorter path.
            if (pqF.peek().distance + pqB.peek().distance >= bestDist) {
                break;
            }

            // Choose search direction based on smaller priority queue size
            if (pqF.size() <= pqB.size()) {
                // Forward step
                PathNode current = pqF.poll();
                String u = current.id;

                if (visitedF.contains(u)) continue;
                visitedF.add(u);
                visitedOrder.add(u);

                if (visitedB.contains(u)) {
                    double totalDist = distF.get(u) + distB.get(u);
                    if (totalDist < bestDist) {
                        bestDist = totalDist;
                        meetingNode = u;
                    }
                }

                Node node = graph.get(u);
                if (node == null || node.neighbors == null) continue;

                for (Map.Entry<String, Double> entry : node.neighbors.entrySet()) {
                    String v = entry.getKey();
                    double weight = entry.getValue();

                    if (visitedF.contains(v)) continue;

                    double alt = distF.get(u) + weight;
                    if (alt < distF.get(v)) {
                        distF.put(v, alt);
                        prevF.put(v, u);
                        pqF.add(new PathNode(v, alt));

                        if (visitedB.contains(v)) {
                            double totalDist = alt + distB.get(v);
                            if (totalDist < bestDist) {
                                bestDist = totalDist;
                                meetingNode = v;
                            }
                        }
                    }
                }
            } else {
                // Backward step
                PathNode current = pqB.poll();
                String u = current.id;

                if (visitedB.contains(u)) continue;
                visitedB.add(u);
                visitedOrder.add(u);

                if (visitedF.contains(u)) {
                    double totalDist = distF.get(u) + distB.get(u);
                    if (totalDist < bestDist) {
                        bestDist = totalDist;
                        meetingNode = u;
                    }
                }

                Node node = graph.get(u);
                if (node == null || node.neighbors == null) continue;

                for (Map.Entry<String, Double> entry : node.neighbors.entrySet()) {
                    String v = entry.getKey();
                    double weight = entry.getValue();

                    if (visitedB.contains(v)) continue;

                    double alt = distB.get(u) + weight;
                    if (alt < distB.get(v)) {
                        distB.put(v, alt);
                        prevB.put(v, u);
                        pqB.add(new PathNode(v, alt));

                        if (visitedF.contains(v)) {
                            double totalDist = distF.get(v) + alt;
                            if (totalDist < bestDist) {
                                bestDist = totalDist;
                                meetingNode = v;
                            }
                        }
                    }
                }
            }
        }

        // Reconstruct path
        List<String> path = new ArrayList<>();
        if (meetingNode != null && bestDist < Double.POSITIVE_INFINITY) {
            // Forward path: startNode -> ... -> meetingNode
            List<String> forwardPath = new ArrayList<>();
            String curr = meetingNode;
            while (curr != null) {
                forwardPath.add(0, curr);
                curr = prevF.get(curr);
            }

            // Backward path: meetingNode -> ... -> endNode
            List<String> backwardPath = new ArrayList<>();
            curr = prevB.get(meetingNode); // Skip meetingNode to avoid duplicate
            while (curr != null) {
                backwardPath.add(curr);
                curr = prevB.get(curr);
            }

            path.addAll(forwardPath);
            path.addAll(backwardPath);
        }

        return new Result(visitedOrder, path, bestDist == Double.POSITIVE_INFINITY ? Double.POSITIVE_INFINITY : bestDist);
    }
}
