const GENDERIZE_BASE_URL = "https://api.genderize.io";

export class UpstreamServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "UpstreamServiceError";
    this.statusCode = options.statusCode ?? 502;
  }
}

export async function fetchGenderPrediction(name, options = {}) {
  const baseUrl = options.baseUrl ?? GENDERIZE_BASE_URL;
  const signal = options.signal ?? AbortSignal.timeout(4000);
  const url = new URL(baseUrl);

  url.searchParams.set("name", name);

  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal
    });
  } catch (error) {
    throw new UpstreamServiceError("Failed to reach Genderize API");
  }

  if (!response.ok) {
    throw new UpstreamServiceError("Genderize API returned an unexpected response");
  }

  try {
    return await response.json();
  } catch (error) {
    throw new UpstreamServiceError("Genderize API returned invalid JSON");
  }
}
