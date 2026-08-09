import { describe, it, expect } from "vitest";
import { astar } from "./astar";

describe("A* Pathfinding Client Algorithm", () => {
  const graph = {
    A: { lat: 0.0, lng: 0.0, neighbors: { B: 10.0, C: 15.0 } },
    B: { lat: 0.0, lng: 1.0, neighbors: { A: 10.0, D: 12.0 } },
    C: { lat: 1.0, lng: 0.0, neighbors: { A: 15.0, D: 10.0 } },
    D: { lat: 1.0, lng: 1.0, neighbors: { B: 12.0, C: 10.0 } },
    Isolated: { lat: 5.0, lng: 5.0, neighbors: {} }
  };

  it("should find the shortest path from A to D", () => {
    const result = astar(graph, "A", "D");
    expect(result).toBeDefined();
    expect(result.distance).toBeCloseTo(22.0, 1);
    expect(result.path).toEqual(["A", "B", "D"]);
    expect(result.visitedOrder).toContain("A");
    expect(result.visitedOrder).toContain("D");
  });

  it("should handle unreachable destinations gracefully", () => {
    const result = astar(graph, "A", "Isolated");
    expect(result).toBeDefined();
    expect(result.path).toEqual([]);
    expect(result.distance).toBe(Infinity);
  });
});
