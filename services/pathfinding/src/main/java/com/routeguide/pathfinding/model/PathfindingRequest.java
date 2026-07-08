package com.routeguide.pathfinding.model;

import java.util.Map;

public class PathfindingRequest {
    private Map<String, Node> graph;
    private String source;
    private String destination;
    private String algorithm;

    public PathfindingRequest() {
    }

    public PathfindingRequest(Map<String, Node> graph, String source, String destination, String algorithm) {
        this.graph = graph;
        this.source = source;
        this.destination = destination;
        this.algorithm = algorithm;
    }

    // Getters and Setters
    public Map<String, Node> getGraph() {
        return graph;
    }

    public void setGraph(Map<String, Node> graph) {
        this.graph = graph;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    public void setAlgorithm(String algorithm) {
        this.algorithm = algorithm;
    }
}
