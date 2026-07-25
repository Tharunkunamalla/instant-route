package com.routeguide.pathfinding.algorithm;

import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import java.util.Map;

public interface PathfindingStrategy {
    Result findPath(Map<String, Node> graph, String startNodeId, String endNodeId);
}
