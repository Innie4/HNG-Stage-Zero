import nock from "nock";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { UpstreamServiceError } from "../src/genderize-client.js";

describe("GET /api/classify", () => {
  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it("returns a healthy response on the root path", async () => {
    const response = await request(createApp()).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.body).toEqual({
      status: "success",
      message: "Stage 0 API is running"
    });
  });

  it("returns a processed success response", async () => {
    nock("https://api.genderize.io").get("/").query({ name: "john" }).reply(200, {
      count: 1234,
      gender: "male",
      name: "john",
      probability: 0.99
    });

    const response = await request(createApp()).get("/api/classify").query({ name: "John" });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.body).toMatchObject({
      status: "success",
      data: {
        name: "john",
        gender: "male",
        probability: 0.99,
        sample_size: 1234,
        is_confident: true
      }
    });
    expect(response.body.data.processed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("returns false for is_confident when probability is below threshold", async () => {
    nock("https://api.genderize.io").get("/").query({ name: "alex" }).reply(200, {
      count: 250,
      gender: "male",
      name: "alex",
      probability: 0.68
    });

    const response = await request(createApp()).get("/api/classify").query({ name: "alex" });

    expect(response.status).toBe(200);
    expect(response.body.data.is_confident).toBe(false);
  });

  it("returns false for is_confident when sample size is below threshold", async () => {
    nock("https://api.genderize.io").get("/").query({ name: "mia" }).reply(200, {
      count: 99,
      gender: "female",
      name: "mia",
      probability: 0.95
    });

    const response = await request(createApp()).get("/api/classify").query({ name: "mia" });

    expect(response.status).toBe(200);
    expect(response.body.data.is_confident).toBe(false);
  });

  it("returns 400 when name is missing", async () => {
    const response = await request(createApp()).get("/api/classify");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: "error",
      message: "Missing or empty name parameter"
    });
  });

  it("returns 400 when name is empty", async () => {
    const response = await request(createApp()).get("/api/classify").query({ name: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: "error",
      message: "Missing or empty name parameter"
    });
  });

  it("returns 422 when name is not a string", async () => {
    const response = await request(createApp()).get("/api/classify?name=john&name=doe");

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      status: "error",
      message: "name must be a string"
    });
  });

  it("returns an error when Genderize has no prediction for the name", async () => {
    nock("https://api.genderize.io").get("/").query({ name: "qzxw" }).reply(200, {
      count: 0,
      gender: null,
      name: "qzxw",
      probability: 0
    });

    const response = await request(createApp()).get("/api/classify").query({ name: "qzxw" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "error",
      message: "No prediction available for the provided name"
    });
  });

  it("falls back to default numeric values before returning the no-prediction error", async () => {
    const app = createApp({
      genderizeClient: async () => ({
        gender: null
      })
    });

    const response = await request(app).get("/api/classify").query({ name: "unknown" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "error",
      message: "No prediction available for the provided name"
    });
  });

  it("returns 502 when the upstream API fails", async () => {
    nock("https://api.genderize.io").get("/").query({ name: "john" }).replyWithError("socket hang up");

    const response = await request(createApp()).get("/api/classify").query({ name: "john" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      status: "error",
      message: "Failed to reach Genderize API"
    });
  });

  it("returns 502 when the upstream client raises an upstream service error", async () => {
    const app = createApp({
      genderizeClient: async () => {
        throw new UpstreamServiceError("Genderize API returned an unexpected response");
      }
    });

    const response = await request(app).get("/api/classify").query({ name: "john" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      status: "error",
      message: "Genderize API returned an unexpected response"
    });
  });

  it("returns 500 for unexpected server failures", async () => {
    const app = createApp({
      genderizeClient: async () => {
        throw new Error("boom");
      }
    });

    const response = await request(app).get("/api/classify").query({ name: "john" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: "error",
      message: "Internal server error"
    });
  });

  it("handles multiple requests at the same time", async () => {
    const app = createApp({
      genderizeClient: async (name) => ({
        name,
        gender: "female",
        probability: 0.9,
        count: 120
      })
    });

    const requests = Array.from({ length: 20 }, (_, index) =>
      request(app)
        .get("/api/classify")
        .query({ name: `name${index}` })
    );

    const responses = await Promise.all(requests);

    expect(responses).toHaveLength(20);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.is_confident).toBe(true);
    }
  });
});
