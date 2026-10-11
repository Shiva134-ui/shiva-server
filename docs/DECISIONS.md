# Main Web Decisions & Guardrails

Last Updated: 2026-10-11 18:30 IST

| Decision | Reason |
|---|---|
| Keep local Main Web frontend; send requests to `http://100.79.42.30:3001` (or `https://api.madesh.in`). | The frontend is not hosted on the physical server; Ubuntu must be the source of system data. |
| Use Vite `/api` proxy in development targeting the direct Tailscale IP (`http://100.79.42.30:3001`). | Keeps browser requests same-origin and bypasses Cloudflare WAF which blocks `/storage/files` requests as directory traversal attacks. |
| Dynamic 24h `startTime` sync from Dashboard to ESP32 Flash (`Preferences.h`). | Allows the user to change the morning wake time from the Web Dashboard without needing to re-flash the ESP32. Synced every 60s. |
| 30-Minute Morning Wake Catch-up Window. | If ESP32 boots at 08:05 AM due to a power blink, it still sends the wake packet instead of missing the entire day's scheduled boot. |
| Single-wake-per-day enforcement via `lastWakeDay`. | Prevents redundant magic packets from firing on afternoon or evening ESP32 reboots. |
| Dual Clock Sync: UDP NTP with HTTPS 443 `Date:` header fallback. | FTTH routers or ISPs often block UDP port 123. The HTTPS fallback over standard port 443 guarantees accurate time synchronization. |
| Autonomous NTP on ESP32 in IST (+5:30) for scheduled wake. | Decouples morning wake from the server (which is powered off). Layer 2 UDP broadcast WOL (`255.255.255.255:9`) can only originate on the local LAN. |
| `intentional_off` flag persisted in `powerConfig.json`. | Prevents unwanted auto-restart after power blinks if the user intentionally shut down the server or the 12:00 AM scheduled shutdown ran. |
| `autoResumeOnOutage` defaulted to `false`. | Prevents server from auto-booting unexpectedly after a power cut between 8 AM and 12 AM unless explicitly toggled on by user in the dashboard. |
| Sunday 10:00 AM automated backup via `backupScheduler.js`. | Dedicated background service decoupled from systemd timers, manageable from the UI, with direct FCM push notifications. |
| Support `X-ESP32-Token` in `auth.js` middleware. | Allows ESP32 to authenticate without requiring complex Firebase OAuth JWT handshakes. |
| Use TCP handshake (port 22) for local server ACK. | Eliminates the need for external `ESP32Ping` libraries; standard `WiFiClient` verifies server boot within milliseconds. |
| Persist power policies in ESP32 NVS Flash (`Preferences.h`). | Guarantees that when power cuts and the server is dead, the ESP32 still knows whether Auto-Resume is Enabled without needing cloud APIs. |
| Consolidate all project `.md` files in `docs/`. | Keeps repository root clean while ensuring standard docs hierarchy. |
| Automatic perpetual `.md` recording across `SERVER_PROJECTS`. | The AI assistant must automatically record every piece of information, action, and plan into markdown documentation across `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS`. |
| Never run local backend for live system checks. | A Windows backend returns laptop hardware/process data. |
| Keep Firebase ID token and production auth middleware unchanged. | Local debugging must not make production access weaker. |
| Dashboard layout is frozen. | User explicitly marked it final. |
| No fake fallback hardware or metrics. | Values must be sourced from Ubuntu; errors/unknown fields must remain honest. |
