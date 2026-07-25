package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import org.springframework.stereotype.Component;
import java.util.*;

@Component("Bidirectional A*")
public class BidirectionalAStar implements PathfindingStrategy {

    private static class PathNode implements Comparable<PathNode> {
        String id;
        double priority; // fScore

        PathNode(String id, double priority) {
            this.id = id;
            this.priority = priority;
        }

        @Override
        public int compareTo(PathNode other) {
            return Double.compare(this.priority, other.priority);
        }
    }

    @Override
    public Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId) {
        if (startNodeId.equals(endNodeId)) {
            return new Result(List.of(startNodeId), List.of(startNodeId), 0.0);
        }

        Node startNode = graph.get(startNodeId);
        Node endNode = graph.get(endNodeId);

        Map<String, Double> gScoreF = new HashMap<>();
        Map<String, Double> gScoreB = new HashMap<>();
        Map<String, Double> fScoreF = new HashMap<>();
        Map<String, Double> fScoreB = new HashMap<>();
        Map<String, String> prevF = new HashMap<>();
        Map<String, String> prevB = new HashMap<>();
        Set<String> visitedF = new HashSet<>();
        Set<String> visitedB = new HashSet<>();
        List<String> visitedOrder = new ArrayList<>();

        PriorityQueue<PathNode> pqF = new PriorityQueue<>();
        PriorityQueue<PathNode> pqB = new PriorityQueue<>();

        for (String nodeId : graph.keySet()) {
            gScoreF.put(nodeId, Double.POSITIVE_INFINITY);
            gScoreB.put(nodeId, Double.POSITIVE_INFINITY);
            fScoreF.put(nodeId, Double.POSITIVE_INFINITY);
            fScoreB.put(nodeId, Double.POSITIVE_INFINITY);
            prevF.put(nodeId, null);
            prevB.put(nodeId, null);
        }

        gScoreF.put(startNodeId, 0.0);
        gScoreB.put(endNodeId, 0.0);

        double hStart = heuristic(startNode, endNode);
        fScoreF.put(startNodeId, hStart);
        fScoreB.put(endNodeId, hStart);

        pqF.add(new PathNode(startNodeId, hStart));
        pqB.add(new PathNode(endNodeId, hStart));

        double bestDist = Double.POSITIVE_INFINITY;
        String meetingNode = null;

        while (!pqF.isEmpty() && !pqB.isEmpty()) {
            // Termination condition: If minimum f-score in either queue exceeds bestDist, no shorter path can be found.
            if (pqF.peek().priority >= bestDist || pqB.peek().priority >= bestDist) {
                break;
            }

            if (pqF.size() <= pqB.size()) {
                PathNode current = pqF.poll();
                String u = current.id;

                if (visitedF.contains(u)) continue;
                visitedF.add(u);
                visitedOrder.add(u);

                if (visitedB.contains(u)) {
                    double totalDist = gScoreF.get(u) + gScoreB.get(u);
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

                    double tentativeG = gScoreF.get(u) + weight;
                    if (tentativeG < gScoreF.get(v)) {
                        gScoreF.put(v, tentativeG);
                        prevF.put(v, u);
                        Node neighborNode = graph.get(v);
                        double f = tentativeG + heuristic(neighborNode, endNode);
                        fScoreF.put(v, f);
                        pqF.add(new PathNode(v, f));

                        if (visitedB.contains(v)) {
                            double totalDist = tentativeG + gScoreB.get(v);
                            if (totalDist < bestDist) {
                                bestDist = totalDist;
                                meetingNode = v;
                            }
                        }
                    }
                }
            } else {
                PathNode current = pqB.poll();
                String u = current.id;

                if (visitedB.contains(u)) continue;
                visitedB.add(u);
                visitedOrder.add(u);

                if (visitedF.contains(u)) {
                    double totalDist = gScoreF.get(u) + gScoreB.get(u);
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

                    double tentativeG = gScoreB.get(u) + weight;
                    if (tentativeG < gScoreB.get(v)) {
                        gScoreB.put(v, tentativeG);
                        prevB.put(v, u);
                        Node neighborNode = graph.get(v);
                        double f = tentativeG + heuristic(neighborNode, startNode);
                        fScoreB.put(v, f);
                        pqB.add(new PathNode(v, f));

                        if (visitedF.contains(v)) {
                            double totalDist = gScoreF.get(v) + tentativeG;
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

    private static double heuristic(Node nodeA, Node nodeB) {
        if (nodeA == null || nodeB == null) return 0.0;
        double lat1 = nodeA.lat;
        double lon1 = nodeA.lng;
        double lat2 = nodeB.lat;
        double lon2 = nodeB.lng;
        return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2)) * 111000;
    }
}
