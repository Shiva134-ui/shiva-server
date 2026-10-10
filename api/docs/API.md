# MΛDESH Server API Contract

This document outlines the API endpoints provided by the MΛDESH Server backend (`madesh-api`). 

## Base URL
All requests are prefixed with `/api/v1`

## Authentication Methods
1. **API Token (Server-to-Server)**
   Header: `x-api-token: <secret_token>`
2. **Firebase Auth (Client)**
   Header: `Authorization: Bearer <firebase_id_token>`

## Authorization
Some endpoints (e.g. power operations) require strict authorization. Only Firebase authenticated users whose UIDs are in the `SERVER_CONTROL_UIDS` allowlist are authorized.

---

### Public Endpoints

#### `GET /api/v1/health`
- **Auth required:** None
- **Description:** Returns basic health and version information.
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "madesh-server-api",
    "version": "2.0.0",
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
  ```

---

### Authenticated Read-Only Endpoints

All of these endpoints require either API Token or Firebase Auth.

#### `GET /api/v1/test-auth`
- **Description:** Verify authentication status.
- **Response:** `{ "authenticated": true, "uid": "...", "authMethod": "firebase" }`

#### `GET /api/v1/system`
- **Description:** OS and system architecture information.
- **Response:** `{ "hostname": "...", "platform": "linux", "arch": "x64", ... }`

#### `GET /api/v1/hardware`
- **Description:** Comprehensive physical hardware details.
- **Response:** 
  ```json
  {
    "cpu": { "model": "...", "cores": 8 },
    "memory": { "totalBytes": 16000000000 },
    "system": { "manufacturer": "...", "product": "..." },
    "gpu": "...",
    "disks": [ { "name": "sda", "sizeBytes": 1000000000000, "model": "...", "vendor": "..." } ],
    "sensors": { ... }
  }
  ```

#### `GET /api/v1/storage`
- **Description:** Detailed physical storage health, SMART status, partitions, and usage.
- **Response:**
  ```json
  {
    "disks": [
      {
        "name": "sda",
        "path": "/dev/sda",
        "model": "ST1000DM...",
        "type": "HDD",
        "rpm": 7200,
        "capacityBytes": 1000000000000,
        "usedBytes": 500000000000,
        "partitions": [
          { "name": "sda1", "mountPoint": "/storage/data", "usedBytes": 500000000000, "sizeBytes": 1000000000000 }
        ],
        "smart": { "passed": true, "temperature": 35 }
      }
    ]
  }
  ```

#### `GET /api/v1/cpu`
- **Description:** Realtime CPU utilization and load averages.
- **Response:** `{ "model": "...", "cores": 4, "logicalCores": 8, "usagePercent": 15, "loadAverage": { "1m": 0.5, ... } }`

#### `GET /api/v1/memory`
- **Description:** Realtime memory usage.
- **Response:** `{ "totalBytes": 16000000, "freeBytes": 8000000, "usedBytes": 8000000, "usedPercent": 50, "swapTotalBytes": 2000000, "swapUsedBytes": 0, "swapFreeBytes": 2000000 }`

#### `GET /api/v1/network`
- **Description:** Network interfaces, IPs, and TX/RX bytes.

#### `GET /api/v1/processes`
- **Description:** Top processes sorted by CPU usage.

#### `GET /api/v1/docker`
- **Description:** Docker system information.

#### `GET /api/v1/docker/containers`
- **Description:** List of Docker containers.

#### `GET /api/v1/docker/stats`
- **Description:** Live stats (CPU/Mem/Net) for containers.

#### `GET /api/v1/services`
- **Description:** Status of allowlisted systemd services (e.g. madesh-api, cloudflared).

#### `GET /api/v1/telemetry`
- **Description:** Aggregate endpoint returning CPU, memory, storage, and network summary.

#### `GET /api/v1/alerts`
- **Description:** Prometheus active alerts (if available).

#### `GET /api/v1/monitoring/chart`
- **Description:** Historical chart data for CPU, memory, and storage from Prometheus.

---

### Protected Control Endpoints

These endpoints strictly require **Firebase Auth** AND the user's UID must be in the `SERVER_CONTROL_UIDS` environment variable allowlist.

#### `POST /api/v1/power/restart`
- **Description:** Restarts the physical server.
- **Response:** `{ "success": true, "message": "Restarting server...", "timestamp": "..." }`

#### `POST /api/v1/power/shutdown`
- **Description:** Shuts down the physical server safely.
- **Response:** `{ "success": true, "message": "Shutting down server...", "timestamp": "..." }`

#### `POST /api/v1/services/:name/control`
- **Description:** Start, stop, or restart an allowlisted service.
- **Body:** `{ "action": "restart" }` // allowed: start, stop, restart

#### `POST /api/v1/docker/containers/:name/control`
- **Description:** Start, stop, or restart an allowlisted Docker container.
- **Body:** `{ "action": "restart" }` // allowed: start, stop, restart

#### `POST /api/v1/system/kill`
- **Description:** Kill a rogue process by PID.
- **Body:** `{ "pid": 1234, "signal": "SIGTERM" }`

---

## Error Handling
The API returns structured JSON errors and ensures no stack traces or sensitive environment variables leak to production responses.

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```
