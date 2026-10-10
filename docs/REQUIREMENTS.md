# Main Web requirements

## Product and visual design

- The Main Web must feel complete and functional across its tabs, with real, current server data wherever an API exists.
- Visual direction: Claude-inspired obsidian black and grey, compact and calm spacing, restrained text styling and readable font sizes.
- Use consistent spacing/type/surface patterns across pages. Ensure responsive layout and meaningful loading, empty, offline, unauthorized and retry states.
- Dashboard is final/frozen: no redesign or behavior change.

## Architecture and data

- Browser/frontend runs on the Windows laptop when developing.
- Server-side metrics/process/hardware/operations must come from the Ubuntu MΛDESH server via `https://api.madesh.in`.
- Local Vite `/api` proxy is a development transport detail. Do not run the backend on Windows for runtime hardware/process checks.
- Production browser requests use the production API base URL.
- No hardcoded physical hardware, server identifiers, current metrics, services or network addresses.
- No seeded/demo/fallback server data. Failures must be explicit and recoverable.
- Normalize API response shapes at service boundaries; distinguish a truly empty result from an API error.

## Security and existing behavior

- Keep Firebase authentication in client requests and production API authentication middleware intact.
- Preserve server-side `requireServerControl` and allowlists for power/process/service/container operations.
- Never make the API public or weaken auth to accommodate localhost/CORS problems.
- Preserve existing WOL/ESP32 flows, power scheduling and related configuration behavior.
- Do not expose raw remote terminal execution or unrestricted file operations without secure server-side APIs and explicit scope.
- Do not deploy to production as part of local code work without explicit authorization.

## Functional acceptance

- Each tab must either show verified live API data and working supported interactions, or precisely explain which authenticated API/capability is absent.
- Refresh/search/sorting/filter controls must work where offered and preserve correct server data.
- Processes detail drawer must fit the viewport and scroll its content without hiding the header/footer/actions.
- Hardware must be based on reliable Linux-provided information, reconcile with System Overview, and avoid unnecessary `--` or fake values. Use a clear unavailable label only when the server truly did not report that field.
- Errors/unauthorized states must not look like successful empty data.

## Verification acceptance

- Run build and lint after final edits.
- Verify through the real production Ubuntu API from the authenticated local frontend, not a Windows backend.
- Inspect the browser-visible route state and console/errors for representative tabs.
- Check no Dashboard redesign occurred.
- Record production-only/API deployment dependencies separately; do not claim unverified routes are complete.
