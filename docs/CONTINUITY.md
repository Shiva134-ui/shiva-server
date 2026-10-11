# Main Web Continuity & Session Handover

Last updated: 2026-10-11 18:30 IST (Production-Ready v1.0 Finalized | Father's House Handover Complete)

---

## 🎯 Executive Status & Handover Summary

```text
========================================================================================
                      MΛDESH SERVER INFRASTRUCTURE HANDOVER STATUS
========================================================================================
  Current Site Context: User is departing Father's House.
  Firmware Status     : esp32_code.txt v1.0 Flashed & Live-Verified on Hardware (COM11).
  Web Dashboard       : 100% Complete & Hosted on cloud.madesh.in (30/30 Tabs Verified).
  Remote Ingress      : Cloudflare Tunnel (api.madesh.in) & Tailscale (100.79.42.30) Active.
  Next Working Site   : Mother's House (Remote administration via Web & Android client).
========================================================================================
```

---

## 📋 Comprehensive Feature Matrix & Verification

| Capability | Controlled From | Backed By | Behavior & Safeguards | Status |
|---|---|---|---|---|
| **Scheduled Auto-ON** | Web Dashboard `/power-management` | ESP32 Firmware + NVS Flash | Fires WOL magic packets at configured 24h `startTime` (default 08:00 IST). Widened 30-min catch-up window. Skips wake if server is already online. Only fires once per calendar day (`lastWakeDay`). | 🟢 100% Production Ready |
| **Scheduled Auto-OFF** | Web Dashboard `/power-management` | Node.js `powerEngine.js` | Evaluates every 30s. At configured 24h `shutdownTime` (default 00:00 / 12 AM IST), triggers `/usr/local/sbin/madesh-server-shutdown` and dispatches FCM push notification. | 🟢 100% Production Ready |
| **Outage Auto-Resume** | Web Dashboard `/power-management` | ESP32 Zero-API Local Handshake | When power returns after a blackout, waits 25s for router/power to settle. Checks local TCP `192.168.1.36:22`. If server is down and policy is Enabled, wakes server (8 AM - 12 AM IST only). | 🟢 100% Production Ready |
| **On-Demand Remote Wake** | Dashboard / Android App | Cloudflare Gateway + ESP32 Polling | POST to `https://wake.madesh.in/wake`. ESP32 polls `/poll` every 8s, receives trigger, broadcasts UDP WOL, and acknowledges gateway. | 🟢 100% Production Ready |
| **Dual Clock Sync** | Hardware Layer | NTP UDP 123 + HTTPS 443 | Syncs with `pool.ntp.org` / `time.google.com` (IST +5:30). If UDP 123 is blocked by FTTH router, falls back to parsing `Date:` header from Google/Cloudflare over HTTPS 443. | 🟢 100% Production Ready |
| **Flash Memory Caching** | ESP32 Hardware | internal NVS Flash (`Preferences.h`) | Syncs with `/api/v1/power/config` every 60s while server is online. Preserves `dailyWake`, `wakeHour`, `wakeMin`, `autoResume`, and `lastWakeDay` across blackouts. | 🟢 100% Production Ready |
| **SSH Watchdog** | Web Dashboard `/admin-settings` | Linux Kernel Socket Stats (`ss`) | Accurately inspects Ubuntu 24.04 OpenSSH 9.6+ sessions using `ss -nt state established sport = :22` and process table checks. | 🟢 100% Production Ready |
| **Thermal Telemetry** | Web Dashboard `/system-temperatures` | Linux Kernel `hwmon` & S.M.A.R.T. | Real kernel temperatures from `coretemp` and ATA S.M.A.R.T. (194/190). Zero fake fallbacks. Displays true hardware limits (88°C warn / 105°C trip). | 🟢 100% Production Ready |

---

## 🔄 End-to-End Operational Workflows

### 1. Daily Lifecycle Flow
```text
  08:00 AM IST                                                     00:00 (12 AM IST)
  ────────────                                                     ─────────────────
  [ESP32 Clock]                                                    [powerEngine.js]
        │                                                                  │
        ▼                                                                  ▼
  Fires WOL Packet ──────────────────────────────────────────► Graceful Linux Shutdown
  (Server Boots)                                                   (Server Sleeps)
        │                                                                  │
        ▼                                                                  ▼
  Clears intentional_off                                           Sets intentional_off
  FCM: "Server Online"                                             FCM: "Nightly Shutdown"
        │                                                                  │
        └───────────────── 8 AM - 12 AM Operating Window ─────────────────┘
```

### 2. Blackout Recovery Flow
```text
  [Power Cuts Out] ───► Server & ESP32 Shut Down Together
                              │
  [Power Restores] ───► ESP32 Boots Instantly (< 2s)
                              │
                        25s Router & PSU Stabilization Delay
                              │
                        Checks Local Handshake: 192.168.1.36:22
                              ├── If Online  ──► Suppresses WOL, sends HTTP 200 event
                              └── If Offline ──► Reads NVS: If Enabled & 8AM-12AM: Wakes Server
```

---

## ⚡ ESP32 Firmware Flashing Guide (Quick Reference)

If flashing or re-flashing `esp32_code.txt`:
1. **Open Arduino IDE**.
2. **Select Board**: `ESP32 Dev Module`.
3. **Select Port**: `COM11` (or active Silicon Labs CP210x COM port).
4. **Copy Code**: Paste the complete code from [esp32_code.txt](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/esp32_code.txt).
5. **Upload Settings**:
   - Flash Frequency: 80MHz
   - Flash Mode: QIO
   - Upload Speed: 921600 (or 115200 for stability)
6. **Verify Serial Monitor** (115200 baud):
   ```text
   [WIFI] Connected! IP: 192.168.1.x
   [NTP] Time synchronized successfully! Current IST Time: ...
   [Preferences] Loaded NVS Config: autoResume=..., dailyWake=..., wakeTime=08:00
   [Power Recovery] Checking if server needs auto-wake...
   ```

---

## 🌐 Remote Operations from Mother's House

When operating from Mother's house:
1. **Web Dashboard**: Open `https://cloud.madesh.in` (or run local Vite frontend pointing to `https://api.madesh.in/api/v1`).
2. **Android App**: Launch `MΛDESH Server Control` on Android phone.
3. **Tailscale VPN**: Connect to `100.79.42.30` for direct terminal or Samba file access (`\\100.79.42.30\Seagate`).
4. **Cloudflare Status**: Cloudflare tunnel handles all HTTPS traffic seamlessly to `127.0.0.1:3001`.

---

## 🔑 Critical Network & Credential Reference

| Resource | Target | Access Detail |
|---|---|---|
| **Server LAN IP** | `192.168.1.36` | Father's house local subnet |
| **Server MAC** | `00:E0:22:DA:B1:67` | Target for Wake-on-LAN packets |
| **Server Tailscale** | `100.79.42.30` | Secure WireGuard mesh IP |
| **Public API** | `https://api.madesh.in` | Cloudflare Ingress |
| **Web Dashboard** | `https://cloud.madesh.in` | Hosted Vercel production deployment |
| **Cloudflare Wake Poller** | `https://wake.madesh.in/poll` | Polled every 8s by ESP32 |
| **ESP32 API Token** | `399d1a8c07f84460a525470ad5301bc6bfe4dee87763415281748efd7dae18f1` | Sent via `X-ESP32-Token` header |
| **Cloudflare Wake Token** | `80e0140eb46046db8bd0e216bf7c938d3d6ef0a0896947158acc95c5a28f39c4` | Sent via `X-Wake-Token` header |
