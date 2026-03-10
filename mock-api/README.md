# EBS Mock API Server

A simple Go-based mock server to facilitate local testing of the EBS webview with various stream states.

## Purpose

This server provides a stable endpoint for testing different stream scenarios without needing the real backend. It currently mocks 11 specific streams covering:
- **Live**: Active streams with viewer counts (including a `Local_Test` entry).
- **Starting Soon**: Streams in transition.
- **Offline / Withheld**: Streams with various withhold statuses (Legal, Policy, Technical).

## Getting Started

### Prerequisites

- [Go](https://go.dev/doc/install) (1.20+ recommended)

### Running the Server

From the project root:

```bash
cd mock-api
go run main.go
```

By default, the server will start at `http://localhost:9000`.

### Configuration

You can customize the server using flags or environment variables:

| Option | Flag | Environment Variable | Default |
|--------|------|----------------------|---------|
| Port | `-port` | `PORT` | `9000` |
| HLS Path | `-hls-path` | `HLS_PATH` | `/hls/` |
| HLS Directory | `-hls-dir` | `HLS_DIR` | `./hls` |

```bash
# Example: Custom path and directory
go run main.go -hls-path /s/ -hls-dir ./streams

# Using environment variables
HLS_PATH=/s/ HLS_DIR=./streams go run main.go
```

### Endpoints

- `GET /api/v1/streams`: Returns a JSON array of `StreamEntry` objects.
- `GET <HLS_PATH>*`: Serves static files from the configured HLS directory.

## HLS Testing

1. Place your HLS playlists (`.m3u8`) and segments (`.ts`) in the configured HLS directory (default: `mock-api/hls/`).
2. **Fallback Mechanism**:
   - If a requested file (e.g., `/s/Pony_Main.m3u8`) is missing, the server will check for:
     1. `mock-api/hls/default/Pony_Main.m3u8`
     2. `mock-api/hls/default.m3u8` (only for `.m3u8` requests)
   - This allows you to set up a single "default" stream that works for all streams unless overridden.
3. Access the files via the configured path, e.g., `http://localhost:9000/s/playlist.m3u8`.
4. The server provides the necessary CORS headers (including `Range` support) for HLS playback.

## Integration with Webview

To point the EBS webview to this mock server, ensure your `.env.development` (or `.env`) has the following:

```env
VITE_STREAM_BASE_URL=http://localhost:8080
```

Vite will prioritize `.env.development` during local development (`npm run dev`).

## Customizing Mock Data

You can modify the `streams` slice in `main.go` to add or change stream data for different testing scenarios.
