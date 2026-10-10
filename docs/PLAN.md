# Main Web completion plan

## Phase 1 — Stabilize the correct runtime

- Keep frontend on the Windows laptop and API/backend on Ubuntu via `https://api.madesh.in`.
- Confirm Vite is serving the intended source directory and eliminate stale browser/session state.
- Confirm Firebase login survives local proxy requests; do not change auth requirements.

## Phase 2 — Finish the System review

1. Overview: confirm all metrics identify the Ubuntu host, with meaningful loading/error/refresh timestamps.
2. Processes: verify live process inventory, search/sort/refresh, safe process control, and detail drawer scrolling/viewport behavior.
3. Hardware: verify Linux-provided CPU, memory, disks, motherboard, network and platform data; remove fake defaults and reconcile counts across overview/hardware.

## Phase 3 — Complete supported data tabs

- Docker: validate containers/stats and action allowlist; confirm whether image/volume/network endpoints are deployed before enabling those pages as live.
- Monitoring: confirm metrics and alerts against actual API schemas; provide truthful empty/error states.
- Network: display server-reported interfaces, addresses, default route and counters. Do not imply active WAN probes/firewall configuration when no backend route exists.
- Services: display only the service allowlist and status returned by `/services`.
- Storage: use `/storage` and hardware disk inventory for disks. Do not invent general file/backup APIs.
- Power: preserve existing configuration, electricity and WOL controls; read through current APIs, leave operational actions protected.
- Notifications: validate real rules/history/device APIs and guarded write operations.
- SHIVA: validate its separate API/data path and preserve the AI feature's own auth/access design.

## Phase 4 — Mark unsupported areas honestly

- Identify each remaining route and its backing API.
- For unsupported routes (logs, terminal, remote view, backup/file management, admin users/updates/settings, unknown Grafana/Prometheus entry URLs), show a precise “server API does not expose this yet” state rather than false success, dummy data, or unsafe local behavior.
- Propose new APIs separately with least privilege; do not deploy them in this task.

## Phase 5 — Visual and interaction quality

- Apply consistent obsidian black/grey palette, compact neutral typography, restrained hierarchy, and Claude-inspired spacing across the application.
- Keep Dashboard layout frozen; review only whether global theme tokens remain compatible.
- Check responsive overflow, focus states, keyboard interaction, busy/error/empty states and scroll behavior.

## Phase 6 — Verification (Completed October 5, 2026)

- [x] Run current build and lint: `tsc -b && vite build` compiled cleanly in 5.98s with 0 errors.
- [x] Hardware on-site deployment at Father's House: ESP32 flashed, tested, and verified on COM11.
- [x] Wake-on-LAN verified end-to-end: remote wake signal received and Ubuntu server booted up.
- [x] Zero-API local outage recovery verified: ESP32 detected boot, sent WOL, verified server TCP port 22 ACK within 12 seconds.
- [x] NVS flash memory persistence verified: auto-resume toggle cached locally across power cuts.

## Phase 7 — Mother's House Remote Operations (Current / Next Phase)

1. **Remote Ingress Verification**: Confirm access from Mother's house via Cloudflare Tunnel (`api.madesh.in`), Tailscale (`100.79.42.30`), and Android app.
2. **Overnight Automation Monitoring**: Observe automated 00:00 (12:00 AM IST) shutdown and automated 08:00 AM IST morning wake.
3. **Android App OTA & Telemetry**: Continue enhancements for `MadeshServerControl-source` app with direct APK updates and remote controls.
4. **Perpetual Documentation**: Maintain all updates automatically across `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS` in `docs/`.

## Release boundary

Source changes and local verification do not authorize production deployment. Review the concrete backend/API and frontend release separately before publishing.
