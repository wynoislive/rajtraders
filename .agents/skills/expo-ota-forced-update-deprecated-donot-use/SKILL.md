---
name: expo-ota-forced-update (DEPRECATED - DONOT USE)
description: Implements Expo OTA forced-update UI with per-platform (iOS/Android) toggles via PostHog or hardcoded config. Use when adding OTA update banners, expo-updates forced reload flows, ota-forced-update feature flags, or fixing update-banner behavior across Expo projects.
---

# Expo OTA Forced Update

Standard cross-project pattern for Expo OTA updates: silent background fetch when disabled, visible banner + restart prompt when enabled per platform.

## File manifest

Use these **exact paths** in every Expo project so fixes are always in the same place:

| File | Required | Role |
|------|----------|------|
| `lib/forced-ota-update.ts` | Yes | Platform resolver (`ios` / `android` → boolean) |
| `hooks/use-forced-ota-update.ts` | Yes | **Only file that switches PostHog ↔ hardcoded** |
| `components/update-banner.tsx` | Yes | UI + expo-updates logic |
| `lib/update-banner-preview.ts` | Optional | Dev-only banner preview store |
| `constants/posthog-feature-flags.ts` | PostHog only | `OTA_FORCED_UPDATE_FLAG` + safe defaults |
| `app/_layout.tsx` | Yes | Mount `<UpdateBanner />` inside providers |

Full templates, integration steps, and PostHog setup: [reference.md](reference.md)

## Behavior contract

| State | Behavior |
|-------|----------|
| `forcedUpdate: false` (platform) | Silent `checkForUpdateAsync` + `fetchUpdateAsync`; no banner |
| `forcedUpdate: true` (platform) | Visible banner, alert on ready, user must restart |
| PostHog not ready / fails / undefined | **Both platforms `false`** (silent updates only) |
| Flag disabled (`false`) | Both platforms `false` |
| Flag enabled (`true`), no payload | Both platforms `true` |
| Flag enabled with payload | Per-platform booleans from payload; omitted keys default to `true` |

## Implementation workflow

```
Task Progress:
- [ ] Confirm expo-updates is configured (EAS Update / app.json)
- [ ] Create lib/forced-ota-update.ts
- [ ] Create hooks/use-forced-ota-update.ts (PostHog or hardcoded variant)
- [ ] Create components/update-banner.tsx
- [ ] (Optional) Create lib/update-banner-preview.ts + settings dev UI
- [ ] Add OTA flag constants if using PostHog
- [ ] Mount <UpdateBanner /> in app/_layout.tsx
- [ ] Ensure UpdateBanner renders inside PostHogProvider when using PostHog
```

## PostHog vs hardcoded

**PostHog projects:** implement full hook with `useFeatureFlagWithPayload`. Create flag `ota-forced-update` (boolean). Optional payload: `{ "ios": true, "android": false }`.

**No PostHog:** do **not** change any other file. Replace only `hooks/use-forced-ota-update.ts` body:

```typescript
export function useForcedOtaUpdate() {
  const config = { ios: false, android: false }; // set per project
  return {
    ready: true,
    forcedUpdate: resolveForcedOtaUpdateForPlatform(config),
    config,
  };
}
```

## Integration rules

1. `UpdateBanner` owns the hook — `_layout.tsx` is always `<UpdateBanner />` with no props.
2. Wait for `ready` before running update logic (avoids flash between modes).
3. `UpdateBanner` must sit **inside** `PostHogProvider` when using PostHog.
4. Dev preview (`update-banner-preview.ts`) bypasses forced flag in `__DEV__` only.
5. Adapt theme/color imports in `update-banner.tsx` to each project's design tokens — do not rename the file.

## When fixing bugs

| Symptom | Check first |
|---------|-------------|
| Banner never shows | `hooks/use-forced-ota-update.ts` → flag/config values |
| Wrong platform behavior | `lib/forced-ota-update.ts` + PostHog payload |
| Silent update not running | `components/update-banner.tsx` → `runSilentUpdate` |
| Banner stuck / no restart | `components/update-banner.tsx` → `checkUpdate` / alert |
| Dev preview broken | `lib/update-banner-preview.ts` + settings wiring |

## Dependencies

- `expo-updates`
- `react-native-safe-area-context`
- `@expo/vector-icons` (or swap icon in banner)
- PostHog mode only: `posthog-react-native` + `PostHogProvider` in root layout
