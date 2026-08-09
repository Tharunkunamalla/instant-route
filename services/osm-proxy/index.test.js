import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "./index.js";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OSM Proxy API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return health status UP", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "UP" });
  });

  it("should return 400 bad request if data parameter is missing", async () => {
    const res = await request(app).get("/api/osm");
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should query Overpass API on cache miss and return data", async () => {
    const mockOsmResponse = { elements: [{ id: 1, type: "node", lat: 10, lon: 20 }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOsmResponse
    });

    const res = await request(app)
      .get("/api/osm")
      .query({ data: "mock-osm-query-string" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockOsmResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should serve from cache on subsequent requests", async () => {
    // Note: The previous test cached "mock-osm-query-string", so this should hit the cache
    const res = await request(app)
      .get("/api/osm")
      .query({ data: "mock-osm-query-string" });

    expect(res.statusCode).toBe(200);
    // Fetch should NOT have been called this time
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
