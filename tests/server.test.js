import { afterEach, describe, expect, it, vi } from "vitest";

describe("server bootstrap", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unmock("../src/app.js");
    delete process.env.PORT;
  });

  it("starts the app on the configured port", async () => {
    process.env.PORT = "4567";

    const listen = vi.fn((port, host, callback) => {
      expect(host).toBe("0.0.0.0");
      callback();
      return { close: vi.fn() };
    });
    const createApp = vi.fn(() => ({ listen }));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("../src/app.js", () => ({
      createApp
    }));

    await import("../src/server.js");

    expect(createApp).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(4567, "0.0.0.0", expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Server listening on port 4567");
  });

  it("falls back to port 3000 when PORT is not set", async () => {
    const listen = vi.fn((port, host, callback) => {
      expect(host).toBe("0.0.0.0");
      callback();
      return { close: vi.fn() };
    });
    const createApp = vi.fn(() => ({ listen }));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("../src/app.js", () => ({
      createApp
    }));

    await import("../src/server.js");

    expect(createApp).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(3000, "0.0.0.0", expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Server listening on port 3000");
  });
});
