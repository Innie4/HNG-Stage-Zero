# HNG Stage 0: Name Classification API

A small Node.js service that calls the Genderize API, processes the response, and exposes a single endpoint:

`GET /api/classify?name={name}`

## Features

- Calls the [Genderize API](https://api.genderize.io)
- Returns a structured response with:
  - `gender`
  - `probability`
  - `sample_size`
  - `is_confident`
  - `processed_at`
- Handles validation, upstream failures, and no-prediction edge cases
- Includes CORS support with `Access-Control-Allow-Origin: *`
- Comes with a full automated test suite and 100% coverage

## Tech Stack

- Node.js
- Express
- Vitest
- Supertest

## Getting Started

### Prerequisites

- Node.js 20 or newer

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm start
```

The app starts on `http://localhost:3000` by default.

The root path returns a simple 200 health response for platform checks.

You can also set a custom port:

```bash
PORT=4000 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=4000
npm.cmd start
```

## API Endpoint

### Request

`GET /api/classify?name=john`

### Success Response

```json
{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 1234,
    "is_confident": true,
    "processed_at": "2026-04-01T12:00:00Z"
  }
}
```

### Error Responses

Missing or empty `name`:

```json
{
  "status": "error",
  "message": "Missing or empty name parameter"
}
```

Invalid `name` type:

```json
{
  "status": "error",
  "message": "name must be a string"
}
```

No prediction available:

```json
{
  "status": "error",
  "message": "No prediction available for the provided name"
}
```

Upstream/server failure:

```json
{
  "status": "error",
  "message": "Failed to reach Genderize API"
}
```

## Processing Rules

- `count` from Genderize is returned as `sample_size`
- `is_confident` is `true` only when:
  - `probability >= 0.7`
  - `sample_size >= 100`
- `processed_at` is generated fresh on every request in UTC ISO 8601 format

## Testing

Run the full test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Current local result:

- 18 tests passing
- 100% statements, branches, functions, and lines coverage

## Deployment Notes

This service is ready for platforms that run a standard Node server, such as:

- Railway
- Heroku
- AWS Elastic Beanstalk
- PXXL

It reads the `PORT` environment variable automatically, so most Node-friendly hosts will work without code changes.

## Submission Checklist

1. Deploy the app to an accepted host
2. Confirm the live endpoint works:
   - `/api/classify?name=john`
3. Submit:
   - Your live API base URL
   - Your GitHub repository link

## Useful Local Checks

Example request:

```bash
curl "http://localhost:3000/api/classify?name=john"
```
