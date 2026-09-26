# Flexible App Store Update — Reference

Replace placeholders before copying:

- `{STORAGE_PREFIX}` — e.g. `@my-app-name`
- `{IOS_ITUNES_ITEM_ID}` — numeric App Store Apple ID
- `{ANDROID_PACKAGE_NAME}` — e.g. `com.example.app`

---

## File layout

```
app/
├── _layout.tsx                          ← mount controller + iOS sheet route (Expo 56+)
└── flexible-app-update.tsx              ← iOS sheet screen (Expo 56+ only)
components/
├── flexible-app-update-content.tsx      ← shared UI
├── flexible-app-update-controller.tsx   ← auto-prompt
└── flexible-app-update-modal.tsx        ← Android modal
constants/
└── posthog-feature-flags.ts             ← FLEXIBLE_APP_UPDATE_FLAG
hooks/
└── use-flexible-app-update.ts
lib/
├── semver-compare.ts
├── flexible-app-update-storage.ts
├── flexible-app-update.ts
├── flexible-app-update-analytics.ts   ← PostHog capture helpers
└── flexible-app-update-navigation.ts
```

---

## posthog-feature-flags.ts

```typescript
export const FLEXIBLE_APP_UPDATE_FLAG = "flexible-app-update";

export const FLEXIBLE_APP_UPDATE_DEFAULTS = {
  enabled: false,
  version: "0.0.0",
  url: null,
  remindAfterDays: 3,
  title: "Update Available",
  message: "A newer version is available with improvements and fixes.",
  primaryButtonText: "Update Now",
  secondaryButtonText: "Later",
  showAfterLaunchDelayMs: 1_000,
} as const;

export const FLEXIBLE_UPDATE_EVENTS = {
  ios: {
    shown: "ios_update_shown",
    updateNowClicked: "ios_update_now_clicked",
    laterClicked: "ios_update_later_clicked",
    modalClosed: "ios_update_modal_closed",
  },
  android: {
    shown: "android_update_shown",
    updateNowClicked: "android_update_now_clicked",
    laterClicked: "android_update_later_clicked",
    modalClosed: "android_update_modal_closed",
  },
} as const;

export type FlexibleUpdateDismissMethod = "gesture" | "backdrop" | "back_button";
```

---

## app.json store URLs

```json
{
  "expo": {
    "ios": {
      "appStoreUrl": "https://apps.apple.com/app/apple-store/id{IOS_ITUNES_ITEM_ID}"
    },
    "android": {
      "package": "{ANDROID_PACKAGE_NAME}",
      "playStoreUrl": "https://play.google.com/store/apps/details?id={ANDROID_PACKAGE_NAME}"
    }
  }
}
```

---

## lib/semver-compare.ts

Exports `compareSemver(a, b)` and `isValidSemver(version)`.

Show modal when: `compareSemver(installed, payloadVersion) === -1`.

Installed version: `Application.nativeApplicationVersion` → fallback `Constants.expoConfig?.version`.

---

## lib/flexible-app-update-storage.ts

AsyncStorage keys:
- `{STORAGE_PREFIX}/flexible-update-dismissed-version`
- `{STORAGE_PREFIX}/flexible-update-dismissed-at`

Exports: `getFlexibleUpdateDismissal`, `recordFlexibleUpdateDismissal`, `clearFlexibleUpdateDismissal`.

---

## lib/flexible-app-update.ts

Core exports:
- `resolvePlatformUpdateConfig(payload)` — reads `ios` / `android` from PostHog payload
- `shouldShowFlexibleAppUpdate(config)` — semver + dismissal cooldown (`__DEV__` skips cooldown)
- `resolveStoreUpdateUrl(config)` — url → app.json → constructed
- `openStoreUpdateUrl(config)` — Linking + non-blocking Alert on failure

Parsing: defensive; invalid fields fall back to `FLEXIBLE_APP_UPDATE_DEFAULTS`.

---

## lib/flexible-app-update-analytics.ts

Central PostHog capture. Do not duplicate `posthog.capture` in content components.

### Exports

| Function | iOS event | Android event |
|----------|-----------|-----------------|
| `captureFlexibleUpdateShown(posthog, config, isPreview?)` | `ios_update_shown` | `android_update_shown` |
| `captureFlexibleUpdateNowClicked(...)` | `ios_update_now_clicked` | `android_update_now_clicked` |
| `captureFlexibleUpdateLaterClicked(...)` | `ios_update_later_clicked` | `android_update_later_clicked` |
| `captureFlexibleUpdateModalClosed(..., dismissMethod, ...)` | `ios_update_modal_closed` | `android_update_modal_closed` |

Helpers pick the event name from `Platform.OS` via `FLEXIBLE_UPDATE_EVENTS.ios` / `.android`.

### Shared properties (auto-attached)

`target_version`, `installed_version`, `remind_after_days`, `is_preview`

`modal_closed` also sends `dismiss_method`.

### Wiring rules

- **Android controller:** fire `android_update_shown` when modal becomes visible; route `onDismiss(method)` to later vs modal_closed helpers
- **iOS sheet route:** fire `ios_update_shown` on mount; use ref + `beforeRemove` to distinguish Later vs gesture swipe
- **Update button:** `*_update_now_clicked` on tap, then `openStoreUpdateUrl` (no separate store outcome event)
- **Dev preview:** pass `isPreview: true` when `getFlexibleAppUpdatePreviewConfig()` is active

---

## hooks/use-flexible-app-update.ts

Pattern matches `use-forced-ota-update.ts`:
- `useFeatureFlagWithPayload(FLEXIBLE_APP_UPDATE_FLAG)`
- Reload flags on `AppState` active — this remounts the controller effect; see the session-race rules in the controller
- Return `{ ready, config }`; safe default when flag off/not ready

---

## lib/flexible-app-update-navigation.ts

```typescript
openFlexibleAppUpdatePresentation(config); // iOS: router.push sheet; Android: show modal (pass config)
closeFlexibleAppUpdatePresentation();      // router.back() / hide modal
markFlexibleAppUpdateSheetClosed();        // iOS route unmount
```

---

## components/flexible-app-update-controller.tsx

Launch prompt is async. ATT, PostHog flag reload on `AppState` active, and a new `config` object identity remount this effect. **Do not** set `handledThisSession = true` until the presentation actually opens — otherwise a cancelled first run skips the prompt for the rest of the session.

```tsx
function waitForActiveAppState(): Promise<void> {
  if (AppState.currentState === "active") return Promise.resolve();
  return new Promise((resolve) => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        subscription.remove();
        resolve();
      }
    });
  });
}

useEffect(() => {
  if (Platform.OS === "web") return;
  if (!ready || !config || handledThisSession) return;

  let cancelled = false;

  (async () => {
    await waitForActiveAppState();
    if (cancelled) return;

    const eligible = await shouldShowFlexibleAppUpdate(config);
    if (cancelled || !eligible) return;

    await new Promise((resolve) => setTimeout(resolve, config.showAfterLaunchDelayMs));
    if (cancelled) return;

    await waitForActiveAppState();
    if (cancelled) return;

    const stillEligible = await shouldShowFlexibleAppUpdate(config);
    if (cancelled || !stillEligible || handledThisSession) return;

    handledThisSession = true;
    openFlexibleAppUpdatePresentation(config);
  })();

  return () => {
    cancelled = true;
  };
}, [config?.enabled, config?.version, config?.showAfterLaunchDelayMs, ready]);
```

Then:

1. Android: render `FlexibleAppUpdateModal` via `useSyncExternalStore`
2. Android: `captureFlexibleUpdateShown` when `androidVisible` becomes true (`android_update_shown`)
3. Android dismiss: `onDismiss('later' | 'backdrop' | 'back_button')` → `android_update_later_clicked` or `android_update_modal_closed`

Dev helpers: `resetFlexibleAppUpdateHandledSession()` (Settings preview). Do not call it from the auto-prompt path.

---

## components/flexible-app-update-modal.tsx

Android only. `onDismiss` receives method:

- Later button (via content) → `'later'`
- Backdrop `Pressable` → `'backdrop'`
- `onRequestClose` (hardware back) → `'back_button'`

---

## UI — legacy Expo (≤54)

Both platforms: RN `Modal` `transparent`, dimmed backdrop, centered card (~340px max width).

Shared `FlexibleAppUpdateContent` — **no `flex: 1`** on root; intrinsic height only.

---

## UI — Expo 56+ iOS form sheet

`app/_layout.tsx`:

```tsx
<Stack.Screen
  name="flexible-app-update"
  options={{
    presentation: "formSheet",
    headerShown: false,
    sheetGrabberVisible: true,
    sheetAllowedDetents: "fitToContents",
    contentStyle: { backgroundColor: "transparent" },
  }}
/>
```

`app/flexible-app-update.tsx`:
- Render `FlexibleAppUpdateContent` with safe-area bottom padding
- On mount → `captureFlexibleUpdateShown` → `ios_update_shown`
- Later button → set ref `'later'`, then close
- `beforeRemove` → if ref is `'later'` → `ios_update_later_clicked`; else → `ios_update_modal_closed` (`dismiss_method: gesture`)
- `onUpdate` → `ios_update_now_clicked`, then `openStoreUpdateUrl`
- Guard with `closeAnalyticsRecordedRef` so events fire once per close

---

## Settings dev snippet

```typescript
import { resetFlexibleAppUpdateHandledSession } from '@/components/flexible-app-update-controller';
import { getPreviewFlexibleUpdateConfig } from '@/lib/flexible-app-update';
import { openFlexibleAppUpdatePresentation } from '@/lib/flexible-app-update-navigation';
import { clearFlexibleUpdateDismissal } from '@/lib/flexible-app-update-storage';

// Preview (pass preview config for is_preview analytics)
resetFlexibleAppUpdateHandledSession();
openFlexibleAppUpdatePresentation(getPreviewFlexibleUpdateConfig());

// Clear dismissal
await clearFlexibleUpdateDismissal();
resetFlexibleAppUpdateHandledSession();
```

---

## vs OTA update banner

| | Flexible store update | OTA UpdateBanner |
|--|----------------------|------------------|
| Flag | `flexible-app-update` | `ota-forced-update` |
| Destination | App Store / Play Store | `expo-updates` reload |
| Forced | Never | Optional |
| Version source | PostHog payload semver | Expo Updates manifest |

Keep both systems independent.

---

## project mapping

| File | Notes |
|------|-------|
| `lib/flexible-app-update-analytics.ts` | PostHog helpers + shared props |
| `constants/posthog-feature-flags.ts` | Flag key + `FLEXIBLE_UPDATE_EVENTS` |
| `hooks/use-flexible-app-update.ts` | PostHog hook |
| `app/flexible-app-update.tsx` | iOS form sheet + Later vs gesture analytics |
| `components/flexible-app-update-controller.tsx` | Android modal + auto-prompt analytics |
| `components/flexible-app-update-modal.tsx` | Android dismiss method routing |
