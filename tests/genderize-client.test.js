import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGenderPrediction, UpstreamServiceError } from "../src/genderize-client.js";

describe("fetchGenderPrediction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON from Genderize", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        name: "john",
        gender: "male",
        probability: 0.99,
        count: 1234
      })
    });

    const response = await fetchGenderPrediction("john", {
      signal: AbortSignal.timeout(1000)
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].toString()).toBe("https://api.genderize.io/?name=john");
    expect(response).toEqual({
      name: "john",
      gender: "male",
      probability: 0.99,
      count: 1234
    });
  });

  it("throws an upstream error when the API returns a non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false
    });

    await expect(
      fetchGenderPrediction("john", {
        signal: AbortSignal.timeout(1000)
      })
    ).rejects.toMatchObject({
      name: "UpstreamServiceError",
      message: "Genderize API returned an unexpected response",
      statusCode: 502
    });
  });

  it("throws an upstream error when the API returns invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error("invalid json"))
    });

    await expect(
      fetchGenderPrediction("john", {
        signal: AbortSignal.timeout(1000)
      })
    ).rejects.toMatchObject({
      name: "UpstreamServiceError",
      message: "Genderize API returned invalid JSON",
      statusCode: 502
    });
  });
});

describe("UpstreamServiceError", () => {
  it("defaults statusCode to 502", () => {
    const error = new UpstreamServiceError("oops");

    expect(error.statusCode).toBe(502);
  });
});
