# MΛDESH project knowledge

## Main Web status and important facts

- Main Web source repository path: `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server`.
- **Global Server Projects Path**: `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS` (Contains `shiva-server`, `SERVER_INFO`, `manus-clone`, `nova`, `orca`, `keep`).
- Documentation Folder: All repository documentation is organized under `docs/`.
- Local frontend URL: `http://127.0.0.1:5173`.
- Production API: `https://api.madesh.in/api/v1`.
- Ubuntu MΛDESH server: Intel Core i3-3220, 12 GB RAM, Zebronics H61, MAC: `00:E0:22:DA:B1:67`, LAN IP `192.168.1.36`, Tailscale `100.79.42.30`.
- Physical Site: Father's house (FTTH Wi-Fi router, ESP32 on same extension box).
- Remote Site: Mother's house (User laptop & Android client).
- Outage Auto-Resume: Zero-API local TCP handshake check (`192.168.1.36:22`) + NVS flash memory persistence (`Preferences.h`).
- Theme: Claude Obsidian black/grey (`#0A0A0A` canvas, `#0F0F0F` sidebar/topbar, `#1A1A1A` cards, `#2A2A2A` borders, `#ECECEC` text).
- **Dashboard Tab (LOCKED & FROZEN)**:
  - 100% verified across Mobile (390px), Tablet (768px), and Desktop (1440px).
  - Quick Server Actions: 2-col responsive mobile grid, execution counters, countdown label inside button (`Waking (28s)`), and infinite spinner state cleared on timer completion.
  - Thermal Guard: Obsidian theme matched, unified white temperature gauge (`30°C` → `Limit 88°C` → `Trip 105°C`), smooth sans-serif font for Throttle Policy.
  - Current Power: Added Today's usage (`kWh`) and Today's bill (`₹`) subcards with green font.
  - Fonts: Loaded JetBrains Mono true bold weights (`400;500;600;700`) to eliminate synthetic bold jaggedness.
  - Offline Fallbacks: Storage and system stats display `--` when disconnected.
  - Host Online card removed from sidebar footer.
  - Project cleanup: removed all unneeded temporary files and folders.
- **System Tab (LOCKED & FROZEN)**:
  - 100% verified across Mobile, Tablet, and Desktop.
  - `/system-overview`: Unified Obsidian dark palette (`#0A0A0A`, `#0F0F0F`, `#1A1A1A`, `#2A2A2A`, `#ECECEC`), added 4-thread multi-core CPU indicator (i3-3220 @ 3.30GHz) with per-core dynamic load bars, updated storage and RAM cards, and refined offline fallbacks (`--`).
  - `/system-processes`: Offline fallback banner with Reconnect action, responsive slide-in details drawer (`lg:w-[340px] xl:w-[380px]`), Escape key dismissal, scroll lock on mobile, and smooth table layout.
  - `/system-temperatures` (NEW): Full hardware thermal telemetry for CPU package, physical cores, motherboard ACPI sensors, and storage drives (S.M.A.R.T.), with visual gauge meters and 88°C/105°C trip points.
  - `/system-services` (NEW): Complete **Auto-Start Manager** covering systemd services/daemons, Docker containers, and scheduled system timers, with live current state (Active/Running vs Inactive/Stopped), boot-time auto-start state (Enabled vs Disabled), 1-click boot-time enable/disable toggles (`systemctl enable/disable` & `docker update --restart unless-stopped/no`), lifecycle controls (start/stop/restart), scope tabs, and live search.
  - `/system-hardware`, `/system-maintenance`, `/system-terminal`: Obsidian theme matched, robust telemetry error boundaries, terminal presets, mobile-shortened prompt (`$`), and clean maintenance targets.
- **Mobile-Friendly Layout Audit (Dashboard through Network)**:
  - Sidebar: Added quick-close `X` button for mobile drawers alongside backdrop tap dismissal.
  - Responsive tables: Horizontal scrolling with sticky headers and responsive text sizes.
  - Responsive inputs & buttons: Quick action wraps, responsive command prompts, and responsive grid layouts (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-...`).
- **Hardware Thermal Telemetry Overhaul (100% Accurate)**:
  - Linux kernel `hwmon` driver (`/sys/class/hwmon/hwmon*` for `coretemp` on Intel Ivy Bridge i3-3220).
  - ATA S.M.A.R.T. Attribute 194 (`Temperature_Celsius`) and 190 (`Airflow_Temperature_Cel`) parsed directly; `smartctl` bitmask exit codes handled via `ignoreExitCode: true`.
  - Dynamic block device scan via `/sys/block` and `lsblk`.
  - Frontend object parsing bug fixed in `src/services/system.ts` (`thermal.coreTemps` object unpacked cleanly, eliminating `NaN` and artificial fallbacks).
  - Uninitialized state rendering cleanly as loading dashes rather than fake `65°C` / `38°C`.
- **Logs Tab UI Overhaul (Claude Obsidian Theme)**:
  - Removed fake macOS traffic-light window dots (`#FF5F56`, `#FFBD2E`, `#27C93F`).
  - Active pill button styling (`bg-white text-[#0A0A0A] font-semibold`) and `.claude-btn-secondary` actions.
  - Stream lines styled with `#666666` timestamps, subtle inline severity tags (`ERR`, `WARN`), and search highlight.
- **Branding & Notifications**:
  - Unified server and notification icon: Solid black square background with white monogram `'M'`.
  - Claude-inspired typography (`Source Serif 4`, `JetBrains Mono`) and spacing across all notification elements.
- **Administration & Services**:
  - Active SSH sessions detected via Linux socket stats (`ss -nt state established sport = :22`) and `ps sshd-session`.
  - Cron scheduler working with crontab persistence.
  - APT package cache and update runner end-to-end operational.
  - Settings tab: 5 sub-tabs working with target server MAC `00:E0:22:DA:B1:67`.
- **Command Palette (`Ctrl + K`)**:
  - Full keyboard navigation (`↑`/`↓`/`Enter`), obsidian dark theme (`#222222`), 27 routes indexed.
- **FATHER'S HOUSE REMINDER (MANDATORY)**:
  - Whenever the user mentions being at Father's house or going to Father's house, REMIND THEM to update ESP32 firmware (`esp32_code.txt`):
    1. **Widen morning wake trigger**: Change `timeinfo.tm_hour == 8 && timeinfo.tm_min == 0` to `timeinfo.tm_hour >= 8 && lastWakeDay != timeinfo.tm_mday` so it never misses the narrow 60s window.
    2. **HTTP Time Fallback**: Fetch time from Cloudflare wake gateway response (`Date:` header over HTTPS 443) as fallback in case FTTH router blocks UDP NTP port 123.
- **Current Target for Tomorrow**:
  - 1. User walkthrough across all pages of the web dashboard to verify and catch any final minor issues.
  - 2. Deploy and host the application to `cloud.madesh.in`.
  - 3. Flash physical ESP32 at Father's house using `esp32_code.txt`. Complete 100% project completion!

## Server project context from project conversations

- Ubuntu server infrastructure has included Ethernet/network setup, Tailscale, SSH, Docker, two mounted 1 TB drives, Portainer, Nextcloud, Nginx Proxy Manager, Prometheus, Grafana, cAdvisor, Node Exporter, SMART monitoring exporter and a UFW baseline.
- Intended server administration plan uses Tailscale for private administration; only intentionally public services are exposed through ports 80/443. Do not casually expose SSH, Portainer or admin panels.
- SHIVA is the current name for the user's personal AI project previously discussed as JARVIS. It is a separate feature area; don't conflate its plan with Main Web's server control/API.
- A project chat concerned Nextcloud Android all-folder upload and “File upload conflict”; this is unrelated to Main Web completion. The last known advice was to collect the exact error and avoid additional server changes/deleting files until evidence was available.

## Known source-level details

- Frontend API base uses `/api/v1` in DEV and `https://api.madesh.in/api/v1` otherwise.
- Vite proxies `/api` to `https://api.madesh.in` with TLS verification enabled.
- Existing API has routes for system/hardware/process data, Docker core, services, monitoring/alerts/telemetry, power/electricity, notifications, and SHIVA.
- Docker inventory routes for images/volumes/networks were added in local source only; check production deployment before relying on them.
- `api/src/server.js` applies Firebase-backed authentication to normal API routes. Admin/system control is further limited by server-side control middleware/allowlists.

## Project conversation review

The current project thread, “Resume Main Web SSD Debug”, and “Fix MΛDESH server API routing” are the authoritative Main Web work threads. Other project chats reviewed include “Madesh Server setup part1”, “ChatGPT Remote Capabilities”, “SHIVA AI Design”, “Compare Sandbox Tools”, “Continue JARVIS Development” and “Inspect Forge Project Files”. These provide server/SHIVA/continuity background; they do not override the explicit Main Web requirements above. Some older project material discusses separate NOVA/APK/AI work and must not be treated as Main Web scope.
