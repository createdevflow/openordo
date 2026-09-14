# Chartwell — Video Consultation Call Screen: Redesign & Bug Fix Spec

## 0. What's wrong right now

Same root issue as the admin panel before this: the call screen was built in a generic dark
navy/indigo theme (`bg-slate-900`-style background, indigo/blue accents) that has no
relationship to Chartwell's actual palette. It also has a real functional bug: turning the
camera off only hides it visually — the browser is still capturing from the camera hardware
underneath.

This spec fixes both. It's scoped to the **Video Consultation plugin** from
`CHARTWELL_PLUGINS_SPEC.md` Section 2.1 — the call screen is a distinct full-screen experience
(not the normal dashboard shell), so it gets its own dark-mode application of the brand tokens
rather than reusing the light `paper` background used everywhere else.

---

## 1. The camera bug — fix this first, it's not a styling issue

**Root cause:** the "camera off" toggle is almost certainly just hiding the `<video>` element
(`display: none` / `opacity: 0`) or hiding its container, while the underlying
`MediaStreamTrack` from `getUserMedia()` keeps running. The browser's hardware camera
indicator light stays on because, as far as the OS is concerned, nothing stopped using the
camera — you only stopped *looking* at it.

**Fix:**

```ts
// Keep a ref to the actual MediaStream, not just the <video> element.
const localStreamRef = useRef<MediaStream | null>(null);

function toggleCamera(nextOn: boolean) {
  const videoTrack = localStreamRef.current?.getVideoTracks()[0];
  if (!videoTrack) return;
  videoTrack.enabled = nextOn; // pauses capture + turns off the hardware indicator in Chrome/Edge/Firefox
  setCameraOn(nextOn);
}

function toggleMic(nextOn: boolean) {
  const audioTrack = localStreamRef.current?.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = nextOn;
  setMicOn(nextOn);
}
```

- Setting `track.enabled = false` (not removing the track, not calling `.stop()`) is the
  correct approach for an in-call toggle — it pauses the feed instantly, turns off the hardware
  indicator in current major browsers, and lets you flip it back on instantly without
  re-requesting camera permission or re-negotiating the call.
- **Verify the hardware indicator actually clears** in your target browsers during QA — if any
  browser you need to support keeps the light on with `enabled = false` (some Firefox versions
  historically lagged here), fall back to `track.stop()` + removing the track from the stream
  when toggled off, and call `getUserMedia()` again (video only) when toggled back on. Either
  way, the currently-shipped behavior (hiding the DOM element only) is wrong and must change.
- When `cameraOn === false`, the local self-view tile must **not** show a frozen last frame or
  a black box — replace the `<video>` element in the DOM with the same avatar-initials
  placeholder used elsewhere in the app (Section 3.3), so it's visually obvious the camera is
  off, not just dark.
- Apply the identical fix to the remote participant's tile if the patient toggles their camera
  — same avatar-placeholder fallback, driven by a `remoteCameraOn` flag from the video provider
  (Daily.co/Twilio both emit track-enabled/disabled events for this).

---

## 2. Color system for the call screen (dark surface)

The call screen is the one place in the product that should be dark by default — video needs a
dark backdrop for contrast, and it reads as "focused consultation mode" rather than "browsing
the dashboard." Reuse existing tokens instead of inventing new ones:

| Token | Value | Used for |
|---|---|---|
| Stage background | `var(--forest-dark)` (`#123025`) | Full-screen backdrop behind the video |
| Panel surface | `rgba(255,255,255,0.05)` on top of forest-dark | Header bar, side panel, control bar pill |
| Panel border | `rgba(255,255,255,0.09)` | Every card/tile border on the dark surface |
| Primary text | `#FFFFFF` | Names, headings |
| Secondary text | `#B9C8C0` (already used for sidebar nav) | Meta text, timestamps, placeholders |
| Success accent | `#4ADE80`-adjacent green, or reuse `success` (`#2E6B3E`) at higher luminance for dark bg — use `#5FC97C` | "Encrypted," "Live feed active," connected states |
| Primary accent | `var(--amber)` | Timer chip, active tab underline, "Open E-Prescriptions" button, any primary CTA |
| Destructive | `var(--coral)` | End Call button, allergy warnings (already correctly coral in the screenshot — keep it) |
| Avatar fallback | The patient's own `colorTag` from the `Patient` record | Self/remote avatar circles when camera is off — not a generic blue |

This keeps the call screen visually part of the same brand instead of looking like a
third-party video widget dropped into the product — which is exactly what it currently looks
like.

---

## 3. Layout

### 3.1 Header bar
- Left: Chartwell logo mark (small, same mark used everywhere else — not a generic "C" circle
  in an arbitrary color) + clinic name + a status line with a lock icon in the success-green
  token: "Encrypted consultation room."
- Center: timer chip — amber clock icon + elapsed time, on a `rgba(255,255,255,0.06)` pill.
- Right: **Share patient link** (ghost button, white border/text on dark) and **Exit to
  Dashboard** (plain text link, secondary-text color) — keep these two, they're already in the
  right place, just re-themed.
- Bottom border: `1px solid rgba(255,255,255,0.09)`, not a hard color-block edge.

### 3.2 Main stage
- Remote participant's video fills the stage, centered, rounded corners at the stage edges
  only if the call UI is inset from the viewport edge (optional — full-bleed is also fine).
- When remote camera is off: large avatar circle (120–140px) in the patient's `colorTag`,
  initials, name below it, and a status line — "Live feed active" only when truly connected;
  use "Waiting for [patient] to join…" before they connect, and "Camera off" (not "Live feed
  active") when connected but their camera is disabled. The current screenshot says "Live feed
  active" under a placeholder avatar, which is misleading — the status text must reflect actual
  state.

### 3.3 Self-view tile (PIP)
- Bottom-right of the stage by default, ~200×140px on desktop, rounded 10px, border
  `rgba(255,255,255,0.12)`, small "You" label bottom-left of the tile on a dark scrim.
- When your own camera is off (Section 1): replace with the same avatar-initials placeholder
  pattern, using the doctor's own avatar color from their `Doctor`/`User` record — not a black
  rectangle.
- Draggable is a nice-to-have, not required — a fixed position that never overlaps the control
  bar or side panel is sufficient.

### 3.4 Control bar
- Floating pill, centered at the bottom of the stage, `rgba(255,255,255,0.08)` background with
  a backdrop blur, not a hard-edged bar spanning full width.
- Circular icon buttons: Mic, Camera, Share — `rgba(255,255,255,0.1)` background, white icon,
  and when toggled off, the icon itself changes to its "muted/off" variant (crossed-out mic/
  camera icon) with the button background shifting to `var(--coral-soft)` at low opacity so
  "this is off" is visible at a glance, not just an icon swap.
- **End Call** stays visually distinct — coral filled pill, phone-hangup icon + label — exactly
  as it already is, that part of the current design is already correct.

### 3.5 Side panel
- Tabs — Consultation / Chat / Files — same `cw-tabs` interaction pattern used everywhere else
  in the product, dark variant: inactive tab text in secondary-text color, active tab in white
  with an amber underline (not a green background block like the current screenshot's
  "Consultation" tab, which reads as a filled button rather than a tab).
- **Patient Details card:** panel surface (`rgba(255,255,255,0.05)`), labels in secondary-text
  color, values in white, **Allergies row in coral** (already correct in the screenshot, keep
  as-is — this is a case where the existing choice matches the brand system).
- **Reason for Visit:** read-only display of the appointment's `reason` field, not an editable
  input — this is pulled from the existing `Appointment.reason`, not something to retype during
  the call.
- **Consultation Notes:** a plain textarea, dark input styling (`rgba(255,255,255,0.06)`
  background, `rgba(255,255,255,0.15)` border, white text, secondary-text placeholder) —
  autosaves periodically to the `MedicalRecord` draft rather than requiring an explicit save
  click mid-call.
- **"Open E-Prescriptions"** button: primary style using `var(--amber)` background with
  `var(--forest-dark)` text (matching the amber-button treatment used elsewhere in the product,
  e.g. the promo CTA), not the flat green box currently shown. **Gate this button on the
  E-Prescriptions plugin being active for the clinic** (per `CHARTWELL_PLUGINS_SPEC.md`) — if
  that plugin isn't purchased, show a smaller, secondary-styled "Add E-Prescriptions" chip that
  links to `/dashboard/addons` instead of a full button, so the call screen naturally surfaces
  the cross-sell without interrupting the consultation.

---

## 4. Responsive rules

- **≥1024px (desktop):** exactly the layout in Section 3 — side panel fixed at ~360px wide on
  the right, main stage fills the remainder.
- **640–1023px (tablet):** side panel narrows to ~300px; if content overflows, the Patient
  Details card becomes collapsible (accordion) to make room for the Consultation Notes
  textarea, which is the field actually being used live during the call.
- **<640px (mobile):** side panel is **not** shown alongside the video — it becomes a bottom
  sheet/drawer, collapsed by default, opened via a small "Details" toggle button added to the
  header's right side. The video stage takes the full viewport height minus the header and
  control bar. Self-view PIP shrinks to ~90×64px and moves to the top-right corner of the stage
  (clear of both the header and the control bar). Control bar buttons grow slightly for touch
  targets (minimum 44×44px tap area) and may reduce to Mic / Camera / End Call + a single
  overflow ("...") button for Share/other actions if space is tight.
- At every breakpoint, the timer chip and Exit-to-Dashboard link stay visible in the header —
  never hide the way to leave the call.

---

## 5. Build order

1. Fix the camera/mic `track.enabled` bug (Section 1) — this is a real privacy/trust issue and
   should ship before any visual changes.
2. Apply the dark token system (Section 2) across the existing call-screen components — header,
   stage, PIP, control bar, side panel.
3. Fix the remote/self camera-off states to show the avatar-initials placeholder with accurate
   status text, not a stale "Live feed active" label (Section 3.2, 3.3).
4. Re-theme the side panel tabs to the standard `cw-tabs` pattern instead of a filled-button
   active state (Section 3.5).
5. Restyle the "Open E-Prescriptions" CTA and add the plugin-gate + cross-sell chip fallback
   (Section 3.5).
6. Responsive pass: tablet side-panel narrowing/collapsing, mobile bottom-sheet conversion
   (Section 4).
