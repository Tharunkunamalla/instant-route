package com.routeguide.pathfinding.model;

import java.util.List;

public class Result {
    public List<String> visitedOrder;
    public List<String> path;
    public double distance;

    public Result() {
    }

    public Result(List<String> visitedOrder, List<String> path, double distance) {
        this.visitedOrder = visitedOrder;
        this.path = path;
        this.distance = distance;
    }
}
