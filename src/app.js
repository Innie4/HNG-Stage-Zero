import cors from "cors";
import express from "express";
import { fetchGenderPrediction, UpstreamServiceError } from "./genderize-client.js";

function utcIsoTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createApp(dependencies = {}) {
  const app = express();
  const genderizeClient = dependencies.genderizeClient ?? fetchGenderPrediction;

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: "*"
    })
  );

  app.get("/", (request, response) => {
    return response.status(200).json({
      status: "success",
      message: "Stage 0 API is running"
    });
  });

  app.get("/api/classify", async (request, response, next) => {
    const { name } = request.query;

    if (name === undefined) {
      return response.status(400).json({
        status: "error",
        message: "Missing or empty name parameter"
      });
    }

    if (typeof name !== "string") {
      return response.status(422).json({
        status: "error",
        message: "name must be a string"
      });
    }

    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      return response.status(400).json({
        status: "error",
        message: "Missing or empty name parameter"
      });
    }

    try {
      const prediction = await genderizeClient(normalizedName);
      const gender = prediction?.gender ?? null;
      const probability = Number(prediction?.probability ?? 0);
      const sampleSize = Number(prediction?.count ?? 0);

      if (gender === null || sampleSize === 0) {
        return response.status(404).json({
          status: "error",
          message: "No prediction available for the provided name"
        });
      }

      return response.status(200).json({
        status: "success",
        data: {
          name: normalizedName,
          gender,
          probability,
          sample_size: sampleSize,
          is_confident: probability >= 0.7 && sampleSize >= 100,
          processed_at: utcIsoTimestamp()
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, request, response, next) => {
    if (error instanceof UpstreamServiceError) {
      return response.status(error.statusCode).json({
        status: "error",
        message: error.message
      });
    }

    return response.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  });

  return app;
}
