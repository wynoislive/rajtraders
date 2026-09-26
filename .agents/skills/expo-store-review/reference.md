# Store Review — Source Templates

Replace placeholders before copying:

- `{STORAGE_PREFIX}` — e.g. `@my-app-name`
- `{IOS_ITUNES_ITEM_ID}` — App Store Apple ID (numeric)
- `{ANDROID_PACKAGE_NAME}` — e.g. `com.example.myapp`

---

## store-review-prompt.ts

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

const FIRST_OPEN_AT_KEY = '{STORAGE_PREFIX}/first-open-at';
const LAST_PROMPT_AT_KEY = '{STORAGE_PREFIX}/review-last-prompt-at';
const PROMPT_COUNT_KEY = '{STORAGE_PREFIX}/review-prompt-count';

const MIN_LAUNCHES = 10;
const MIN_DAYS_SINCE_FIRST_OPEN = 3;
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PROMPTS_PER_YEAR = 3;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const IOS_ITUNES_ITEM_ID = '{IOS_ITUNES_ITEM_ID}';
const ANDROID_PACKAGE_NAME = '{ANDROID_PACKAGE_NAME}';

export type StoreReviewSkipReason =
  | 'web_platform'
  | 'content_not_ready'
  | 'min_launches'
  | 'min_days_since_first_open'
  | 'interstitial_launch'
  | 'cooldown'
  | 'max_prompts'
  | 'not_available'
  | 'already_handled_this_session';

export async function recordFirstOpenIfNeeded(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(FIRST_OPEN_AT_KEY);
    if (!existing) {
      await AsyncStorage.setItem(FIRST_OPEN_AT_KEY, String(Date.now()));
    }
  } catch {
    // ignore persistence errors
  }
}

async function getFirstOpenAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(FIRST_OPEN_AT_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function getLastPromptAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PROMPT_AT_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function getPromptCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PROMPT_COUNT_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

async function recordAutoPrompt(): Promise<void> {
  const now = Date.now();
  const count = await getPromptCount();
  try {
    await AsyncStorage.multiSet([
      [LAST_PROMPT_AT_KEY, String(now)],
      [PROMPT_COUNT_KEY, String(count + 1)],
    ]);
  } catch {
    // ignore persistence errors
  }
}

export async function canAutoPrompt(
  launchCount: number,
  interstitialWouldShow: boolean,
): Promise<{ allowed: boolean; reason?: StoreReviewSkipReason }> {
  if (Platform.OS === 'web') {
    return { allowed: false, reason: 'web_platform' };
  }

  if (launchCount < MIN_LAUNCHES) {
    return { allowed: false, reason: 'min_launches' };
  }

  const firstOpenAt = await getFirstOpenAt();
  if (
    firstOpenAt === null ||
    Date.now() - firstOpenAt < MIN_DAYS_SINCE_FIRST_OPEN * 24 * 60 * 60 * 1000
  ) {
    return { allowed: false, reason: 'min_days_since_first_open' };
  }

  if (interstitialWouldShow) {
    return { allowed: false, reason: 'interstitial_launch' };
  }

  const lastPromptAt = await getLastPromptAt();
  if (lastPromptAt !== null && Date.now() - lastPromptAt < COOLDOWN_MS) {
    return { allowed: false, reason: 'cooldown' };
  }

  const promptCount = await getPromptCount();
  if (promptCount >= MAX_PROMPTS_PER_YEAR) {
    if (lastPromptAt === null || Date.now() - lastPromptAt < ONE_YEAR_MS) {
      return { allowed: false, reason: 'max_prompts' };
    }
  }

  const available = await StoreReview.isAvailableAsync();
  if (!available) {
    return { allowed: false, reason: 'not_available' };
  }

  return { allowed: true };
}

export async function openStoreReviewPage(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'ios') {
    const nativeUrl =
      `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${IOS_ITUNES_ITEM_ID}?action=write-review`;
    const webUrl =
      `https://apps.apple.com/app/apple-store/id${IOS_ITUNES_ITEM_ID}?action=write-review`;
    await Linking.openURL((await Linking.canOpenURL(nativeUrl)) ? nativeUrl : webUrl);
    return true;
  }

  if (Platform.OS === 'android') {
    const nativeUrl = `market://details?id=${ANDROID_PACKAGE_NAME}&showAllReviews=true`;
    const webUrl =
      `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&showAllReviews=true`;
    await Linking.openURL((await Linking.canOpenURL(nativeUrl)) ? nativeUrl : webUrl);
    return true;
  }

  return false;
}

export async function requestStoreReview(options?: { bypassPolicy?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const bypassPolicy = options?.bypassPolicy ?? false;

  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return false;

    await StoreReview.requestReview();

    if (!bypassPolicy) {
      await recordAutoPrompt();
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[StoreReview] Native review request failed', error);
    }
    return false;
  }
}
```

---

## app-launch-count.ts

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordFirstOpenIfNeeded } from '@/lib/store-review-prompt';

const STORAGE_KEY = '{STORAGE_PREFIX}/app-launch-count';

let incrementedThisSession = false;

export async function getLaunchCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
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

## launch-interstitial-session.ts (optional — apps with launch ads)

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
  if (launchCountedThisSession) return;
  launchCountedThisSession = true;
  resolveLaunchCounted();
}

export function waitForLaunchCountedThisSession(): Promise<void> {
  if (launchCountedThisSession) return Promise.resolve();
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
  if (!isLaunchInterstitialActiveOrPending()) return Promise.resolve();
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

Interstitial controller wiring:

```typescript
const launchCount = await incrementLaunchCount();
markLaunchCountedThisSession();
// before ad load:
markLaunchInterstitialPending();
// on AdEventType.OPENED:
markLaunchInterstitialShowing();
// on AdEventType.CLOSED or ERROR:
markLaunchInterstitialFinished();
```

---

## store-review-controller.tsx

Rename `hasCalendarData` → `contentReady` if adapting to a non-calendar app.

```typescript
import { useFeatureFlagWithPayload, usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { getLaunchCount } from '@/lib/app-launch-count';
import {
  parseLaunchInterstitialThreshold,
  wouldShowLaunchInterstitial,
} from '@/lib/launch-interstitial-policy';
import {
  isLaunchInterstitialActiveOrPending,
  shouldDeferStoreReviewForLaunchInterstitial,
  wasLaunchInterstitialShownThisSession,
} from '@/lib/launch-interstitial-session';
import { canAutoPrompt, requestStoreReview } from '@/lib/store-review-prompt';

const LAUNCH_INTERSTITIAL_FLAG = 'launch-interstitial';
const AUTO_PROMPT_DELAY_MS = 1500;

let handledThisSession = false;

type StoreReviewControllerProps = {
  loading: boolean;
  error: string | null;
  hasCalendarData: boolean; // rename to contentReady in non-calendar apps
};

function logStoreReview(message: string, data?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[StoreReview] ${message}`, data ?? '');
  }
}

export function StoreReviewController({
  loading,
  error,
  hasCalendarData,
}: StoreReviewControllerProps) {
  const posthog = usePostHog();
  const [interstitialEnabled, interstitialPayload] = useFeatureFlagWithPayload(LAUNCH_INTERSTITIAL_FLAG);
  const contentReady = !loading && !error && hasCalendarData;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!contentReady) return;
    if (handledThisSession) return;
    if (interstitialEnabled === undefined) {
      logStoreReview('Waiting for PostHog feature flag');
      return;
    }

    handledThisSession = true;
    let cancelled = false;

    (async () => {
      const deferForInterstitial = await shouldDeferStoreReviewForLaunchInterstitial();
      if (cancelled) return;

      const launchCount = await getLaunchCount();
      const interstitialThreshold = parseLaunchInterstitialThreshold(interstitialPayload);
      const interstitialWouldShow = wouldShowLaunchInterstitial(
        launchCount,
        Boolean(interstitialEnabled),
        interstitialThreshold,
      );

      if (deferForInterstitial || interstitialWouldShow) {
        posthog.capture('store_review_skipped', {
          launch_count: launchCount,
          reason: 'interstitial_launch',
          interstitial_would_show: interstitialWouldShow,
          interstitial_shown_this_session: deferForInterstitial,
        });
        return;
      }

      const eligibility = await canAutoPrompt(launchCount, false);
      if (!eligibility.allowed) {
        posthog.capture('store_review_skipped', {
          launch_count: launchCount,
          reason: eligibility.reason ?? 'unknown',
          interstitial_would_show: false,
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, AUTO_PROMPT_DELAY_MS));
      if (cancelled) return;

      if (isLaunchInterstitialActiveOrPending() || wasLaunchInterstitialShownThisSession()) {
        posthog.capture('store_review_skipped', {
          launch_count: launchCount,
          reason: 'interstitial_launch',
          interstitial_would_show: false,
          interstitial_shown_this_session: true,
        });
        return;
      }

      const requested = await requestStoreReview();
      posthog.capture(requested ? 'store_review_prompted' : 'store_review_skipped', {
        launch_count: launchCount,
        source: 'auto',
        ...(!requested ? { reason: 'native_request_failed' } : {}),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [contentReady, interstitialEnabled, interstitialPayload, posthog]);

  return null;
}
```

**Without PostHog or launch interstitials**, simplify:

- Remove `usePostHog`, feature flag, and interstitial policy imports
- Pass `interstitialWouldShow: false` to `canAutoPrompt`
- Remove `shouldDeferStoreReviewForLaunchInterstitial` checks
- Keep delay + `requestStoreReview()` flow

---

## store-review-dev-controller.tsx

```typescript
import { useEffect } from 'react';
import { Platform } from 'react-native';

import {
  isLaunchInterstitialActiveOrPending,
  shouldDeferStoreReviewForLaunchInterstitial,
  wasLaunchInterstitialShownThisSession,
} from '@/lib/launch-interstitial-session';
import { requestStoreReview } from '@/lib/store-review-prompt';

const DEV_AUTO_PROMPT_DELAY_MS = 2000;

let handledThisSession = false;

export function StoreReviewDevController() {
  useEffect(() => {
    if (!__DEV__ || Platform.OS === 'web') return;
    if (handledThisSession) return;
    handledThisSession = true;

    let cancelled = false;

    (async () => {
      const deferForInterstitial = await shouldDeferStoreReviewForLaunchInterstitial();
      if (cancelled) return;
      if (deferForInterstitial) return;

      await new Promise((resolve) => setTimeout(resolve, DEV_AUTO_PROMPT_DELAY_MS));
      if (cancelled) return;

      if (isLaunchInterstitialActiveOrPending() || wasLaunchInterstitialShownThisSession()) return;

      await requestStoreReview({ bypassPolicy: true });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
```

Without interstitials, remove defer/interstitial checks and call `requestStoreReview({ bypassPolicy: true })` after the delay.

---

## Settings screen snippet

```typescript
import { openStoreReviewPage, requestStoreReview } from '@/lib/store-review-prompt';

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

// Dev only:
const onPreviewNativeReview = useCallback(async () => {
  setRateBusy(true);
  try {
    const requested = await requestStoreReview({ bypassPolicy: true });
    if (!requested) {
      Alert.alert(
        'Native review unavailable',
        'On Android, install from a Google Play internal test track to test the native review dialog.',
      );
    }
  } finally {
    setRateBusy(false);
  }
}, []);
```
