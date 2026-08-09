package com.routeguide.pathfinding.controller;

import com.routeguide.pathfinding.algorithm.PathfindingStrategy;
import com.routeguide.pathfinding.model.PathfindingRequest;
import com.routeguide.pathfinding.model.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PathfindingController {

    private static final Logger logger = LoggerFactory.getLogger(PathfindingController.class);

    private final Map<String, PathfindingStrategy> strategies;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PathfindingController(Map<String, PathfindingStrategy> strategies, KafkaTemplate<String, Object> kafkaTemplate) {
        this.strategies = strategies;
        this.kafkaTemplate = kafkaTemplate;
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
        
        long startTime = System.currentTimeMillis();
        Result result = strategy.findPath(request.getGraph(), request.getSource(), request.getDestination());
        long duration = System.currentTimeMillis() - startTime;

        try {
            Map<String, Object> telemetry = new HashMap<>();
            telemetry.put("algorithm", algorithm);
            telemetry.put("source", request.getSource());
            telemetry.put("destination", request.getDestination());
            telemetry.put("executionTimeMs", duration);
            telemetry.put("pathLength", result.distance);
            telemetry.put("nodesExplored", result.visitedOrder != null ? result.visitedOrder.size() : 0);
            telemetry.put("timestamp", System.currentTimeMillis());

            kafkaTemplate.send("pathfinding-telemetry", telemetry);
            logger.info("Published pathfinding telemetry to Kafka for {}", algorithm);
        } catch (Exception e) {
            logger.error("Failed to publish telemetry to Kafka: {}", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }
}
