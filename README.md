# MΛDESH Server Control & Web Dashboard

> **Enterprise Home Server Management, Telemetry, and Autonomous Power Automation System**
>
> Primary Workspace: `c:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server`  
> Master Server Projects Root: `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS`

---

## 🧭 Documentation Directory (`docs/`)

All project documentation, specifications, architecture handovers, and operating guidelines are organized in the [`docs/`](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs) directory:

| Document | Purpose & Description |
|:---|:---|
| [**CONTINUITY.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/CONTINUITY.md) | **Session Handover & Live State**: Immediate next steps, current deployment status, credentials, and verification checklist. |
| [**MEMORY.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/MEMORY.md) | **Perpetual Memory & Directives**: Permanent rules, server project home paths, and durable project context. |
| [**PROGRESS.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/PROGRESS.md) | **Milestone Progress Tracker**: Full record of implemented, deployed, and empirically verified milestones. |
| [**PLAN.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/PLAN.md) | **Roadmap & Phase Plan**: Phased decomposition of current objectives, verification boundaries, and next tasks. |
| [**ARCHITECTURE.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/ARCHITECTURE.md) | **System Architecture & Topology**: Remote Ingress (Mother's house) vs Physical Site (Father's house), power engine loops, and network maps. |
| [**DECISIONS.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/DECISIONS.md) | **Architecture Decision Records (ADRs)**: Technical decisions, trade-offs, and design rationale. |
| [**PROJECT_RULES.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/PROJECT_RULES.md) | **Operating Rules & GSD Canonical Protocol**: Search-first rules, empirical proof mandates, and perpetual auto-update requirements. |
| [**KNOWLEDGE.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/KNOWLEDGE.md) | **Technical Knowledge Base**: Hardware specs, port bindings, TCP handshakes, NVS flash partitions, and environment details. |
| [**REQUIREMENTS.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/REQUIREMENTS.md) | **System Requirements**: UI/UX standards, security invariants, and performance expectations. |
| [**GSD-STYLE.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/GSD-STYLE.md) | **Visual & UX Style Guide**: Claude-inspired dark theme tokens (#0E0E0D), typography, micro-interactions, and component conventions. |
| [**api.md**](file:///c:/Users/sivam/Documents/RDR2%20Backup/SERVER_PROJECTS/shiva-server/docs/api.md) | **API Reference**: Comprehensive endpoint documentation for `madesh-api.service`. |

---

## ⚡ Power Automation Summary

- **Morning Auto-Wake**: Autonomous 08:00 AM IST Wake-on-LAN blast from ESP32 to `00:E0:22:DA:B1:67`.
- **Nightly Auto-Shutdown**: Automated 00:00 (12:00 AM IST) shutdown via `powerEngine.js`.
- **Zero-API Blackout Auto-Resume**: ESP32 runs 25s line stabilization countdown, sends up to 3 WOL packets, and verifies server boot via instant TCP port 22 handshake.
- **Flash Persistence**: User setting (`Auto-Resume on Outage (8 AM – 12 AM)`) is permanently saved in ESP32 internal Flash (`Preferences.h`) and synced from dashboard every 60s.

---

## 🚀 Running the Frontend Locally

```bash
# Start local development server
npm run dev

# Compile for production check
npm run build
```
