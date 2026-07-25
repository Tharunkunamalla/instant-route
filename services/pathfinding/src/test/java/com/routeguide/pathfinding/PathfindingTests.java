package com.routeguide.pathfinding;

import com.routeguide.pathfinding.algorithm.AStar;
import com.routeguide.pathfinding.algorithm.BFS;
import com.routeguide.pathfinding.algorithm.Dijkstra;
import com.routeguide.pathfinding.algorithm.BidirectionalDijkstra;
import com.routeguide.pathfinding.algorithm.BidirectionalAStar;
import com.routeguide.pathfinding.model.Node;
import com.routeguide.pathfinding.model.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class PathfindingTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private Map<String, Node> graph;

    @BeforeEach
    public void setUp() {
        graph = new HashMap<>();

        // Create Nodes
        Node a = new Node("A", 0.0, 0.0);
        Node b = new Node("B", 0.0, 1.0);
        Node c = new Node("C", 1.0, 0.0);
        Node d = new Node("D", 1.0, 1.0);
        Node isolated = new Node("Isolated", 5.0, 5.0);

        // Define neighbors (undirected graph weights)
        a.addNeighbor("B", 10.0);
        b.addNeighbor("A", 10.0);

        a.addNeighbor("C", 15.0);
        c.addNeighbor("A", 15.0);

        b.addNeighbor("D", 12.0);
        d.addNeighbor("B", 12.0);

        c.addNeighbor("D", 10.0);
        d.addNeighbor("C", 10.0);

        // Put in graph
        graph.put("A", a);
        graph.put("B", b);
        graph.put("C", c);
        graph.put("D", d);
        graph.put("Isolated", isolated);
    }

    @Test
    public void testDijkstraShortestPath() {
        Dijkstra dijkstra = new Dijkstra();
        Result result = dijkstra.findPath(graph, "A", "D");

        assertNotNull(result);
        assertEquals(22.0, result.distance, 0.001);
        assertEquals(List.of("A", "B", "D"), result.path);
        assertTrue(result.visitedOrder.contains("A"));
        assertTrue(result.visitedOrder.contains("D"));
    }

    @Test
    public void testAStarShortestPath() {
        AStar aStar = new AStar();
        Result result = aStar.findPath(graph, "A", "D");

        assertNotNull(result);
        assertEquals(22.0, result.distance, 0.001);
        assertEquals(List.of("A", "B", "D"), result.path);
        assertTrue(result.visitedOrder.contains("A"));
        assertTrue(result.visitedOrder.contains("D"));
    }

    @Test
    public void testBidirectionalDijkstraShortestPath() {
        BidirectionalDijkstra bidirDijkstra = new BidirectionalDijkstra();
        Result result = bidirDijkstra.findPath(graph, "A", "D");

        assertNotNull(result);
        assertEquals(22.0, result.distance, 0.001);
        assertEquals(List.of("A", "B", "D"), result.path);
        assertTrue(result.visitedOrder.contains("A"));
        assertTrue(result.visitedOrder.contains("D"));
    }

    @Test
    public void testBidirectionalAStarShortestPath() {
        BidirectionalAStar bidirAStar = new BidirectionalAStar();
        Result result = bidirAStar.findPath(graph, "A", "D");

        assertNotNull(result);
        assertEquals(22.0, result.distance, 0.001);
        assertEquals(List.of("A", "B", "D"), result.path);
        assertTrue(result.visitedOrder.contains("A"));
        assertTrue(result.visitedOrder.contains("D"));
    }

    @Test
    public void testBFSPath() {
        BFS bfs = new BFS();
        Result result = bfs.findPath(graph, "A", "D");

        assertNotNull(result);
        // BFS finds path based on minimal hops, distance may not be optimal for weighted but hops are minimal
        assertEquals(3, result.path.size()); // A -> B -> D or A -> C -> D
        assertEquals("A", result.path.get(0));
        assertEquals("D", result.path.get(2));
    }

    @Test
    public void testUnreachablePath() {
        Dijkstra dijkstra = new Dijkstra();
        Result result = dijkstra.findPath(graph, "A", "Isolated");

        assertNotNull(result);
        assertTrue(result.path.isEmpty());
        assertEquals(Double.POSITIVE_INFINITY, result.distance);
    }

    @Test
    public void testHealthEndpoint() {
        String url = "http://localhost:" + port + "/api/health";
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("UP", response.getBody());
    }
}
