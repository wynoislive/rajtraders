# Launch Interstitial — Source Templates

Replace placeholders before copying:

- `{STORAGE_PREFIX}` — e.g. `@my-app-name`
- `{IOS_INTERSTITIAL_UNIT_ID}` — AdMob interstitial unit ID (iOS)
- `{ANDROID_INTERSTITIAL_UNIT_ID}` — AdMob interstitial unit ID (Android)

---

## interstitial-ad.ts

```typescript
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (Platform.select({
      ios: '{IOS_INTERSTITIAL_UNIT_ID}',
      android: '{ANDROID_INTERSTITIAL_UNIT_ID}',
    }) ?? TestIds.INTERSTITIAL);
```

---

## launch-interstitial-policy.ts

```typescript
export const DEFAULT_LAUNCH_INTERSTITIAL_ENABLED = false;
export const DEFAULT_LAUNCH_INTERSTITIAL_THRESHOLD = 5;

/** Interstitials are opt-in only — enabled when PostHog explicitly returns true. */
export function isLaunchInterstitialEnabled(flagValue: unknown): boolean {
  return flagValue === true;
}

export function parseLaunchInterstitialThreshold(payload: unknown): number {
  if (
    payload &&
    typeof payload === 'object' &&
    'launch_threshold' in payload &&
    typeof (payload as { launch_threshold: unknown }).launch_threshold === 'number'
  ) {
    const threshold = (payload as { launch_threshold: number }).launch_threshold;
    if (threshold >= 1 && Number.isFinite(threshold)) {
      return Math.floor(threshold);
    }
  }
  return DEFAULT_LAUNCH_INTERSTITIAL_THRESHOLD;
}

export function wouldShowLaunchInterstitial(
  launchCount: number,
  enabled: boolean,
  threshold: number,
): boolean {
  return enabled && launchCount % threshold === 0;
}
```

---

## launch-interstitial-session.ts

```typescript
const LAUNCH_COUNTED_TIMEOUT_MS = 10000;
const INTERSTITIAL_IDLE_TIMEOUT_MS = 30000;

let launchCountedThisSession = false;
let launchCountedResolvers: (() => void)[] = [];

let interstitialPending = false;
let interstitialShowing = false;
let interstitialShownThisSession = false;
let interstitialIdleResolvers: (() => void)[] = [];

function resolveLaunchCounted() {
  launchCountedResolvers.forEach((resolve) => resolve());
  launchCountedResolvers = [];
}

function resolveInterstitialIdle() {
  interstitialIdleResolvers.forEach((resolve) => resolve());
  interstitialIdleResolvers = [];
}

export function markLaunchCountedThisSession(): void {
  if (launchCountedThisSession) {
    return;
  }
  launchCountedThisSession = true;
  resolveLaunchCounted();
}

export function waitForLaunchCountedThisSession(): Promise<void> {
  if (launchCountedThisSession) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, LAUNCH_COUNTED_TIMEOUT_MS);
    launchCountedResolvers.push(() => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
}

export function markLaunchInterstitialPending(): void {
  interstitialPending = true;
}

export function markLaunchInterstitialShowing(): void {
  interstitialPending = false;
  interstitialShowing = true;
  interstitialShownThisSession = true;
}

export function markLaunchInterstitialFinished(): void {
  interstitialPending = false;
  interstitialShowing = false;
  resolveInterstitialIdle();
}

export function wasLaunchInterstitialShownThisSession(): boolean {
  return interstitialShownThisSession;
}

export function isLaunchInterstitialActiveOrPending(): boolean {
  return interstitialPending || interstitialShowing;
}

export function waitForLaunchInterstitialIdle(): Promise<void> {
  if (!isLaunchInterstitialActiveOrPending()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, INTERSTITIAL_IDLE_TIMEOUT_MS);
    interstitialIdleResolvers.push(() => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
}

export async function shouldDeferStoreReviewForLaunchInterstitial(): Promise<boolean> {
  await waitForLaunchCountedThisSession();
  await waitForLaunchInterstitialIdle();
  return isLaunchInterstitialActiveOrPending() || wasLaunchInterstitialShownThisSession();
}
```

---

## app-launch-count.ts

If store review is wired, keep the `recordFirstOpenIfNeeded` import. Otherwise remove it and the `count === 0` branch.

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordFirstOpenIfNeeded } from '@/lib/store-review-prompt';

const STORAGE_KEY = '{STORAGE_PREFIX}/app-launch-count';

let incrementedThisSession = false;

export async function getLaunchCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function incrementLaunchCount(): Promise<number> {
  if (incrementedThisSession) {
    return getLaunchCount();
  }
  incrementedThisSession = true;

  const count = await getLaunchCount();
  if (count === 0) {
    await recordFirstOpenIfNeeded();
  }
  const next = count + 1;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // keep in-memory count for this session even if persist fails
  }
  return next;
}
```

---

## launch-interstitial-controller.web.tsx

```tsx
export function LaunchInterstitialController() {
  return null;
}
```

---

## launch-interstitial-controller.tsx

```tsx
import { useFeatureFlagWithPayload, usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import { incrementLaunchCount } from '@/lib/app-launch-count';
import {
  isLaunchInterstitialEnabled,
  parseLaunchInterstitialThreshold,
  wouldShowLaunchInterstitial,
} from '@/lib/launch-interstitial-policy';
import { INTERSTITIAL_AD_UNIT_ID } from '@/lib/interstitial-ad';
import {
  markLaunchCountedThisSession,
  markLaunchInterstitialFinished,
  markLaunchInterstitialPending,
  markLaunchInterstitialShowing,
} from '@/lib/launch-interstitial-session';
import { useAdsInit } from '@/providers/ads-init-provider';

const LAUNCH_INTERSTITIAL_FLAG = 'launch-interstitial';
const SPLASH_DELAY_MS = 700;
const POSTHOG_FLAG_TIMEOUT_MS = 10000;

let handledThisSession = false;

function logLaunchInterstitial(message: string, data?: Record<string, unknown>) {
  if (__DEV__) {
    if (data) {
      console.log(`[LaunchInterstitial] ${message}`, data);
    } else {
      console.log(`[LaunchInterstitial] ${message}`);
    }
  }
}

export function LaunchInterstitialController() {
  const posthog = usePostHog();
  const [flagValue, payload] = useFeatureFlagWithPayload(LAUNCH_INTERSTITIAL_FLAG);
  const { adsReady } = useAdsInit();
  const [flagTimedOut, setFlagTimedOut] = useState(false);
  const flagResolved = flagValue !== undefined || flagTimedOut;
  const interstitialEnabled = isLaunchInterstitialEnabled(flagValue);

  useEffect(() => {
    if (flagValue !== undefined) {
      setFlagTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => setFlagTimedOut(true), POSTHOG_FLAG_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [flagValue]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      logLaunchInterstitial('Skipped — web platform');
      return;
    }

    if (!adsReady) {
      logLaunchInterstitial('Waiting for ads to be ready');
      return;
    }

    if (!flagResolved) {
      logLaunchInterstitial('Waiting for PostHog feature flag');
      return;
    }

    if (handledThisSession) {
      return;
    }

    handledThisSession = true;

    let cancelled = false;
    const unsubscribers: (() => void)[] = [];

    (async () => {
      const launchCount = await incrementLaunchCount();
      markLaunchCountedThisSession();
      const threshold = parseLaunchInterstitialThreshold(payload);
      const shouldShowAd = wouldShowLaunchInterstitial(launchCount, interstitialEnabled, threshold);

      if (!interstitialEnabled) {
        logLaunchInterstitial('Skipped — interstitial disabled by default', {
          launchCount,
          launchThreshold: threshold,
          posthogFlagValue: flagValue,
          flagTimedOut,
        });
        markLaunchInterstitialFinished();
        posthog.capture('launch_interstitial_skipped', {
          launch_count: launchCount,
          launch_threshold: threshold,
          reason: flagTimedOut && flagValue === undefined ? 'flag_unavailable' : 'flag_disabled',
        });
        return;
      }

      if (!shouldShowAd) {
        logLaunchInterstitial('Skipped — not Nth launch', { launchCount, launchThreshold: threshold });
        markLaunchInterstitialFinished();
        posthog.capture('launch_interstitial_skipped', {
          launch_count: launchCount,
          launch_threshold: threshold,
          reason: 'not_nth_launch',
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, SPLASH_DELAY_MS));
      if (cancelled) {
        return;
      }

      logLaunchInterstitial('Loading interstitial ad', { launchCount, launchThreshold: threshold });
      markLaunchInterstitialPending();

      const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.LOADED, () => {
          if (cancelled) {
            return;
          }
          void interstitial.show();
        }),
      );

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.OPENED, () => {
          markLaunchInterstitialShowing();
          posthog.capture('launch_interstitial_shown', {
            launch_count: launchCount,
            launch_threshold: threshold,
          });
        }),
      );

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          markLaunchInterstitialFinished();
        }),
      );

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
          markLaunchInterstitialFinished();
          posthog.capture('launch_interstitial_failed', {
            launch_count: launchCount,
            launch_threshold: threshold,
            error: String(error),
          });
        }),
      );

      interstitial.load();
    })();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [adsReady, flagResolved, flagTimedOut, flagValue, interstitialEnabled, payload, posthog]);

  return null;
}
```

---

## Root layout snippet

```tsx
import { LaunchInterstitialController } from '@/components/launch-interstitial-controller';

// Inside PostHogProvider → AdsInitProvider → RootLayoutInner:
<LaunchInterstitialController />
```

---

## Store review coordination snippet

Add to `StoreReviewController` when **expo-store-review** is installed. Uses the same PostHog flag resolution pattern as the interstitial controller.

```typescript
const LAUNCH_INTERSTITIAL_FLAG = 'launch-interstitial';
const POSTHOG_FLAG_TIMEOUT_MS = 10000;

const [interstitialFlagValue, interstitialPayload] = useFeatureFlagWithPayload(LAUNCH_INTERSTITIAL_FLAG);
const [flagTimedOut, setFlagTimedOut] = useState(false);
const flagResolved = interstitialFlagValue !== undefined || flagTimedOut;
const interstitialEnabled = isLaunchInterstitialEnabled(interstitialFlagValue);

// Timeout effect (same as interstitial controller) ...

// Before auto-prompt:
if (!flagResolved) return;

const deferForInterstitial = await shouldDeferStoreReviewForLaunchInterstitial();
const launchCount = await getLaunchCount();
const interstitialThreshold = parseLaunchInterstitialThreshold(interstitialPayload);
const interstitialWouldShow = wouldShowLaunchInterstitial(
  launchCount,
  interstitialEnabled,
  interstitialThreshold,
);

if (deferForInterstitial || interstitialWouldShow) {
  return; // skip review this session
}

// After AUTO_PROMPT_DELAY_MS, re-check:
if (isLaunchInterstitialActiveOrPending() || wasLaunchInterstitialShownThisSession()) {
  return;
}
```

See **expo-store-review** reference for the full `StoreReviewController` template.

---

## PostHog dashboard setup

1. Feature flags → New feature flag
2. Key: `launch-interstitial`
3. Type: **Release toggle (boolean)**
4. Rollout: start at **0%** or disabled for all users
5. Optional payload JSON: `{ "launch_threshold": 5 }`
6. Enable for test users / internal cohort before production rollout
