# MΛDESH Server & Web Architecture

Last Updated: 2026-10-11 18:30 IST | Production-Ready v1.0 Architecture

---

## 1. System Topology & Dual-Site Network Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MOTHER'S HOUSE (Remote Site)                             │
│                                                                                        │
│   ┌──────────────────────────────┐              ┌──────────────────────────────────┐   │
│   │   React / Vite Web Client    │              │  MΛDESH Server Control Android   │   │
│   │   - https://cloud.madesh.in  │              │  - Native Kotlin / Jetpack App   │   │
│   │   - http://127.0.0.1:5173    │              │  - Dual Auth: Token + Firebase   │   │
│   └──────────────┬───────────────┘              └────────────────┬─────────────────┘   │
└──────────────────┼───────────────────────────────────────────────┼─────────────────────┘
                   │                                               │
                   ▼                                               ▼
      Cloudflare Ingress (HTTPS) & Tailscale WireGuard Mesh (100.79.42.30)
                   │                                               │
┌──────────────────▼───────────────────────────────────────────────▼─────────────────────┐
│                            FATHER'S HOUSE (Physical Server Site)                       │
│                                                                                        │
│   FTTH Wi-Fi Router (SSID: FTTH | Gateway: 192.168.1.1 | Subnet: 192.168.1.0/24)      │
│                                                                                        │
│   ┌─────────────────────────────────────────┐   WOL UDP:9   ┌──────────────────────┐   │
│   │   NodeMCU ESP32 Automation Controller   │──────────────►│  MΛDESH Server Host  │   │
│   │   - IP: 192.168.1.x (DHCP)              │  (Broadcast)  │  (enp2s0 Interface)  │   │
│   │   - NTP IST Clock (+5:30)               │               │  - MAC:              │   │
│   │   - HTTPS Date: Fallback (Port 443)     │◄──────────────┤    00:E0:22:DA:B1:67 │   │
│   │   - NVS Flash Memory (Preferences.h)    │  TCP :22 ACK  │  - LAN: 192.168.1.36 │   │
│   │   - Polls https://wake.madesh.in/poll   │ (Boot Check)  │  - Tailscale:        │   │
│   │   - Syncs /api/v1/power/config (60s)    │               │    100.79.42.30      │   │
│   │   - Shared Power Extension Box          │               │  - Ubuntu 24.04 LTS  │   │
│   └─────────────────────────────────────────┘               │  - Node.js API (:3001)│  │
│                                                             └──────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Automation Workflows

### 🔄 Workflow 1: End-to-End Autonomous Auto-ON (Configurable 24h Time)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant Dash as Web Dashboard / Android
    participant API as Node.js API (/api/v1/power)
    participant ESP as ESP32 Hardware (COM11)
    participant PC as Physical Server (00:E0:22:DA:B1:67)

    Note over User,Dash: Configuration Phase (Anytime)
    User->>Dash: Configures Auto-Start Time (e.g. 08:00) & Enables Toggle
    Dash->>API: POST /api/v1/power/config {dailyStartEnabled: true, startTime: "08:00"}
    API-->>Dash: HTTP 200 {success: true}

    Note over ESP,API: Continuous Sync Phase (Every 60s)
    ESP->>API: GET /api/v1/power/config (with X-ESP32-Token)
    API-->>ESP: {dailyStartEnabled: true, startTime: "08:00", autoResumeOnOutage: ...}
    ESP->>ESP: Parses & Saves to NVS Flash: dailyWake=true, wakeHour=8, wakeMin=0

    Note over ESP,PC: Scheduled Trigger Execution Phase
    ESP->>ESP: Internal NTP Clock reaches target (08:00 - 08:30 IST window)
    ESP->>ESP: Checks lastWakeDay != today && dailyWake == true
    ESP->>ESP: Tests TCP 192.168.1.36:22 (Is server already ON?)
    alt Server is Already Online
        ESP->>ESP: Skips WOL burst (prevents redundant spam)
    else Server is Offline
        ESP->>PC: Broadcasts 3x UDP Magic Packet (255.255.255.255:9)
        ESP->>ESP: Records lastWakeDay = today in NVS Flash
        PC->>PC: Motherboard PCIe WOL triggers ACPI Power-On
        PC->>PC: Ubuntu boots, starts docker containers & madesh-api
        PC->>API: powerEngine.js clears intentional_off = false
        API->>Dash: Dispatches FCM Notification: "MΛDESH Server is Online"
    end
```

---

### 🌙 Workflow 2: End-to-End Autonomous Auto-OFF (Configurable 24h Time)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant Dash as Web Dashboard / Android
    participant API as Node.js API & powerEngine.js
    participant OS as Ubuntu Linux OS (/usr/local/sbin)
    participant FCM as Firebase Cloud Messaging

    Note over User,Dash: Configuration Phase
    User->>Dash: Sets Auto-Shutdown Time (e.g. 00:00 / 12 AM) & Active Days
    Dash->>API: POST /api/v1/power/config {dailyShutdownEnabled: true, shutdownTime: "00:00"}
    API-->>Dash: HTTP 200 {saved in powerConfig.json}

    Note over API,OS: Execution Phase (Runs on Server)
    loop Every 30 Seconds Tick
        API->>API: Evaluates current IST time vs shutdownTime
    end
    Note over API: 00:00 IST Reached!
    API->>API: Sets intentional_off = true, lastShutdownReason = 'scheduled_shutdown'
    API->>FCM: Dispatches Push Notification: "Nightly Shutdown (12:00 AM IST)"
    API->>OS: Spawns sudo /usr/local/sbin/madesh-server-shutdown
    OS->>OS: Flushes dirty disk buffers, stops containers, powers off ACPI
```

---

### ⚡ Workflow 3: Zero-API Local Power Outage Recovery Engine

```mermaid
flowchart TD
    A([Power Cut Occurs]) --> B[Server and ESP32 Power Down Simultaneously]
    B --> C([Mains Power Restored])
    C --> D[ESP32 Boots with Extension Box < 2s]
    D --> E[Wait 25s Stabilization Delay<br/>Allow FTTH Router Wi-Fi & PSU to Settle]
    E --> F[Connect to Wi-Fi SSID 'FTTH']
    F --> G[Sync NTP Time + HTTPS 443 Fallback]
    G --> H[Check Local TCP Handshake<br/>192.168.1.36:22]
    
    H -- Server Already Online --> I[Suppress WOL Packets<br/>Log 'Already Online']
    I --> J[Send 'power_restored' Event to API<br/>HTTP 200 OK]
    J --> K([System Ready])
    
    H -- Server Offline --> L{Read NVS Flash:<br/>autoResumeOnOutage?}
    L -- Disabled --> M[Log Policy Disabled<br/>Leave Server OFF]
    M --> K
    
    L -- Enabled --> N{Check IST Hour:<br/>8 AM <= Hour < 24 PM?}
    N -- Night Window (00:00 - 08:00) --> O[Sleep Window Active<br/>Leave Server OFF]
    O --> K
    
    N -- Operational Window --> P[Fire Burst of 3x WOL Packets]
    P --> Q[Poll TCP Port 22 Every 3s]
    Q -- ACK Received ~12s --> R[Confirm Boot Success]
    R --> S[Send 'power_restored' Event to API]
    S --> K
    Q -- Timeout 3 Retries --> T[Safety Backoff<br/>Avoid Infinite Loop]
    T --> K
```

---

### 🚀 Workflow 4: Remote On-Demand Wake (Cloudflare Gateway)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant Client as Web / Android App (Mother's House)
    participant CF as Cloudflare Gateway (wake.madesh.in)
    participant ESP as ESP32 (Father's House)
    participant PC as MΛDESH Server

    User->>Client: Clicks "Wake Server"
    Client->>CF: POST https://wake.madesh.in/wake {token: "80e014..."}
    CF-->>Client: HTTP 200 {queued: true}
    
    Note over ESP,CF: ESP32 polls CF every 8 seconds
    ESP->>CF: GET https://wake.madesh.in/poll
    CF-->>ESP: HTTP 200 {wake: true}
    
    ESP->>ESP: Detects Remote Wake Signal!
    ESP->>PC: Broadcasts UDP WOL Magic Packet (255.255.255.255:9)
    ESP->>CF: POST /ack (clears pending wake state)
    PC->>PC: ACPI boots, server comes online
```

---

## 3. Storage Hierarchy & Disk Topology

The physical server uses a tri-tier storage layout designed for workload isolation and thermal management:

| Tier | Drive | Device & Model | Mount Path | Purpose & Active Workloads |
|---|---|---|---|---|
| **Tier 1** | **Consistent SSD (128 GB)** | `sdc` / LVM `/dev/ubuntu--vg-ubuntu--lv` | `/` | Ubuntu 24.04 OS, systemd daemons, root filesystem, Docker container overlays. |
| **Tier 2** | **Primary Seagate HDD (1.00 TB • 7200 RPM)** | `sdb` / `ST1000DM003` | `/storage/seagate` | **Primary High-Speed HDD**: Active Git repositories, Opus AI data (`/storage/seagate/opus/data`), Keep SQLite database & uploads (`/storage/seagate/keep`), Windows Samba SMB share (`\\100.79.42.30\Seagate`). |
| **Tier 3** | **Secondary WD Blue HDD (1.00 TB • 5400 RPM)** | `sda` / `WD10EZRZ-00H` | `/storage/wd` | **Secondary Bulk Storage**: Nextcloud cloud storage (`/storage/wd/nextcloud`), Immich photo/video library (`/storage/wd/immich`), Weekly backup tarballs (`/storage/wd/backups`). |

---

## 4. Hardware Telemetry & Thermal Protection Specifications

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       KERNEL HARDWARE MONITORING PIPELINE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. CPU Temperature Telemetry:                                              │
│     - Linux driver: coretemp (/sys/class/hwmon/hwmon*)                      │
│     - Package Sensor: temp1_input (Total package temperature)               │
│     - Core Sensors: temp2_input, temp3_input (Physical Core 0 & Core 1)     │
│     - ACPI Zones: /sys/class/thermal/thermal_zone* (x86_pkg_temp)           │
│                                                                             │
│  2. Storage Drive Telemetry:                                                │
│     - SMART Attribute 194: Temperature_Celsius                              │
│     - SMART Attribute 190: Airflow_Temperature_Cel                          │
│     - SMART Bitmask Exit Code Override: ignoreExitCode: true in command.js  │
│                                                                             │
│  3. Safety Thresholds:                                                      │
│     - Normal Baseline: 85°C - 90°C (Passive heatsink in Father's house)     │
│     - Thermal Warning: 88°C (Dashboard badge turns amber)                   │
│     - Heavy Load Spike: 94°C - 96°C (Immich ML / container boot)            │
│     - Hardware Cutoff: 105°C (Intel THERMTRIP# hardware shutoff limit)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. ESP32 Non-Volatile Storage (NVS) Memory Map

The ESP32 uses Arduino `<Preferences.h>` to store all policies in flash memory namespace `"pwr"`:

| Key | Type | Default | Description |
|---|---|---|---|
| `autoResume` | `bool` | `false` | Outage recovery policy (wake server when power returns). |
| `dailyWake` | `bool` | `true` | Scheduled autonomous wake policy. |
| `wakeHour` | `uint8` | `8` | Hour of day (0-23 in IST) for autonomous wake. |
| `wakeMin` | `uint8` | `0` | Minute of hour (0-59 in IST) for autonomous wake. |
| `lastWakeDay` | `int` | `-1` | Day of the month (1-31) of the last executed wake burst. Prevents double-firing. |

All keys survive power cuts, brownouts, and manual reboots.
