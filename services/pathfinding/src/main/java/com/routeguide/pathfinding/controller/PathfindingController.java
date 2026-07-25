package com.routeguide.pathfinding.controller;

import com.routeguide.pathfinding.algorithm.PathfindingStrategy;
import com.routeguide.pathfinding.model.PathfindingRequest;
import com.routeguide.pathfinding.model.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PathfindingController {

    private static final Logger logger = LoggerFactory.getLogger(PathfindingController.class);

    private final Map<String, PathfindingStrategy> strategies;

    // Constructor injection: Spring automatically injects a map of all beans implementing PathfindingStrategy
    // Key will be the bean name specified in @Component (e.g. "Dijkstra", "A*", "BFS")
    public PathfindingController(Map<String, PathfindingStrategy> strategies) {
        this.strategies = strategies;
    }

    @PostMapping("/pathfind")
    public ResponseEntity<Result> pathfind(@RequestBody PathfindingRequest request) {
        if (request.getGraph() == null || request.getSource() == null || request.getDestination() == null) {
            logger.warn("Invalid pathfinding request: missing graph, source, or destination");
            return ResponseEntity.badRequest().build();
        }

        String algorithm = request.getAlgorithm();
        if (algorithm == null) {
            algorithm = "Dijkstra";
        }

        PathfindingStrategy strategy = strategies.get(algorithm);
        if (strategy == null) {
            logger.warn("Unsupported algorithm requested: {}", algorithm);
            return ResponseEntity.badRequest().build();
        }

        logger.info("Calculating path from {} to {} using {}", request.getSource(), request.getDestination(), algorithm);
        Result result = strategy.findPath(request.getGraph(), request.getSource(), request.getDestination());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }
}
