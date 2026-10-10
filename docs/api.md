# MΛDESH Server Control API Documentation

**API Base URL**: `https://api.madesh.in/api/v1` (Cloudflare Tunnel Ingress)  
**Private Tailscale Mesh**: `http://100.79.42.30:3001/api/v1`  
**Host Loopback**: `http://127.0.0.1:3001/api/v1`  
**Protocol**: HTTP/1.1 & HTTP/2 with JSON payloads  
**Current Daemon Version**: `v2.0.0` running under `madesh-api.service` (Node.js v22 on Ubuntu 26.04 LTS x64)

---

## 1. Authentication & Security

All private endpoints enforce authorization via Bearer tokens. Two authentication mechanisms are supported:

1. **Pre-Shared API Bearer Token**:
   - Header: `Authorization: Bearer <API_TOKEN>`
   - Configured in `/etc/madesh-api/api.env` (`API_TOKEN`).
2. **Firebase Auth ID Token**:
   - Header: `Authorization: Bearer <FIREBASE_ID_TOKEN>`
   - Authenticated against Google Firebase Admin SDK (`/etc/madesh-api/firebase-service-account.json`).

> Public endpoints (e.g. `GET /api/v1/health` and `GET /api/v1/ping`) do not require authentication.

---

### 1.1 Auth Verification & Access

#### `GET /api/v1/auth/me`
- **Auth**: Required (Firebase ID Token via Authorization Header)
- **Description**: Returns the user's role (`admin`, `approved`, `pending`, `owner`) from the backend approval system. 

#### `GET /api/v1/auth/users`
- **Auth**: Required (Admin)
- **Description**: Lists all Firebase users that have signed into the dashboard, categorized by their approval status (`pending`, `approved`, `admin`).

#### `POST /api/v1/auth/users/approve`
- **Auth**: Required (Admin)
- **Body**: `{ "email": "user@example.com", "role": "approved" }`
- **Description**: Approves a pending user for dashboard access.

#### `POST /api/v1/auth/users/reject`
- **Auth**: Required (Admin)
- **Body**: `{ "email": "user@example.com" }`
- **Description**: Rejects and removes a pending user from the system.

---

## 2. Standard Response Envelope

Most query endpoints wrap responses in a standard JSON envelope:

```json
{
  "data": { ... },
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

Error responses return appropriate HTTP status codes:
```json
{
  "error": "Detailed error message",
  "status": 403,
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

---

## 3. Endpoints by Domain

### 3.1 Health & Connectivity

#### `GET /api/v1/health`
- **Auth**: None
- **Description**: Returns daemon health status, host uptime, and timestamp.
- **Response**:
```json
{
  "status": "ok",
  "uptime": 1245.8,
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `GET /api/v1/ping`
- **Auth**: None
- **Description**: Lightweight health check returning `"pong"`.

---

### 3.2 System & Hardware

#### `GET /api/v1/system`
- **Auth**: Required
- **Description**: Comprehensive system metrics including CPU model, load averages, memory utilization, architecture, kernel, and network IPs.
- **Response**:
```json
{
  "hostname": "madesh-server",
  "platform": "linux",
  "architecture": "x64",
  "kernel": "7.0.0-34-generic",
  "uptime": 1245.8,
  "uptimeFormatted": "20m 45s",
  "cpuCount": 4,
  "cpuModel": "Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz",
  "cpuUsage": 12.5,
  "totalMemory": 16777216000,
  "freeMemory": 9437184000,
  "usedMemory": 7340032000,
  "memoryUsagePercent": 43.7,
  "nodeVersion": "v22.23.2",
  "lanIp": "192.168.1.36",
  "tailscaleIp": "100.79.42.30",
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `GET /api/v1/system/cpu`
- **Auth**: Required
- **Description**: Deep CPU topology, vendor, microarchitecture, socket count, frequencies, caches (L1d, L1i, L2, L3), instruction flags, and hardware vulnerability mitigations.

#### `GET /api/v1/system/memory`
- **Auth**: Required
- **Description**: RAM topology, total visible, buffers/cached, swap usage, memory types (DDR4/DDR5), speeds, and physical DIMM slots via `dmidecode`.

#### `GET /api/v1/system/processes`
- **Auth**: Required
- **Description**: Top running host processes sorted by CPU and memory consumption.
- **Response fields per process**: `pid`, `name`, `command`, `user`, `cpuPercent`, `memoryPercent`, `memUsage`, `state`.

#### `GET /api/v1/system/hardware`
- **Auth**: Required
- **Description**: Full hardware inspection snapshot including motherboard vendor/model, BIOS/UEFI version and release date, PCI bus controllers, USB controllers, and thermal sensors.

#### `GET /api/v1/system/reboot-required`
- **Auth**: Required
- **Description**: Checks `/var/run/reboot-required` and returns package names requiring system restart.

---

### 3.3 Storage & File Management

#### `GET /api/v1/storage`
- **Auth**: Required
- **Description**: Storage overview: all mounted filesystems, root `/` partition utilization, external media mounts, total disk capacity, used/free bytes.

#### `GET /api/v1/storage/disks`
- **Auth**: Required
- **Description**: Physical block devices (`/dev/sda`, `/dev/nvme0n1`, etc.), drive vendor, model, rotational speed, health status, and partition tables.

#### `GET /api/v1/storage/files`
- **Auth**: Required
- **Query Params**:
  - `path` (string, optional, default: `/home/madesh`): Directory path to inspect (scoped for security to `/home/madesh`, `/media`, `/mnt`, `/opt`, `/var/backups`, `/var/log`).
- **Description**: Live directory traversal listing files and folders with file sizes, modified timestamps, permissions, and directory flags.
- **Response**:
```json
{
  "currentPath": "/home/madesh",
  "parentPath": "/home",
  "items": [
    {
      "name": "projects",
      "path": "/home/madesh/projects",
      "isDirectory": true,
      "size": 4096,
      "modified": "2026-10-04T10:00:00.000Z",
      "permissions": "rwxr-xr-x"
    },
    {
      "name": "docker-compose.yml",
      "path": "/home/madesh/docker-compose.yml",
      "isDirectory": false,
      "size": 1824,
      "modified": "2026-10-04T11:30:00.000Z",
      "permissions": "rw-r--r--"
    }
  ],
  "totalItems": 2,
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `POST /api/v1/storage/mkdir`
- **Auth**: Required (Admin)
- **Body**:
```json
{
  "path": "/home/madesh/new-folder"
}
```
- **Description**: Creates a new directory at the specified path (scoped to allowed directories).

#### `DELETE /api/v1/storage/files`
- **Auth**: Required (Admin)
- **Body or Query**: `?path=/home/madesh/temp.log` or `{ "path": "/home/madesh/temp.log" }`
- **Description**: Safely removes a file or directory at the specified path (scoped to allowed directories).

#### `GET /api/v1/storage/backups`
- **Auth**: Required
- **Description**: Scans server backup directories (`/var/backups`, `/home/madesh/backups`) and returns backup archives (tar.gz, sql, dump) and active systemd backup timers.
- **Response**:
```json
{
  "archives": [
    {
      "name": "nextcloud-db-backup.sql.gz",
      "path": "/var/backups/nextcloud-db-backup.sql.gz",
      "size": 52428800,
      "modified": "2026-10-04T02:00:00.000Z",
      "type": "database"
    }
  ],
  "timers": [
    {
      "name": "apt-daily.timer",
      "next": "Mon 2026-10-05 06:00:00 UTC",
      "left": "17h left",
      "last": "Sun 2026-10-04 06:00:00 UTC",
      "passed": "6h ago"
    }
  ],
  "totalArchives": 1,
  "totalTimers": 1,
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `POST /api/v1/storage/backups/create`
- **Auth**: Required (Admin)
- **Description**: Triggers an on-demand system backup archive creation in `/var/backups`.

#### `DELETE /api/v1/storage/backups/:name`
- **Auth**: Required (Admin)
- **Description**: Removes the specified backup archive from `/var/backups`.

---

### 3.4 Network & Firewall

#### `GET /api/v1/network`
- **Auth**: Required
- **Description**: Full network summary with all interfaces, MAC addresses, IPv4/IPv6 addresses, link status, and default routing gateways.

#### `GET /api/v1/network/interfaces`
- **Auth**: Required
- **Description**: Detailed network adapters list (`enp3s0`, `tailscale0`, `docker0`) with RX/TX packet counts, errors, and link speed.

#### `GET /api/v1/network/wan`
- **Auth**: Required
- **Description**: Public IP address, ISP provider name, GeoIP country/city, and gateway connection status.

#### `GET /api/v1/network/firewall`
- **Auth**: Required
- **Description**: Executes `sudo ufw status verbose` and parses default policies (inbound, outbound, routed) and active port forwarding and firewall rules.
- **Response**:
```json
{
  "status": "active",
  "logging": "on (low)",
  "defaultPolicies": {
    "incoming": "deny",
    "outgoing": "allow",
    "routed": "disabled"
  },
  "rules": [
    {
      "to": "22/tcp",
      "action": "ALLOW IN",
      "from": "Anywhere",
      "comment": "SSH"
    },
    {
      "to": "3001/tcp",
      "action": "ALLOW IN",
      "from": "100.64.0.0/10",
      "comment": "Tailscale API"
    }
  ],
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `POST /api/v1/network/firewall/toggle`
- **Auth**: Required (Admin)
- **Body**:
```json
{
  "enable": true
}
```
- **Description**: Executes `sudo ufw enable` or `sudo ufw --force disable` to switch host firewall protection state.

#### `POST /api/v1/network/firewall/rules`
- **Auth**: Required (Admin)
- **Body**:
```json
{
  "port": "8080",
  "proto": "tcp",
  "action": "allow",
  "from": "192.168.1.0/24"
}
```
- **Description**: Adds a new UFW firewall rule with specified port, protocol, action (allow/deny), and optional source IP/subnet.

#### `DELETE /api/v1/network/firewall/rules/:id`
- **Auth**: Required (Admin)
- **Description**: Deletes a firewall rule by numeric rule index (`sudo ufw --force delete <id>`).

#### `GET /api/v1/network/diagnostics`
- **Auth**: Required
- **Description**: Evaluates host ping latency (Cloudflare 1.1.1.1, Google 8.8.8.8, default LAN gateway), DNS resolution benchmark times, and Tailscale mesh daemon status.

---

### 3.5 Docker & Containers

#### `GET /api/v1/docker` & `GET /api/v1/docker/containers`
- **Auth**: Required
- **Description**: Inspects Docker daemon: returns running, stopped, and paused containers with image names, uptime, port mappings, and memory limits.

#### `GET /api/v1/docker/images`
- **Auth**: Required
- **Description**: Lists all local Docker images, repository tags, image IDs, created timestamps, and virtual disk size.

#### `GET /api/v1/docker/volumes`
- **Auth**: Required
- **Description**: Lists Docker persistent volumes, volume driver, mount points on host, and storage utilization.

#### `GET /api/v1/docker/networks`
- **Auth**: Required
- **Description**: Lists Docker bridge, host, and overlay networks, subnets, gateways, and attached containers.

#### `GET /api/v1/docker/:container/logs`
- **Auth**: Required
- **Query Params**: `lines` (number, default: 100)
- **Description**: Fetches the last standard output and standard error log lines from the specified container.

#### `POST /api/v1/docker/:container/start`
- **Auth**: Required (Admin)
- **Description**: Starts a stopped Docker container.

#### `POST /api/v1/docker/:container/stop`
- **Auth**: Required (Admin)
- **Description**: Gracefully stops a running Docker container.

#### `POST /api/v1/docker/:container/restart`
- **Auth**: Required (Admin)
- **Description**: Restarts a Docker container.

#### `POST /api/v1/docker/:container/pause`
- **Auth**: Required (Admin)
- **Description**: Suspends/pauses execution of all processes in the container.

#### `POST /api/v1/docker/:container/unpause`
- **Auth**: Required (Admin)
- **Description**: Resumes all paused processes within the container.

---

### 3.6 System & Application Logs

#### `GET /api/v1/logs/system`
- **Auth**: Required
- **Query Params**:
  - `lines` (number, default: 100, max: 1000): Number of journal entries.
  - `priority` (string, optional: `emerg`, `alert`, `crit`, `err`, `warning`, `notice`, `info`, `debug`).
  - `unit` (string, optional): Specific systemd service unit (e.g. `docker.service`, `madesh-api.service`).
- **Description**: Queries `journalctl --no-pager` and returns structured log lines with timestamps, units, and syslog priority.

#### `GET /api/v1/logs/docker`
- **Auth**: Required
- **Query Params**:
  - `container` (string, optional): Target container name or ID. If omitted, aggregates across all containers.
  - `lines` (number, default: 100).
- **Description**: Streams container log lines with stderr/stdout categorization.

#### `GET /api/v1/logs/audit`
- **Auth**: Required
- **Query Params**:
  - `lines` (number, default: 100).
- **Description**: Parses auth events (`/var/log/auth.log` or journald security facility): successful/failed SSH logins, sudo elevations, PAM session open/close events.

---

### 3.7 Administration

#### `GET /api/v1/admin/users`
- **Auth**: Required
- **Description**: Reads `/etc/passwd` and parses interactive accounts (`UID >= 1000`), system service daemons, login shells, home directories, and currently active login sessions (`who`).
- **Response**:
```json
{
  "users": [ ... ],
  "humanUsers": [
    {
      "username": "madesh",
      "uid": 1000,
      "gid": 1000,
      "comment": "Madesh,,,",
      "home": "/home/madesh",
      "shell": "/bin/bash",
      "isSystem": false
    }
  ],
  "activeSessions": [
    {
      "user": "madesh",
      "line": "pts/0",
      "loginTime": "2026-10-04 12:00",
      "comment": "(100.79.42.1)"
    }
  ],
  "totalUsers": 48,
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `POST /api/v1/admin/sessions/terminate`
- **Auth**: Required (Admin)
- **Body**:
```json
{
  "line": "pts/0"
}
```
- **Description**: Terminates an active terminal session using `pkill -9 -t <line>`.

#### `GET /api/v1/admin/updates`
- **Auth**: Required
- **Description**: Runs `apt list --upgradable` and checks `/var/run/reboot-required`. Returns total count and array of upgradable packages with current and new versions.
- **Response**:
```json
{
  "rebootRequired": false,
  "rebootPackages": [],
  "totalUpgradable": 55,
  "packages": [
    {
      "package": "docker-ce",
      "repository": "resolute",
      "newVersion": "5:29.8.2-1~ubuntu.26.04~resolute",
      "currentVersion": "5:29.7.2-1~ubuntu.26.04~resolute",
      "architecture": "amd64"
    }
  ],
  "lastChecked": "2026-10-04T12:45:00.000Z"
}
```

#### `POST /api/v1/admin/updates/refresh`
- **Auth**: Required (Admin)
- **Description**: Executes `sudo apt-get update` to synchronize package indices from Ubuntu repositories.

#### `POST /api/v1/admin/updates/upgrade`
- **Auth**: Required (Admin)
- **Description**: Initiates non-interactive package upgrade (`sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y`) in the background.

#### `GET /api/v1/admin/settings`
- **Auth**: Required
- **Description**: Comprehensive system host architecture, kernel release, timezone, API version, internal listening port, and firewall enforcement state.

---

### 3.8 Power & ESP32 Hardware Relay

#### `GET /api/v1/power/config`
- **Auth**: Required
- **Description**: Returns power automation settings: daily wake/shutdown schedules, power loss detection policy, and WOL parameters.

#### `POST /api/v1/power/config`
- **Auth**: Required (Admin)
- **Body**: Partial or complete power configuration JSON.

#### `GET /api/v1/power/esp32/events`
- **Auth**: Required
- **Description**: Returns hardware Wi-Fi relay telemetry, target host MAC address (`d8:bb:c1:4f:99:bc`), target IP (`192.168.1.36`), WOL retry settings, and power state events.
- **Response**:
```json
{
  "esp32Relay": {
    "targetHost": "192.168.1.36",
    "macAddress": "d8:bb:c1:4f:99:bc",
    "status": "active",
    "lastShutdownReason": "scheduled_shutdown",
    "powerLossDetection": true,
    "restorePowerAction": "policy",
    "wolRetryCount": 3,
    "wolRetryInterval": 30
  },
  "events": [],
  "timestamp": "2026-10-04T12:45:00.000Z"
}
```

#### `POST /api/v1/power/restart`
- **Auth**: Required (Admin)
- **Description**: Executes `/usr/local/sbin/madesh-server-restart` with sudo privileges to gracefully restart the host machine.

#### `POST /api/v1/power/shutdown`
- **Auth**: Required (Admin)
- **Description**: Executes `/usr/local/sbin/madesh-server-shutdown` with sudo privileges to gracefully power off the host machine.

#### `POST /api/v1/power/wake`
- **Auth**: None / Optional
- **Description**: Broadcasts a raw UDP Wake-on-LAN magic packet (6x 0xFF + 16x MAC) to `192.168.1.255:9` targeting MAC `d8:bb:c1:4f:99:bc` to power on the server.

#### `GET /api/v1/power/electricity`
- **Auth**: Required
- **Description**: Live electricity consumption telemetry: current watts, estimated cost this month, lifetime kWh, and electricity tariff rate.

#### `GET /api/v1/power/electricity/history`
- **Auth**: Required
- **Description**: Historical power usage data points and outage logs.

---

### 3.9 Notifications & Push Messaging (FCM)

#### `POST /api/v1/notifications/register`
- **Auth**: Required
- **Body**:
```json
{
  "token": "FCM_DEVICE_REGISTRATION_TOKEN",
  "platform": "web"
}
```
- **Description**: Registers browser FCM push notification token.

#### `POST /api/v1/notifications/test`
- **Auth**: Required
- **Description**: Sends a test push notification to registered devices.

### 3.10 System Services & Daemons

#### `GET /api/v1/services`
- **Auth**: Required
- **Description**: Returns live systemd service status across key host daemons (`docker`, `ssh`, `tailscaled`, `cloudflared`, `madesh-api`, `ufw`, `cron`, `systemd-resolved`, `rsyslog`, `nginx`, `mariadb`, `postgresql`, `redis`, etc.).

#### `POST /api/v1/services/:name/:action`
- **Auth**: Required (Admin)
- **URL Params**:
  - `name`: Target service unit (e.g. `docker`, `tailscaled`, `nginx`).
  - `action`: Service action: `start`, `stop`, `restart`, `reload`.
- **Description**: Executes `sudo systemctl <action> <name>.service` to manage host services.

---

## 4. Summary Table of All Routes

| Method | Endpoint | Description | Auth Required |
|:-------|:---------|:------------|:-------------:|
| `GET` | `/api/v1/auth/me` | Fetch user role and status | Yes |
| `GET` | `/api/v1/auth/users` | List all dashboard users | Yes (Admin) |
| `POST` | `/api/v1/auth/users/approve` | Approve a pending user | Yes (Admin) |
| `POST` | `/api/v1/auth/users/reject` | Reject a pending user | Yes (Admin) |
| `GET` | `/api/v1/health` | Daemon status & uptime | No |
| `GET` | `/api/v1/ping` | Connection ping-pong | No |
| `GET` | `/api/v1/system` | System hardware overview & metrics | Yes |
| `GET` | `/api/v1/system/cpu` | Detailed CPU topology & cache specs | Yes |
| `GET` | `/api/v1/system/memory` | RAM details & slot assignments | Yes |
| `GET` | `/api/v1/system/processes` | Active process table | Yes |
| `GET` | `/api/v1/system/hardware` | Motherboard, BIOS, PCI, USB, sensors | Yes |
| `GET` | `/api/v1/system/identity` | System hostname, OS, and release | Yes |
| `GET` | `/api/v1/system/reboot-required` | Check if kernel update needs reboot | Yes |
| `GET` | `/api/v1/storage` | All mounted drives & usage | Yes |
| `GET` | `/api/v1/storage/disks` | Physical block devices & SMART info | Yes |
| `GET` | `/api/v1/storage/files` | File explorer with scoped paths | Yes |
| `POST` | `/api/v1/storage/mkdir` | Create new folder in allowed path | Yes |
| `DELETE` | `/api/v1/storage/files` | Delete file or folder in allowed path | Yes |
| `GET` | `/api/v1/storage/backups` | Backup archives & system timers | Yes |
| `POST` | `/api/v1/storage/backups/create` | Trigger on-demand system backup | Yes |
| `DELETE` | `/api/v1/storage/backups/:name` | Remove backup archive | Yes |
| `GET` | `/api/v1/network` | Full networking summary | Yes |
| `GET` | `/api/v1/network/interfaces` | Network interfaces and byte stats | Yes |
| `GET` | `/api/v1/network/wan` | Public IP and ISP geo-location | Yes |
| `GET` | `/api/v1/network/firewall` | UFW status and rules table | Yes |
| `POST` | `/api/v1/network/firewall/toggle` | Enable or disable UFW firewall | Yes |
| `POST` | `/api/v1/network/firewall/rules` | Add new firewall allow/deny rule | Yes |
| `DELETE` | `/api/v1/network/firewall/rules/:id` | Delete firewall rule by rule number | Yes |
| `GET` | `/api/v1/network/diagnostics` | Ping latency, DNS & Tailscale check | Yes |
| `GET` | `/api/v1/docker` | Containers list and daemon status | Yes |
| `GET` | `/api/v1/docker/containers` | Detailed containers overview | Yes |
| `GET` | `/api/v1/docker/images` | Docker images and tags | Yes |
| `GET` | `/api/v1/docker/volumes` | Docker persistent storage volumes | Yes |
| `GET` | `/api/v1/docker/networks` | Docker bridge & host networks | Yes |
| `GET` | `/api/v1/docker/:container/logs` | Standard output/error container logs | Yes |
| `POST` | `/api/v1/docker/:container/start` | Start container | Yes |
| `POST` | `/api/v1/docker/:container/stop` | Stop container | Yes |
| `POST` | `/api/v1/docker/:container/restart` | Restart container | Yes |
| `POST` | `/api/v1/docker/:container/pause` | Pause container processes | Yes |
| `POST` | `/api/v1/docker/:container/unpause` | Unpause container processes | Yes |
| `GET` | `/api/v1/services` | Status of all host systemd services | Yes |
| `POST` | `/api/v1/services/:name/:action` | Start/stop/restart/reload systemd unit | Yes |
| `GET` | `/api/v1/logs/system` | Systemd journal log stream | Yes |
| `GET` | `/api/v1/logs/docker` | Container log stream | Yes |
| `GET` | `/api/v1/logs/audit` | SSH login & sudo authorization audit | Yes |
| `GET` | `/api/v1/admin/users` | Linux accounts and active sessions | Yes |
| `POST` | `/api/v1/admin/sessions/terminate` | Terminate active user login session | Yes |
| `GET` | `/api/v1/admin/updates` | APT pending upgrades & packages | Yes |
| `POST` | `/api/v1/admin/updates/refresh` | Synchronize APT package cache | Yes |
| `POST` | `/api/v1/admin/updates/upgrade` | Apply all pending APT upgrades | Yes |
| `GET` | `/api/v1/admin/settings` | Server settings & host architecture | Yes |
| `GET` | `/api/v1/storage/backup-schedule` | Weekly automated backup schedule | Yes |
| `POST` | `/api/v1/storage/backup-schedule` | Update weekly backup schedule | Yes |
| `GET` | `/api/v1/power/config` | Power automation schedule & outage config | Yes |
| `POST` | `/api/v1/power/config` | Update power schedule & outage settings | Yes |
| `POST` | `/api/v1/power/event` | Report ESP32 boot, power restored, or WOL sent | Yes (or X-ESP32-Token) |
| `GET` | `/api/v1/power/esp32/events` | ESP32 relay telemetry & event history | Yes |
| `POST` | `/api/v1/power/restart` | Controlled server restart | Yes |
| `POST` | `/api/v1/power/shutdown` | Controlled server shutdown (sets intentional_off) | Yes |
| `POST` | `/api/v1/power/wake` | Broadcast Wake-on-LAN magic packet | No |
| `GET` | `/api/v1/power/electricity` | Live watt usage & electricity costs | Yes |
| `GET` | `/api/v1/power/electricity/history` | Historical energy metrics | Yes |
| `GET` | `/api/v1/power/electricity/config` | Electricity tariff settings | Yes |
| `POST` | `/api/v1/notifications/register` | Register FCM push device token | Yes |
| `POST` | `/api/v1/notifications/test` | Test push notification dispatch | Yes |

