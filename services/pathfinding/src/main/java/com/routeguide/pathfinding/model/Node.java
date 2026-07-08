package com.routeguide.pathfinding.model;

import java.util.HashMap;
import java.util.Map;

public class Node {
    public String id;
    public double lat;
    public double lng;
    public Map<String, Double> neighbors;

    public Node() {
        this.neighbors = new HashMap<>();
    }

    public Node(String id, double lat, double lng) {
        this.id = id;
        this.lat = lat;
        this.lng = lng;
        this.neighbors = new HashMap<>();
    }

    public void addNeighbor(String neighborId, double weight) {
        neighbors.put(neighborId, weight);
    }
}
