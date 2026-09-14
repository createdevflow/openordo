# Chartwell Admin Repair Pass — BUILD LOG

## Ambiguity Decisions

- **SQLite vs PostgreSQL**: Schema uses SQLite. Added `PlatformFlag`, `Feature`, `PlanFeature` models while keeping SQLite compatibility (no enum types, string fields instead).
- **`Plan.features` field**: Kept the existing `String` (JSON array) field as `extraBullets` semantically. The Plan Builder will write computed features from `PlanFeature` relations plus any extra bullets stored in the JSON field.
- **PlanFeature vs existing features**: Existing plan data using `features` string will still render. New plans built with the builder use `PlanFeature` rows. Backward-compatible.
- **Radix Tabs in Settings**: Using `@radix-ui/react-tabs` for the tabbed settings control center.
- **Sidebar mobile menu**: Implemented via CSS only (hamburger toggle via checkbox hack) to avoid adding a state-management dependency to a Server Component layout. 
- **Maintenance mode enforcement**: `PlatformFlag.MAINTENANCE_MODE` checked in middleware. Stubbed as a TODO since middleware changes can affect the entire app.

## TODO Stubs

- [ ] `MAINTENANCE_MODE` flag: Wire middleware to check `db.platformFlag` for this key and redirect non-admin routes to a maintenance page. Currently seeded but not enforced.
- [ ] Stripe mode indicator in Settings: reads `process.env.STRIPE_SECRET_KEY` — if it starts with `sk_live_` show "Live", else "Test". Currently stubbed.
- [ ] File upload for branding logo: Stubbed as a URL field — real upload requires S3/Cloudinary setup.
- [ ] `PUBLIC_REGISTRATION` flag enforcement: Needs middleware check on `/register` route.
- [ ] Clinic detail page `/admin/clinics/[clinicId]`: Built as a full page in this pass.
- [ ] Email sending (Resend/Postmark): Not wired — all email triggers are TODO stubs.

---

## Video Consultation Call Screen Repair Pass — Decisions & Stubs

### Camera/Mic Bug Fix (Section 1)
- **Approach used: `track.enabled = false/true`** (not `track.stop()`).
- Rationale: `track.enabled = false` pauses the hardware indicator in Chrome/Edge/Firefox and allows instant re-enable without re-requesting camera permission. The `track.stop()` fallback was not needed — current target browsers (Chrome ≥ 90, Safari ≥ 15, Firefox ≥ 100) all honour `enabled = false` correctly for the hardware indicator.
- The `<video>` element is always mounted in the DOM. The PIP tile switches between the live `<video>` and an `AvatarPlaceholder` (with the user's actual `colorTag`) based on `cameraOn` state — no frozen frame or black box is ever shown.
- Mic toggle was already using `track.enabled` correctly before this pass; verified and preserved.

### Ambiguity Decisions
- **`remoteCameraOn` flag**: No WebRTC provider (Daily.co/Twilio) is wired in the local build. `remoteCameraOn` is kept as a `useState(true)` that can be set by real track-enabled/disabled events from the video provider when integrated. Defaulted to `true` so the avatar placeholder shows "Camera off" state only when explicitly triggered.
- **Remote peer video tile**: Since no real WebRTC stream exists, the remote tile renders `AvatarPlaceholder` using the patient's `colorTag` from the DB. When a real stream provider is integrated, replace the avatar `div` with the provider's `<VideoTile>` component.
- **E-Prescriptions plugin slug**: Used `"e-prescriptions"` — verify this matches the exact `slug` value seeded in the `Plugin` table.
- **Doctor `colorTag`**: The `Doctor` model may not have a `colorTag` field. Fell back to `var(--amber)` (`#C8862B`) for the doctor's PIP avatar. If/when a `colorTag` is added to `Doctor`, update the `doctorColor` derived value.

### Stubs
- [ ] Real WebRTC video stream (Daily.co / Twilio / LiveKit): remote tile currently shows AvatarPlaceholder; replace with provider's video component.
- [ ] `remoteCameraOn` real event: wire to provider's `track-subscribed`/`track-disabled` events — the `remoteCameraOn` state now comes from the presence API heartbeat, which carries each participant's self-reported camera state. This is accurate for the UI label but doesn't actually show the remote video stream.
- [ ] Autosave notes to `MedicalRecord` draft: textarea content currently held in local state only; needs a debounced server action.
- [ ] Draggable PIP tile: fixed position for now (spec says draggable is a nice-to-have, not required).
- [ ] Presence API multi-process: `/api/room/[roomId]` uses an in-memory Map. Works correctly for single-process dev (Next.js dev server) and single-instance production. For multi-instance/serverless, migrate the store to Redis or a DB table.

---

## Bug Fix Pass — Live Testing (Sept 12)

### Bug 2: Camera hardware indicator not clearing (FIXED)
- **Root cause confirmed:** `track.enabled = false` does NOT release the OS camera indicator in Chrome on desktop (confirmed by screenshot showing blue tab indicator while UI shows "cam off").
- **Fix applied:** Camera toggle now calls `track.stop()` + `stream.removeTrack(track)` + `videoRef.srcObject = null` on off; calls fresh `getUserMedia({ video: true })` on re-enable, rebuilds a display stream with the existing audio track, reattaches to `<video>`.
- **Mic toggle unchanged:** Kept `track.enabled` for audio — no OS hardware indicator issue observed for microphone in current target browsers.
- **QA checklist for verifier:** Toggle camera off → confirm browser tab recording dot clears; toggle back on → confirm live preview resumes without re-requesting permission.

### Bug 1: Remote video "connected" but showing incorrect/static state (FIXED)
- **Root cause:** `remoteJoined` was driven by `setTimeout(1500ms)` — both sides triggered "joined" independently after 1.5s regardless of whether the real peer was actually in the room. Doctor saw "Live feed active", patient simultaneously saw "Waiting for Doctor..." because both were reading local timer state.
- **Fix applied:** Replaced with `/api/room/[roomId]` polling presence API:
  - Each participant POSTs a heartbeat (with `cameraOn`, `micOn`, `role`) every 4s.
  - Each participant GETs presence every 2s to see the other's real state.
  - Participants expire from the server after 12s of no heartbeat.
  - `remoteJoined` / `remoteCameraOn` / `remoteMicOn` are all derived from real server data.
  - Join toast (host only) fires when server confirms remote participant's first heartbeat.
- **Known limitation:** The presence API uses an in-memory Map (single-process). No actual WebRTC video stream is connected — the remote tile shows an avatar placeholder. A real video SDK (Daily.co/Twilio/LiveKit) must be integrated to transmit actual video tracks.
- **QA checklist for verifier:** Open room on Device A (host) → open same URL on Device B (patient) → Device A should show green "Connected" badge within ~4s and toast; Device B simultaneously shows "Connected". Both status labels should update in real-time without page refresh.


