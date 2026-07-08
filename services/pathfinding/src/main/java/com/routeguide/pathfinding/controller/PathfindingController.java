package com.routeguide.pathfinding.controller;

import com.routeguide.pathfinding.algorithm.AStar;
import com.routeguide.pathfinding.algorithm.BFS;
import com.routeguide.pathfinding.algorithm.Dijkstra;
import com.routeguide.pathfinding.model.PathfindingRequest;
import com.routeguide.pathfinding.model.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PathfindingController {

    @PostMapping("/pathfind")
    public ResponseEntity<Result> pathfind(@RequestBody PathfindingRequest request) {
        if (request.getGraph() == null || request.getSource() == null || request.getDestination() == null) {
            return ResponseEntity.badRequest().build();
        }

        Result result;
        String algorithm = request.getAlgorithm();
        if (algorithm == null) {
            algorithm = "Dijkstra";
        }

        try {
            switch (algorithm) {
                case "A*":
                    result = AStar.findPath(request.getGraph(), request.getSource(), request.getDestination());
                    break;
                case "BFS":
                    result = BFS.findPath(request.getGraph(), request.getSource(), request.getDestination());
                    break;
                case "Dijkstra":
                default:
                    result = Dijkstra.findPath(request.getGraph(), request.getSource(), request.getDestination());
                    break;
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }
}
