# Reference: robust native-ad slot

Use this pattern when porting native ads to another Expo app. Adapt the ads-init and theme imports, replace every `CHANGE_ME_*` value, and keep the lifecycle invariants intact.

The slot owns one ad locally. It performs one initial load lifecycle when `adsReady && canRequestAds` becomes true, permits one request at a time, retries with bounded backoff, refreshes after foreground cooldown, and destroys every ad it no longer owns.

## Table of contents

- [Integration contract](#integration-contract)
- [Native component and hook](#native-component-and-hook)
- [Web stub](#web-stub)
- [Placement usage](#placement-usage)
- [Android native promise audit](#android-native-promise-audit)
- [Validation matrix](#validation-matrix)

## Integration contract

- `useAdsInit()` must expose reactive `adsReady` and UMP `canRequestAds` booleans. Do not collapse these into an optimistic `ready` value.
- Keep each placement's hook mounted only for that placement. A retained tab retains its local ad; revisiting it does not imply another request until the foreground cooldown or an explicit refresh.
- Expo Router `NativeTabs` eagerly mounts all tab screens. Decide explicitly whether mount-triggered preloading is desired; otherwise gate the slot with actual focus. Keep focus eligibility separate from UMP `canRequestAds`, and account for unmount/reload behavior if focus gating removes the component.
- Never share a `NativeAd`, promise, or cache between placements. The module-level values below are IDs only, not ad state.
- Development uses `TestIds.NATIVE`. Release builds require nonempty platform-specific production IDs and must not fall back to a test ID. If the project creates internal release-mode builds, replace `__DEV__` below with an immutable build-profile flag that is true for internal testing and demonstrably false for the production profile; do not control unit selection with a remote flag.
- The optional analytics adapter is allowlisted and fire-and-forget. It never receives an ad-unit ID, response ID, consent string, or raw error message.

The theme contract used below expects `Colors.light` and `Colors.dark` to contain `adSlotBackground`, `adSlotBorder`, `adSlotLabel`, `adMutedText`, `adBodyText`, `adCtaBackground`, and `adCtaText`. Rename those accesses to match the target app instead of introducing a second theme source.

## Native component and hook

Create `components/native-ad.tsx`:

```tsx
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAdsInit } from "@/providers/ads-init-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  NativeAd,
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
  useForeground,
} from "react-native-google-mobile-ads";

type ProductionUnitIds = { ios: string; android: string };

function requireProductionUnitId(placement: string, ids: ProductionUnitIds): string {
  const id = Platform.OS === "ios" ? ids.ios : Platform.OS === "android" ? ids.android : null;
  const isValidAdMobUnit = typeof id === "string" && /^ca-app-pub-\d+\/\d+$/.test(id);
  if (!isValidAdMobUnit || id === TestIds.NATIVE) {
    throw new Error(`Missing production native-ad unit for ${placement} on ${Platform.OS}`);
  }
  return id as string;
}

export const RESULTS_NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : requireProductionUnitId("results", {
      ios: "CHANGE_ME_RESULTS_NATIVE_AD_UNIT_ID_IOS",
      android: "CHANGE_ME_RESULTS_NATIVE_AD_UNIT_ID_ANDROID",
    });

export const PREVIEW_NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : requireProductionUnitId("preview", {
      ios: "CHANGE_ME_PREVIEW_NATIVE_AD_UNIT_ID_IOS",
      android: "CHANGE_ME_PREVIEW_NATIVE_AD_UNIT_ID_ANDROID",
    });

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000] as const;
const DEFAULT_COOLDOWN_MS = 100_000;

type AnalyticsValue = string | number | boolean | null;
type AnalyticsProperties = Readonly<Record<string, AnalyticsValue>>;

export type NativeAdAnalytics = (
  event: string,
  properties: AnalyticsProperties,
) => void | Promise<void>;

type LoadTrigger = "initial_ready" | "foreground_refresh" | "manual_refresh";

type LoadContext = {
  adUnitId: string;
  generation: number;
  lifecycleId: string;
  maxRetries: number;
  placement: string;
  trigger: LoadTrigger;
};

export type NativeAdSlotOptions = {
  adUnitId: string;
  adsReady: boolean;
  analytics?: NativeAdAnalytics;
  canRequestAds: boolean;
  cooldownMs?: number;
  maxRetries?: number;
  placement: string;
};

type NativeAdSlot = {
  isLoading: boolean;
  nativeAd: NativeAd | null;
  refreshAd: () => void;
};

function normalizedErrorValue(value: unknown, fallback: string): string {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  return String(value).slice(0, 80).replace(/[^a-zA-Z0-9._/-]/g, "_");
}

function normalizeNativeAdError(error: unknown) {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const userInfo =
    record?.userInfo && typeof record.userInfo === "object"
      ? (record.userInfo as Record<string, unknown>)
      : null;

  return {
    error_code: normalizedErrorValue(record?.code ?? userInfo?.code, "unknown"),
    error_domain: normalizedErrorValue(record?.domain ?? userInfo?.domain, "unknown"),
    error_type: normalizedErrorValue(record?.name, error instanceof Error ? "Error" : typeof error),
  };
}

function makeComponentLifecycleId(): string {
  return `component-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useNativeAdSlot({
  adUnitId,
  adsReady,
  analytics,
  canRequestAds,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  maxRetries: requestedMaxRetries = DEFAULT_MAX_RETRIES,
  placement,
}: NativeAdSlotOptions): NativeAdSlot {
  const maxRetries = Math.max(0, Math.min(requestedMaxRetries, RETRY_DELAYS_MS.length));
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const adRef = useRef<NativeAd | null>(null);
  const activeRequestTokenRef = useRef<number | null>(null);
  const adUnitIdRef = useRef(adUnitId);
  const adsReadyRef = useRef(adsReady);
  const analyticsRef = useRef(analytics);
  const canRequestAdsRef = useRef(canRequestAds);
  const componentLifecycleIdRef = useRef<string | null>(null);
  const cooldownMsRef = useRef(cooldownMs);
  const emitRef = useRef<(event: string, properties?: AnalyticsProperties) => void>(() => {});
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const loadSequenceRef = useRef(0);
  const maxRetriesRef = useRef(maxRetries);
  const mountedEventSentRef = useRef(false);
  const mountedRef = useRef(false);
  const pendingInitialRef = useRef(false);
  const placementRef = useRef(placement);
  const refreshRef = useRef<(trigger: LoadTrigger) => void>(() => {});
  const requestRef = useRef<(context: LoadContext, retryCount: number) => void>(() => {});
  const requestSequenceRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<(trigger: LoadTrigger, queueInitialIfBusy?: boolean) => void>(() => {});
  const waitingEventSentRef = useRef(false);

  componentLifecycleIdRef.current ??= makeComponentLifecycleId();
  adUnitIdRef.current = adUnitId;
  adsReadyRef.current = adsReady;
  analyticsRef.current = analytics;
  canRequestAdsRef.current = canRequestAds;
  cooldownMsRef.current = cooldownMs;
  maxRetriesRef.current = maxRetries;
  placementRef.current = placement;

  emitRef.current = (event, properties = {}) => {
    try {
      const result = analyticsRef.current?.(event, {
        component_lifecycle_id: componentLifecycleIdRef.current,
        is_test_ad: adUnitIdRef.current === TestIds.NATIVE,
        placement: placementRef.current,
        platform: Platform.OS,
        ...properties,
      });
      if (result && typeof (result as PromiseLike<void>).then === "function") {
        void Promise.resolve(result).catch(() => {});
      }
    } catch {
      // Analytics must never alter the request lifecycle.
    }
  };

  const invalidateCurrent = useCallback((updateState: boolean) => {
    generationRef.current += 1;
    pendingInitialRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const currentAd = adRef.current;
    adRef.current = null;
    if (updateState) {
      setNativeAd(null);
      setIsLoading(false);
    }
    currentAd?.destroy();
  }, []);

  requestRef.current = (context, retryCount) => {
    if (
      !mountedRef.current ||
      !adsReadyRef.current ||
      !canRequestAdsRef.current ||
      context.generation !== generationRef.current ||
      inFlightRef.current
    ) {
      return;
    }

    const requestToken = ++requestSequenceRef.current;
    const requestStartedAt = Date.now();
    activeRequestTokenRef.current = requestToken;
    inFlightRef.current = true;

    const attemptProperties = {
      is_test_ad: context.adUnitId === TestIds.NATIVE,
      load_lifecycle_id: context.lifecycleId,
      load_trigger: context.trigger,
      placement: context.placement,
      request_attempt: retryCount + 1,
    } satisfies AnalyticsProperties;
    emitRef.current("native_ad_request_started", attemptProperties);

    void (async () => {
      try {
        const ad = await NativeAd.createForAdRequest(context.adUnitId);
        const isCurrent =
          mountedRef.current &&
          adsReadyRef.current &&
          canRequestAdsRef.current &&
          context.adUnitId === adUnitIdRef.current &&
          context.generation === generationRef.current &&
          context.placement === placementRef.current &&
          activeRequestTokenRef.current === requestToken;

        emitRef.current("native_ad_request_succeeded", {
          ...attemptProperties,
          load_duration_ms: Date.now() - requestStartedAt,
          result_discarded: !isCurrent,
        });

        if (!isCurrent) {
          ad.destroy();
          return;
        }

        let impressionSent = false;
        ad.addAdEventListener(NativeAdEventType.IMPRESSION, () => {
          if (impressionSent) return;
          impressionSent = true;
          emitRef.current("native_ad_impression", attemptProperties);
        });

        const previousAd = adRef.current;
        adRef.current = ad;
        lastLoadedAtRef.current = Date.now();
        setNativeAd(ad);
        setIsLoading(false);
        previousAd?.destroy();
      } catch (error) {
        const isCurrent =
          mountedRef.current &&
          adsReadyRef.current &&
          canRequestAdsRef.current &&
          context.adUnitId === adUnitIdRef.current &&
          context.generation === generationRef.current &&
          context.placement === placementRef.current &&
          activeRequestTokenRef.current === requestToken;
        const retryScheduled = isCurrent && retryCount < context.maxRetries;

        emitRef.current("native_ad_request_failed", {
          ...attemptProperties,
          ...normalizeNativeAdError(error),
          load_duration_ms: Date.now() - requestStartedAt,
          result_discarded: !isCurrent,
          retry_scheduled: retryScheduled,
        });

        if (!isCurrent) return;
        if (retryScheduled) {
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            requestRef.current(context, retryCount + 1);
          }, RETRY_DELAYS_MS[retryCount] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        } else {
          setIsLoading(false);
        }
      } finally {
        if (activeRequestTokenRef.current === requestToken) {
          activeRequestTokenRef.current = null;
          inFlightRef.current = false;

          if (
            pendingInitialRef.current &&
            mountedRef.current &&
            adsReadyRef.current &&
            canRequestAdsRef.current
          ) {
            pendingInitialRef.current = false;
            startRef.current("initial_ready");
          }
        }
      }
    })();
  };

  startRef.current = (trigger, queueInitialIfBusy = false) => {
    if (!mountedRef.current || !adsReadyRef.current || !canRequestAdsRef.current) return;
    if (inFlightRef.current) {
      if (queueInitialIfBusy && trigger === "initial_ready") {
        pendingInitialRef.current = true;
        setIsLoading(true);
      }
      return;
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const generation = ++generationRef.current;
    const context: LoadContext = {
      adUnitId: adUnitIdRef.current,
      generation,
      lifecycleId: `${componentLifecycleIdRef.current}-load-${++loadSequenceRef.current}`,
      maxRetries: maxRetriesRef.current,
      placement: placementRef.current,
      trigger,
    };

    const previousAd = adRef.current;
    adRef.current = null;
    if (previousAd) {
      setNativeAd(null);
      previousAd.destroy();
    }
    setIsLoading(true);

    emitRef.current("native_ad_eligible", {
      load_lifecycle_id: context.lifecycleId,
      load_trigger: context.trigger,
      placement: context.placement,
    });
    requestRef.current(context, 0);
  };

  refreshRef.current = (trigger) => {
    if (!adsReadyRef.current || !canRequestAdsRef.current || inFlightRef.current) return;
    if (Date.now() - lastLoadedAtRef.current < cooldownMsRef.current) return;
    startRef.current(trigger);
  };

  const refreshAd = useCallback(() => {
    refreshRef.current("manual_refresh");
  }, []);

  const onForeground = useCallback(() => {
    refreshRef.current("foreground_refresh");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!mountedEventSentRef.current) {
      mountedEventSentRef.current = true;
      emitRef.current("native_ad_component_mounted");
    }

    return () => {
      mountedRef.current = false;
      invalidateCurrent(false);
    };
  }, [invalidateCurrent]);

  useEffect(() => {
    invalidateCurrent(true);

    if (!adsReady || !canRequestAds) {
      if (!waitingEventSentRef.current) {
        waitingEventSentRef.current = true;
        emitRef.current("native_ad_waiting_for_ads_ready", {
          waiting_reason: canRequestAds ? "sdk_initializing" : "consent_or_eligibility_pending",
        });
      }
      return () => invalidateCurrent(mountedRef.current);
    }

    waitingEventSentRef.current = false;
    const eligibleGeneration = generationRef.current;
    // React Strict Effect replay clears the first timer before it can call the native SDK.
    const initialTimer = setTimeout(() => {
      if (
        mountedRef.current &&
        adsReadyRef.current &&
        canRequestAdsRef.current &&
        generationRef.current === eligibleGeneration
      ) {
        startRef.current("initial_ready", true);
      }
    }, 0);

    return () => {
      clearTimeout(initialTimer);
      invalidateCurrent(mountedRef.current);
    };
  }, [adUnitId, adsReady, canRequestAds, invalidateCurrent, maxRetries, placement]);

  // react-native-google-mobile-ads subscribes once; keep this callback stable and read a ref.
  useForeground(onForeground);

  return { isLoading, nativeAd, refreshAd };
}

type AdHeaderProps = {
  headlineColor: string;
  mutedColor: string;
  nativeAd: NativeAd;
};

function AdHeader({ headlineColor, mutedColor, nativeAd }: AdHeaderProps) {
  const title = (
    <>
      {nativeAd.advertiser ? (
        <NativeAsset assetType={NativeAssetType.ADVERTISER}>
          <Text numberOfLines={1} style={[styles.advertiser, { color: mutedColor }]}>
            {nativeAd.advertiser}
          </Text>
        </NativeAsset>
      ) : null}
      {nativeAd.headline ? (
        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text numberOfLines={2} style={[styles.headline, { color: headlineColor }]}>
            {nativeAd.headline}
          </Text>
        </NativeAsset>
      ) : null}
    </>
  );

  if (!nativeAd.icon?.url) return <View style={styles.headerStack}>{title}</View>;

  return (
    <View style={styles.headerRow}>
      <NativeAsset assetType={NativeAssetType.ICON}>
        <Image resizeMode="cover" source={{ uri: nativeAd.icon.url }} style={styles.icon} />
      </NativeAsset>
      <View style={styles.headerText}>{title}</View>
    </View>
  );
}

export type NativeAdDisplayProps = {
  nativeAd: NativeAd;
  style?: StyleProp<ViewStyle>;
};

export function NativeAdDisplay({ nativeAd, style }: NativeAdDisplayProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const palette = Colors[scheme];

  return (
    <View accessibilityRole="none" style={[styles.slot, style]}>
      <Text style={[styles.adLabel, { color: palette.adSlotLabel }]}>Advertisement</Text>
      <NativeAdView
        nativeAd={nativeAd}
        style={[
          styles.adView,
          { backgroundColor: palette.adSlotBackground, borderColor: palette.adSlotBorder },
        ]}
      >
        <View style={styles.content}>
          <AdHeader
            headlineColor={palette.adBodyText}
            mutedColor={palette.adMutedText}
            nativeAd={nativeAd}
          />
          <NativeMediaView resizeMode="cover" style={styles.media} />
          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text numberOfLines={3} style={[styles.body, { color: palette.adBodyText }]}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          ) : null}
          {nativeAd.callToAction ? (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Text
                numberOfLines={1}
                style={[
                  styles.cta,
                  { backgroundColor: palette.adCtaBackground, color: palette.adCtaText },
                ]}
              >
                {nativeAd.callToAction}
              </Text>
            </NativeAsset>
          ) : null}
        </View>
      </NativeAdView>
    </View>
  );
}

export type NativeAdComponentProps = {
  adUnitId?: string;
  analytics?: NativeAdAnalytics;
  placement?: string;
  style?: StyleProp<ViewStyle>;
};

export function NativeAdComponent({
  adUnitId = RESULTS_NATIVE_AD_UNIT_ID,
  analytics,
  placement = "results",
  style,
}: NativeAdComponentProps) {
  const { adsReady, canRequestAds } = useAdsInit();
  const { nativeAd } = useNativeAdSlot({
    adUnitId,
    adsReady,
    analytics,
    canRequestAds,
    placement,
  });

  return nativeAd ? <NativeAdDisplay nativeAd={nativeAd} style={style} /> : null;
}

const styles = StyleSheet.create({
  slot: { alignSelf: "stretch", marginVertical: 20, width: "100%" },
  adLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  adView: { alignSelf: "stretch", borderStyle: "dashed", borderWidth: 1, width: "100%" },
  content: { gap: 8, padding: 12, paddingTop: 28 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  headerStack: { gap: 2 },
  headerText: { flex: 1, gap: 2 },
  icon: { height: 40, width: 40 },
  advertiser: { fontSize: 12, fontWeight: "500" },
  headline: { fontSize: 15, fontWeight: "700" },
  media: { height: 180, marginVertical: 6, width: "100%" },
  body: { fontSize: 14 },
  cta: {
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 12,
    textAlign: "center",
  },
});
```

Why the state machine is intentionally more detailed than the SDK's minimal example:

- The readiness effect is reactive and starts once after the first stable eligible setup, including when the component mounted while readiness was false.
- A generation invalidates requests and retry timers after consent loss, configuration changes, or cleanup. A request token prevents an older promise from winning after a newer lifecycle.
- `inFlightRef` is not cleared during invalidation because JavaScript cannot cancel the native promise. A new initial load queues until that old promise actually settles.
- `useForeground` in the package installs its subscription with an empty dependency list. The stable `onForeground` callback delegates to `refreshRef`, so it never captures first-render readiness.
- `destroy()` owns listener cleanup. The hook destroys stale results, replaced/current ads, and ads held when the slot becomes ineligible or unmounts.

## Web stub

Create `components/native-ad.web.tsx`. Keep every export used by shared screens, but never import `react-native-google-mobile-ads` here:

```tsx
import type { StyleProp, ViewStyle } from "react-native";

type AnalyticsValue = string | number | boolean | null;
export type NativeAdAnalytics = (
  event: string,
  properties: Readonly<Record<string, AnalyticsValue>>,
) => void | Promise<void>;

export const RESULTS_NATIVE_AD_UNIT_ID = "";
export const PREVIEW_NATIVE_AD_UNIT_ID = "";

export type NativeAdSlotOptions = {
  adUnitId: string;
  adsReady: boolean;
  analytics?: NativeAdAnalytics;
  canRequestAds: boolean;
  cooldownMs?: number;
  maxRetries?: number;
  placement: string;
};

export function useNativeAdSlot(_options: NativeAdSlotOptions) {
  return { isLoading: false, nativeAd: null, refreshAd: () => {} };
}

export type NativeAdDisplayProps = { nativeAd: unknown; style?: StyleProp<ViewStyle> };
export function NativeAdDisplay(_props: NativeAdDisplayProps): null {
  return null;
}

export type NativeAdComponentProps = {
  adUnitId?: string;
  analytics?: NativeAdAnalytics;
  placement?: string;
  style?: StyleProp<ViewStyle>;
};
export function NativeAdComponent(_props: NativeAdComponentProps): null {
  return null;
}
```

Standard Expo/Metro platform resolution selects `*.web.tsx`; no custom Metro configuration is needed.

## Placement usage

Use distinct IDs and local component instances:

```tsx
export function ResultsNativeAd() {
  return <NativeAdComponent placement="results" />;
}

export function PreviewNativeAd() {
  return (
    <NativeAdComponent
      adUnitId={PREVIEW_NATIVE_AD_UNIT_ID}
      placement="preview"
    />
  );
}
```

To add analytics, adapt the app's client once and pass the function. Add app version/build or environment fields in this adapter, but keep the hook's privacy-safe allowlist:

```tsx
const captureNativeAd: NativeAdAnalytics = (event, properties) => {
  analytics.capture(event, {
    ...properties,
    app_build: buildNumber,
    app_version: appVersion,
  });
};

<NativeAdComponent analytics={captureNativeAd} placement="results" />;
```

Do not key a slot by unrelated screen state or remount it on every render. Remount only when a new placement lifecycle is intentional.

## Android native promise audit

Audit the exact installed package rather than assuming a semver range fixed native failures:

```bash
node -p "require('react-native-google-mobile-ads/package.json').version"
rg -n "onAdFailedToLoad|promise\.reject|responseId" node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsNativeModule.kt
```

The module passes only if all native outcomes settle the promise:

1. `onAdFailedToLoad(LoadAdError)` reaches a failure callback that calls `promise.reject(...)` exactly once.
2. A loaded ad whose `responseInfo?.responseId` is null is destroyed and rejects; it must not use a bare `return@loadAd`.
3. Success resolves once, clears any failure callback, and stores the holder for later `destroy(responseId)`.
4. Failure/success callbacks cannot both settle the same promise.

### Version 16.3.4

The stock Android module in `react-native-google-mobile-ads@16.3.4` fails criteria 1 and 2: no-fill/network failures do not reject, and a null response ID returns without resolving or rejecting. Consequently, `NativeAd.createForAdRequest()` can remain pending forever and JavaScript catch/retry/failure analytics never run.

For this exact version only, make a version-matched patch that:

- imports `com.google.android.gms.ads.LoadAdError`;
- changes the holder load method to accept both loaded and failed callbacks;
- overrides `AdListener.onAdFailedToLoad`, clears the stored failure callback, and invokes it;
- rejects with a stable code such as `ERROR_LOAD_<numeric-code>`;
- destroys the loaded ad and rejects with a stable `ERROR_LOAD_NO_RESPONSE_ID` code when response ID is null;
- clears the failure callback on successful or failed load.

The skill bundles the already-compiled patch at [assets/react-native-google-mobile-ads+16.3.4.patch](assets/react-native-google-mobile-ads+16.3.4.patch), SHA-256 `fdb9cb6a36268a68dd3dd6e1f8bb71d42655ec76ccca9b7631a5d158cb8c2441`. Use this asset only when the first command below prints exactly `16.3.4`; otherwise stop and audit the installed version. Do not edit, regenerate, or rename the bundled patch while reusing it.

```json
{
  "dependencies": {
    "react-native-google-mobile-ads": "16.3.4"
  },
  "devDependencies": {
    "patch-package": "8.0.1"
  },
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

Install the bundled file as `patches/react-native-google-mobile-ads+16.3.4.patch`, then verify a clean install applies it and compile the native module:

```bash
node -p "require('react-native-google-mobile-ads/package.json').version"
shasum -a 256 patches/react-native-google-mobile-ads+16.3.4.patch
npm ci
cd android
./gradlew :react-native-google-mobile-ads:compileDebugKotlin --console=plain
```

For any other package version, do not use the bundled asset. Repeat the source audit first. Prefer a release whose installed source demonstrably settles both failure paths; if it does not, edit that exact installed source, run `npx patch-package react-native-google-mobile-ads` to generate a new version-matched patch, and compile it. Never rely on a JavaScript timeout as the primary fix: it can unblock UI but cannot cancel the native load or safely transfer ownership of a late ad.

## Validation matrix

| Scenario | Required result |
| --- | --- |
| Mount with readiness false, then true | One eligible lifecycle and one first native request |
| React development Strict Effects | One first native request, not two |
| Re-render with unchanged inputs | No new request |
| Foreground before cooldown | No new request |
| Foreground after cooldown | One new lifecycle; stable callback sees current readiness |
| Native failure | Promise rejects, failure event emits, bounded retry runs |
| Consent/readiness becomes false | Timer cancels, current ad destroys, late result destroys |
| Unit ID or placement changes | Old generation invalidates; only the new result can render |
| Unmount while request is pending | No state update; a late returned ad destroys |
| Replacement/unmount | Prior/current ad destroys and its listeners are removed |
| Web export | Stub returns null and native SDK is absent from the web bundle |

Run the target app's typecheck and lint, then build the Android native module and export every supported Expo platform. Test failure behavior on a native development build; Expo Go cannot host this custom native module.
