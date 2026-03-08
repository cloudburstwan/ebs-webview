# Stream Webview

A premium, high-performance HLS stream webview built with React, TypeScript, and OvenPlayer.

## Features

- **React Compiler**: Optimized with the latest React Compiler for maximum efficiency.
- **Dynamic Station Loading**: Load streams dynamically via URL parameters (`?station=name`).
- **Premium UI**: Glassmorphism design with responsive dark/light mode support.
- **OvenPlayer Integration**: Built-in support for low-latency HLS streaming.
- **Containerized**: Production-ready `Dockerfile` and `nginx.conf` included.
- **CI/CD**: Automated GitHub Action workflow for building and publishing Docker images.

## Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create or update `.env` file:
   ```env
   VITE_STREAM_BASE_URL=https://stream.equestria.horse/s/
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Docker/Podman Deployment

Build and run the container:
- You can use either docker or podman to build and run the container.

```bash
docker build -t ebs-webview .
docker run -p 8080:80 ebs-webview
```

## Configuration

The application uses environment variables for configuration:
- `VITE_STREAM_BASE_URL`: The base URL for the HLS streams. Defaults to `https://stream.equestria.horse/s/`.

## URL Parameters

- `station`: Specify the stream name (e.g., `?station=test`).
