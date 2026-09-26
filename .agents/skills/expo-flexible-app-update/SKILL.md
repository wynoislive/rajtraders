---
name: expo-flexible-app-update
description: Adds PostHog-driven flexible store update prompts (not OTA) with semver gating, dismiss cooldown, App Store / Play Store links, and structured PostHog analytics (shown, update/later clicks, passive dismiss by platform). Use when adding app update modals, flexible-app-update flags, store version prompts, or replicating the update flow in Expo apps.
---

# Expo Flexible App Store Update

PostHog-controlled **store update** modal — guides users to App Store / Play Store. **Not** Expo OTA (`expo-updates`). Always dismissible; never forced.

## Before you start

| Value | Where |
|-------|--------|
| `STORAGE_PREFIX` | e.g. `@my-app-name` |
| `IOS_ITUNES_ITEM_ID` | App Store Connect → Apple ID |
| `ANDROID_PACKAGE_NAME` | `app.json` → `android.package` |
| PostHog flag key | `flexible-app-update` |

```bash
npx expo install expo-application @react-native-async-storage/async-storage
```

Requires `posthog-react-native` if using the hook pattern.

---

## File manifest

| File | Role |
|------|------|
| `constants/posthog-feature-flags.ts` | `FLEXIBLE_APP_UPDATE_FLAG`, defaults, event name constants |
| `lib/semver-compare.ts` | Numeric semver compare (no npm dep) |
| `lib/flexible-app-update-storage.ts` | AsyncStorage dismissal state |
| `lib/flexible-app-update.ts` | Parse payload, eligibility, store URL |
| `lib/flexible-app-update-analytics.ts` | **Central PostHog capture helpers** — shared event props |
| `hooks/use-flexible-app-update.ts` | PostHog hook (swap point for hardcode) |
| `lib/flexible-app-update-navigation.ts` | Open/close presentation |
| `components/flexible-app-update-content.tsx` | Shared UI (logo, text, buttons) |
| `components/flexible-app-update-controller.tsx` | Auto-prompt orchestrator + Android analytics |
| `components/flexible-app-update-modal.tsx` | Android centered modal |
| `app/flexible-app-update.tsx` | iOS route (Expo 56 form sheet) + iOS analytics |
| `app/_layout.tsx` | Mount controller + optional sheet route |

---

## Integration checklist

```
- [ ] Add FLEXIBLE_APP_UPDATE_FLAG + FLEXIBLE_UPDATE_EVENTS to posthog-feature-flags.ts
- [ ] Copy lib + hook files; replace STORAGE_PREFIX and store IDs
- [ ] Add lib/flexible-app-update-analytics.ts (do not inline posthog.capture in UI)
- [ ] Add ios.appStoreUrl + android.playStoreUrl to app.json
- [ ] Build UI (see generic prompt below)
- [ ] Wire controller in root layout (session race rules below — do not mark handled until the sheet actually opens)
- [ ] Create PostHog flag with per-platform payload
- [ ] Add dev preview + clear dismissal in Settings (__DEV__)
```

---

## PostHog flag

**Key:** `flexible-app-update` · **Type:** boolean · **Rollout:** 100% when live

```json
{
  "android": {
    "enabled": true,
    "version": "1.2.0",
    "url": null,
    "remindAfterDays": 3,
    "title": "Update Available",
    "message": "A newer version is available with improvements and fixes.",
    "primaryButtonText": "Update Now",
    "secondaryButtonText": "Later",
    "showAfterLaunchDelayMs": 1000
  },
  "ios": {
    "enabled": true,
    "version": "1.2.0",
    "url": null,
    "remindAfterDays": 3,
    "title": "Update Available",
    "message": "A newer version is available with improvements and fixes.",
    "primaryButtonText": "Update Now",
    "secondaryButtonText": "Later",
    "showAfterLaunchDelayMs": 1000
  }
}
```

Flag must be **enabled** (`true`). App reads per-platform object via `Platform.OS`.

---

## Behavior rules

| Rule | Detail |
|------|--------|
| Show when | `enabled` + installed version **<** payload `version` (semver) |
| Dismiss | Save version + timestamp; hide for `remindAfterDays` (default 3) |
| New payload version | Show again even during cooldown |
| Store URL | payload `url` → `app.json` store URLs → constructed fallback |
| Store open fails | Small alert; user keeps using app |
| Web | No modal |
| `__DEV__` | Skip `remindAfterDays`; don't persist dismissals |

**Not forced** — user can always tap Later, close, or swipe dismiss.

---

## UI (generic prompt)

Use app theme tokens + dark mode. **Do not use `flex: 1` on sheet content** — wrap intrinsic height only.

**Content (top → bottom, centered):**
- App logo (`require("@/assets/icons/...")`)
- App name (`Constants.expoConfig?.name`)
- Title + message from payload
- Full-width primary button (Update Now)
- Full-width secondary button (Later)

**Platform presentation:**

| Expo SDK | iOS | Android |
|----------|-----|---------|
| **≤54 (legacy)** | RN `Modal` transparent — centered card, dimmed backdrop | Same |
| **56+** | Expo Router `formSheet` route, `sheetAllowedDetents: "fitToContents"`, grabber | Centered card modal |

For Expo 56 native sheets, read `building-native-ui/references/form-sheet.md` in expo-56 projects. **Do not** use fixed detent fractions (e.g. `0.58`) for compact content — use `fitToContents`.

---

## Auto-prompt session race (required)

The launch effect is async (`AppState` wait + `showAfterLaunchDelayMs`). ATT, PostHog `reloadFeatureFlags()` on resume, and a new `config` object identity all remount the effect and run its cleanup.

**Symptom:** Settings still reports the user is eligible (`Would auto-show: true`) but the sheet never appears after a cold start. First effect run armed the delay then got cancelled; a module-level `handledThisSession = true` already fired, so the next run skipped forever.

**Do this:**

1. Wait for `AppState === "active"` **before** the delay and **again after** it. Do not open under ATT or while backgrounded.
2. Set `handledThisSession = true` **only immediately before** `openFlexibleAppUpdatePresentation(config)`.
3. Effect deps: `config?.enabled`, `config?.version`, `config?.showAfterLaunchDelayMs`, `ready` — **not** the whole `config` object.
4. Pass that `config` into `openFlexibleAppUpdatePresentation(config)`.
5. On teardown set `cancelled = true` and bail after every `await`. If cancelled, leave `handledThisSession` false so a later run can still show.

**Do not:**

```tsx
// Wrong — marks handled before the delay; cancelled runs skip forever
if (handledThisSession) return;
handledThisSession = true;
const t = setTimeout(() => openFlexibleAppUpdatePresentation(), delay);
return () => clearTimeout(t);
// also wrong: [config, ready] — new payload object retriggers and cancels the delay
```

Canonical controller: [reference.md](reference.md#componentsflexible-app-update-controllertsx)

---

## Root layout

```tsx
<FlexibleAppUpdateController />
```

Separate from OTA `UpdateBanner` / `ota-forced-update` flag.

---

## Dev testing

Settings → Developer ( `__DEV__` only ):
- **Preview flexible update** → `openFlexibleAppUpdatePresentation(config)`
- **Clear update dismissal** → `clearFlexibleUpdateDismissal()` + reload

Auto-prompt still needs payload `version` > installed. Preview bypasses eligibility.

---

## PostHog analytics

Use **`lib/flexible-app-update-analytics.ts`** — never scatter raw `posthog.capture` calls in content components. Parents (controller + iOS sheet route) own all event firing.

Event names are **platform-prefixed** — no `platform` property on payloads; pick the right event name per OS.

### Shared properties (every event)

| Property | Value |
|----------|-------|
| `target_version` | PostHog payload semver |
| `installed_version` | `Application.nativeApplicationVersion` → fallback `expoConfig.version` |
| `remind_after_days` | From payload |
| `is_preview` | `true` when opened from Settings dev preview |

Filter production dashboards with `is_preview = false`.

### Events

| iOS | Android | When |
|-----|---------|------|
| `ios_update_shown` | `android_update_shown` | Sheet/modal visible |
| `ios_update_now_clicked` | `android_update_now_clicked` | **Update Now** tapped |
| `ios_update_later_clicked` | `android_update_later_clicked` | **Later** tapped |
| `ios_update_modal_closed` | `android_update_modal_closed` | Passive close (swipe, backdrop, back) |

`modal_closed` includes `dismiss_method`: `'gesture'` (iOS swipe) \| `'backdrop'` \| `'back_button'`.

### Dismiss routing

| Platform | Later | Passive close |
|----------|-------|---------------|
| **iOS** form sheet | Later button → `ios_update_later_clicked` | Sheet swipe → `ios_update_modal_closed` (`dismiss_method: gesture`) |
| **Android** modal | Later button → `android_update_later_clicked` | Backdrop → `backdrop`; hardware back → `back_button` |

Use a ref on iOS to distinguish Later vs gesture in `beforeRemove`. Android modal passes dismiss method via `onDismiss(method)`.

### PostHog insight recipes

- **Shown:** count `ios_update_shown` + `android_update_shown` (or separate trends)
- **Update taps:** count `ios_update_now_clicked` + `android_update_now_clicked`
- **Later taps:** count `ios_update_later_clicked` + `android_update_later_clicked`
- **Passive close:** count `*_update_modal_closed` → breakdown by `dismiss_method`
- **Funnel (per platform):** `*_update_shown` → `*_update_now_clicked`

Event name constants live in `FLEXIBLE_UPDATE_EVENTS.ios` / `.android` (`constants/posthog-feature-flags.ts`).

Full helper API: [reference.md](reference.md#libflexible-app-update-analyticsts)

## Hardcode swap

Replace `useFlexibleAppUpdate` hook body:

```typescript
return {
  ready: true,
  config: resolvePlatformUpdateConfig({ ios: { enabled: true, version: "2.0.0", ... } }),
};
```
