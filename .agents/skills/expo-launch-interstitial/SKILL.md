---
name: expo-launch-interstitial
description: Adds PostHog-gated launch interstitial ads to Expo apps with Nth-launch cadence, session coordination, web stub, and opt-in-only defaults (disabled unless PostHog flag is explicitly true). Use when adding launch interstitials, InterstitialAd, app-open ads, or coordinating store review with interstitial timing in an Expo app.
---

# Expo Launch Interstitial

Reusable launch-interstitial stack from the Forex Factory Calendar app. Shows a full-screen AdMob interstitial on every **Nth app launch**, controlled remotely via PostHog.

**Prerequisites:** **expo-admob-att** skill (`AdsInitProvider`, `useAdsInit()`). Optional: **expo-store-review** for review-prompt coordination.

Full source templates: [reference.md](reference.md)

## Before you start

Gather per-app values:

| Value | Where to find |
|-------|---------------|
| `{STORAGE_PREFIX}` | Unique AsyncStorage prefix, e.g. `@my-app-name` |
| `{IOS_INTERSTITIAL_UNIT_ID}` | AdMob → Apps → Ad units → Interstitial (iOS) |
| `{ANDROID_INTERSTITIAL_UNIT_ID}` | AdMob → Apps → Ad units → Interstitial (Android) |
| PostHog project | `PostHogProvider` already mounted in root layout |

Read Expo SDK docs at `https://docs.expo.dev/versions/v{SDK}/` before writing code.

---

## File manifest

| File | Required | Role |
|------|----------|------|
| `src/lib/interstitial-ad.ts` | Yes | Dev `TestIds.INTERSTITIAL`; prod platform unit IDs |
| `src/lib/launch-interstitial-policy.ts` | Yes | Opt-in enable check, threshold parsing, show cadence |
| `src/lib/launch-interstitial-session.ts` | Yes | Session state for pending/showing/idle (store review sync) |
| `src/lib/app-launch-count.ts` | Yes | Persisted launch counter (increment once per session) |
| `src/components/launch-interstitial-controller.tsx` | Yes | Native controller: PostHog flag → load/show ad |
| `src/components/launch-interstitial-controller.web.tsx` | Yes | Web stub returning `null` |
| Root `_layout.tsx` | Yes | Mount `<LaunchInterstitialController />` inside `PostHogProvider` + `AdsInitProvider` |

**Do not** import `react-native-google-mobile-ads` from files that load on web. Metro resolves `.web.tsx` for the controller; keep AdMob imports in native-only files.

---

## PostHog feature flag

Create a **boolean release toggle** in PostHog:

| Field | Value |
|-------|-------|
| Key | `launch-interstitial` |
| Payload (optional) | `{ "launch_threshold": 5 }` |

### Default behavior (opt-in only)

| PostHog state | Interstitial runs? |
|---------------|-------------------|
| Flag missing / `false` | **No** |
| Flag `undefined` (loading) | Waits up to 10s, then **No** |
| Flag explicitly `true` | **Yes** on every Nth launch |

- `DEFAULT_LAUNCH_INTERSTITIAL_ENABLED = false` — only `flagValue === true` enables ads.
- `DEFAULT_LAUNCH_INTERSTITIAL_THRESHOLD = 5` — used when flag is enabled but payload is missing/invalid.
- Show rule: `enabled && launchCount % threshold === 0` (shows on launches 5, 10, 15… when threshold is 5).

---

## Integration checklist

```
Task Progress:
- [ ] Step 1: Confirm expo-admob-att is wired (AdsInitProvider + adsReady)
- [ ] Step 2: Confirm PostHogProvider wraps the app
- [ ] Step 3: Create interstitial-ad.ts with platform unit IDs
- [ ] Step 4: Create launch-interstitial-policy.ts
- [ ] Step 5: Create launch-interstitial-session.ts
- [ ] Step 6: Create or reuse app-launch-count.ts
- [ ] Step 7: Create launch-interstitial-controller.tsx + .web.tsx stub
- [ ] Step 8: Mount LaunchInterstitialController in root layout
- [ ] Step 9: Create PostHog flag launch-interstitial (start disabled)
- [ ] Step 10: (Optional) Wire store-review coordination
- [ ] Step 11: Test on real device with dev TestIds
```

### Step 8: Root layout mount order

Inside `PostHogProvider` → `AdsInitProvider` → layout inner:

```tsx
<LaunchInterstitialController />
```

Mount alongside other null-render controllers (splash, store review dev, etc.). Controller returns `null`.

### Launch count ownership

`incrementLaunchCount()` runs **inside** `LaunchInterstitialController` after PostHog flag resolves — not elsewhere. If the app has no interstitial, increment at root on mount instead (see **expo-store-review**).

On first launch (`count === 0`), `incrementLaunchCount` may call `recordFirstOpenIfNeeded()` if store review is wired.

---

## Controller flow (native)

1. Skip on web.
2. Wait for `adsReady` from `useAdsInit()`.
3. Wait for PostHog flag (`launch-interstitial`) or 10s timeout → default disabled.
4. Once per session: increment launch count, evaluate policy.
5. If disabled → skip, capture `launch_interstitial_skipped` (`flag_disabled` or `flag_unavailable`).
6. If not Nth launch → skip, reason `not_nth_launch`.
7. Wait `SPLASH_DELAY_MS` (700ms), load interstitial, show on `LOADED`.
8. Session markers: `markLaunchInterstitialPending` → `markLaunchInterstitialShowing` → `markLaunchInterstitialFinished`.

On ad error: finish session, capture `launch_interstitial_failed`.

---

## Store review coordination (optional)

If **expo-store-review** is installed, copy the interstitial defer helpers from reference and update `StoreReviewController` to:

1. Wait for the same PostHog flag resolution + timeout.
2. Call `shouldDeferStoreReviewForLaunchInterstitial()` before prompting.
3. Skip auto-prompt when `interstitialWouldShow` is true for this launch.
4. Re-check `isLaunchInterstitialActiveOrPending()` after the review delay.

Both controllers use independent `handledThisSession` guards.

---

## PostHog analytics events

| Event | When |
|-------|------|
| `launch_interstitial_shown` | Ad opened |
| `launch_interstitial_skipped` | Disabled, unavailable, or not Nth launch |
| `launch_interstitial_failed` | Ad load/show error |

Remove PostHog calls if the target app has no PostHog; keep `__DEV__` logging.

---

## Customization quick reference

```typescript
// launch-interstitial-policy.ts
DEFAULT_LAUNCH_INTERSTITIAL_ENABLED = false;
DEFAULT_LAUNCH_INTERSTITIAL_THRESHOLD = 5;

// launch-interstitial-controller.tsx
LAUNCH_INTERSTITIAL_FLAG = 'launch-interstitial';
SPLASH_DELAY_MS = 700;
POSTHOG_FLAG_TIMEOUT_MS = 10000;

// launch-interstitial-session.ts
LAUNCH_COUNTED_TIMEOUT_MS = 10000;
INTERSTITIAL_IDLE_TIMEOUT_MS = 30000;
```

---

## When fixing bugs

| Symptom | Check |
|---------|-------|
| Ad never shows | PostHog flag explicitly `true`? Launch count divisible by threshold? |
| Ad shows without flag | Must use `isLaunchInterstitialEnabled` (`=== true`), not `Boolean(flag)` |
| Stuck waiting | `adsReady`? PostHog loaded? Flag timeout fires after 10s? |
| Ad on web | Missing `.web.tsx` stub on controller? |
| Review + ad clash | `launch-interstitial-session.ts` markers called? Store review waits for flag? |
| Wrong ad unit | `__DEV__` uses `TestIds.INTERSTITIAL`; prod uses platform IDs |

---

Related skills: `expo-admob-att`, `expo-store-review`, `expo-preview-ad-timing`.
