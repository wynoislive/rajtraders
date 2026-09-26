---
name: expo-store-review
description: Adds native in-app store review prompts, manual "Rate this app" settings link, launch-count eligibility policy, and optional launch-interstitial coordination to Expo apps. Use when adding app reviews, store ratings, expo-store-review.
---

# Expo Store Review

Provides:

- **Auto prompt** — native `expo-store-review` dialog after eligibility checks
- **Manual rate** — opens App Store / Play Store review page from Settings
- **Dev preview** — bypasses policy in `__DEV__` for quick iteration
- **Interstitial-safe** — defers review when a launch interstitial is showing (optional)

Full source templates: [reference.md](reference.md)

## Before you start

Gather per-app values:

| Value | Where to find |
|-------|---------------|
| `STORAGE_PREFIX` | e.g. `@my-app-name` — unique AsyncStorage key prefix |
| `IOS_ITUNES_ITEM_ID` | App Store Connect → App Information → Apple ID |
| `ANDROID_PACKAGE_NAME` | `app.json` → `android.package` |
| Readiness gate | When main content is loaded (see below) |

Install dependencies (match Expo SDK):

```bash
npx expo install expo-store-review @react-native-async-storage/async-storage
```

Read Expo SDK docs at `https://docs.expo.dev/versions/v{SDK}/` before writing code.

---

## File manifest

| File | Required | Role |
|------|----------|------|
| `src/lib/store-review-prompt.ts` | Yes | Policy, persistence, native + store-page APIs |
| `src/lib/app-launch-count.ts` | Yes | Launch counter (feeds eligibility) |
| `src/components/store-review-controller.tsx` | Yes | Production auto-prompt controller |
| `src/components/store-review-dev-controller.tsx` | Yes | Dev-only auto-prompt |
| `src/lib/launch-interstitial-session.ts` | If ads | Session flags so review waits for interstitial |
| Settings screen | Yes | Manual "Rate this app" button |
| Root layout | Yes | Mount dev controller |
| Main screen | Yes | Mount production controller |

---

## Integration checklist

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Create store-review-prompt.ts with app IDs and storage prefix
- [ ] Step 2: Create app-launch-count.ts
- [ ] Step 3: Wire launch count (see "Launch count wiring")
- [ ] Step 4: Create store-review-controller.tsx with readiness gate
- [ ] Step 5: Create store-review-dev-controller.tsx
- [ ] Step 6: Mount controllers in layout + main screen
- [ ] Step 7: Add Settings "Rate this app" row
- [ ] Step 8: (Optional) Add launch-interstitial-session.ts + ad coordination
- [ ] Step 9: Test on real device / Play internal track
```

### Step 1–2: Core libs

Copy templates from [reference.md](reference.md). Replace:

- `{STORAGE_PREFIX}` in all AsyncStorage keys
- `{IOS_ITUNES_ITEM_ID}` and `{ANDROID_PACKAGE_NAME}`

Default policy (tweak constants in `store-review-prompt.ts` if needed):

| Rule | Default |
|------|---------|
| Min launches | 10 |
| Min days since first open | 3 |
| Cooldown between auto prompts | 90 days |
| Max auto prompts per year | 3 |

### Step 3: Launch count wiring

`incrementLaunchCount()` must run once per cold start. In apps with launch interstitials, call it from the interstitial controller (see reference). In apps without ads:

```typescript
// Minimal: call once at app root on mount
useEffect(() => {
  void incrementLaunchCount();
}, []);
```

On first launch (`count === 0`), `incrementLaunchCount` also calls `recordFirstOpenIfNeeded()`.

### Step 4: Readiness gate

`StoreReviewController` waits until main content is ready before prompting. Adapt props to your app:

```typescript
<StoreReviewController
  loading={calendar.loading}
  error={calendar.error}
  hasCalendarData={calendar.events.length > 0}
/>

// Generic pattern — rename hasCalendarData → contentReady in the controller
const contentReady = !loading && !error && hasData;
```

Do **not** prompt while loading, on error, or before the user sees real content.

### Step 5–6: Mount controllers

**Root layout** (`_layout.tsx`):

```typescript
import { StoreReviewDevController } from '@/components/store-review-dev-controller';

// Inside RootLayoutInner, alongside other null-render controllers:
{__DEV__ ? <StoreReviewDevController /> : null}
```

**Main screen** (where primary content loads):

```typescript
import { StoreReviewController } from '@/components/store-review-controller';

<StoreReviewController loading={loading} error={error} hasCalendarData={hasData} />
```

### Step 7: Settings manual rate

Use `openStoreReviewPage()` for the user-initiated path (always opens store, no policy):

```typescript
const onRateApp = useCallback(async () => {
  setRateBusy(true);
  try {
    const opened = await openStoreReviewPage();
    if (!opened) throw new Error('Store reviews are not available on this platform.');
  } catch (e) {
    Alert.alert('Could not open review', e instanceof Error ? e.message : 'Try again later.');
  } finally {
    setRateBusy(false);
  }
}, []);
```

Add a "Rate this app" row under a Support section. Hide on web (`Platform.OS !== 'web'`).

**Dev-only** — add "Preview store review" button calling `requestStoreReview({ bypassPolicy: true })`.

---

## Launch interstitial coordination (optional)

Skip this section if the app has no launch interstitial ads.

1. Copy `launch-interstitial-session.ts` from reference.
2. In the interstitial controller, call session markers:
   - `markLaunchCountedThisSession()` after `incrementLaunchCount()`
   - `markLaunchInterstitialPending()` before ad load
   - `markLaunchInterstitialShowing()` on ad opened
   - `markLaunchInterstitialFinished()` on closed/error
3. `StoreReviewController` already calls `shouldDeferStoreReviewForLaunchInterstitial()` and re-checks after the delay.

Both controllers share a **once-per-session** guard (`handledThisSession`).

---

## PostHog analytics (optional)

The reference controller captures:

| Event | When |
|-------|------|
| `store_review_prompted` | Native dialog shown |
| `store_review_skipped` | Blocked — includes `reason`, `launch_count` |

Skip reasons: `min_launches`, `min_days_since_first_open`, `interstitial_launch`, `cooldown`, `max_prompts`, `not_available`, `native_request_failed`.

Remove PostHog imports/calls if the target app has no PostHog. Keep `logStoreReview` dev logging.

---

## API summary

| Function | Use |
|----------|-----|
| `canAutoPrompt(launchCount, interstitialWouldShow)` | Check eligibility |
| `requestStoreReview({ bypassPolicy? })` | Show native in-app review dialog |
| `openStoreReviewPage()` | Open App Store / Play Store review page |
| `recordFirstOpenIfNeeded()` | Called automatically on first launch count |
| `incrementLaunchCount()` | Call once per session at app start |
| `shouldDeferStoreReviewForLaunchInterstitial()` | Wait for interstitial idle (if ads) |

---

## Testing caveats

| Environment | Behavior |
|-------------|----------|
| iOS TestFlight | `isAvailableAsync()` returns **false** — native modal won't appear |
| iOS Simulator | Often no dialog; use dev client release build on real device |
| Android | Native review requires install from **Google Play internal test track** |
| Expo Go | Works for iteration; production behavior differs |
| Web | All review APIs return false — hide UI |

Dev controller auto-prompts after 2s (`bypassPolicy: true`). Production controller waits 1.5s after eligibility passes.

Manual "Rate this app" always opens the store page and works in TestFlight.

---

## Customization quick reference

```typescript
// store-review-prompt.ts — tune these
const MIN_LAUNCHES = 10;
const MIN_DAYS_SINCE_FIRST_OPEN = 3;
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PROMPTS_PER_YEAR = 3;

// store-review-controller.tsx
const AUTO_PROMPT_DELAY_MS = 1500;

// store-review-dev-controller.tsx
const DEV_AUTO_PROMPT_DELAY_MS = 2000;
```
