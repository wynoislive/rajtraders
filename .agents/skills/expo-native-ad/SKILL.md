---
name: expo-native-ad
description: Add or audit robust AdMob native-ad slots in Expo and React Native apps using react-native-google-mobile-ads. Use for NativeAd.createForAdRequest, NativeAdView, NativeAsset, NativeMediaView, native-ad retries or refreshes, missing native-ad requests, stale ads after foregrounding, or Android native-ad promises that never settle.
---

# Expo Native Ad

Implement native ads as consent-gated, component-owned resources. Read [reference.md](reference.md) before writing the lifecycle hook or patching the Android library; its concurrency and cleanup rules are required, not optional examples.

## Preconditions

- Verify the installed Expo, React Native, and `react-native-google-mobile-ads` versions. Read the matching Expo docs before changing config or native integration.
- Require an ads-init provider that exposes both `adsReady` and UMP's `canRequestAds`. Load only while both are true. Use the `expo-admob-att` skill when that provider is missing or incorrect.
- Use test IDs for development and internal test builds, and distinct production IDs per platform and placement. If internal builds are release-mode bundles, use an immutable build-profile flag instead of relying only on `__DEV__`; prove that flag is false in the production profile. Keep the native SDK import and IDs in the native `*.tsx` module so web/static resolution selects the stub.
- Never silently fall back to a test ID in a release build. Fail closed when a production ID is missing.

## Ownership and lifecycle invariants

- Give every mounted placement its own hook instance and `NativeAd` object. Do not use a module-level ad cache, shared ad promise, or cross-placement ad object.
- Decide whether ads should load on mount or only on focus. Expo Router `NativeTabs` eagerly mounts every tab screen, so a mount-triggered slot can request before that tab is visible; focus gating is a product decision, not an assumed optimization.
- React to `adsReady`, `canRequestAds`, unit-ID, and placement changes. A slot mounted before initialization must start once when it becomes eligible.
- Start exactly one initial load lifecycle per eligible component epoch. Defer that start by one macrotask so React development Strict Effect replay cancels its first setup before any native request.
- Keep only one native request in flight. Treat retries as attempts in the same load lifecycle; use bounded backoff.
- Invalidate old work with a generation plus request token. Destroy any ad returned after unmount, consent loss, or configuration change.
- Pass `useForeground` one stable callback and have it read the latest refresh function from a ref. The package hook subscribes once and otherwise retains its first closure.
- Refresh only after a cooldown. Ignore a foreground refresh while another request is active; queue only a newly eligible initial load that is waiting for an older stale request to settle.
- Destroy the replaced ad, every discarded result, the current ad on ineligibility/unmount, and retry timers. `NativeAd.destroy()` also removes its registered event listeners.

## Observability

Accept an optional analytics adapter; never import a specific analytics vendor into the reusable hook. Analytics must be fire-and-forget and must never change request control flow.

Emit an allowlisted lifecycle such as `component_mounted`, `waiting_for_ads_ready`, `eligible`, `request_started`, `request_succeeded`, `request_failed`, and `impression`. Include placement, platform, test/prod flag, lifecycle ID, trigger, attempt, duration, retry decision, and a normalized error code/domain/type. Never emit ad-unit IDs, response IDs, consent strings, raw error messages, or user-entered data.

## Native rendering and policy safety

- Render one `NativeAdView` for one `NativeAd`; put all registered assets beneath it.
- Make the `Text` or `Image` the direct child of each `NativeAsset`.
- Show clear `Advertisement`/`Ad` attribution and leave the AdChoices corner visible.
- Use a full-width `NativeMediaView` with exactly `height: 180` and `marginVertical: 6`.
- Use an optional 40x40 icon row beside advertiser/headline; stack text when no icon exists.
- Visually separate the slot from app content. Do not make it resemble a result card, form, list item, or primary app action.
- Do not clip `NativeAdView`, `NativeMediaView`, or ancestors that may contain AdChoices. Avoid `overflow: "hidden"` and clipping masks around the ad hierarchy.

## Required Android package audit

Before trusting retries, inspect the installed Android native module and confirm every native load resolves or rejects its JS promise:

```bash
node -p "require('react-native-google-mobile-ads/package.json').version"
rg -n "onAdFailedToLoad|promise\.reject|responseId" node_modules/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsNativeModule.kt
```

`react-native-google-mobile-ads@16.3.4` lacks `onAdFailedToLoad` rejection and returns without settling when the response ID is null. Patch or replace that exact version before relying on catch/retry behavior. Never apply a patch generated for 16.3.4 to another version; inspect the installed source first, prefer a verified fixed release, and otherwise generate a version-matched `patch-package` patch. A verified exact-version patch is bundled at [assets/react-native-google-mobile-ads+16.3.4.patch](assets/react-native-google-mobile-ads+16.3.4.patch); use it only after the installed version prints exactly `16.3.4`. See [reference.md](reference.md#android-native-promise-audit) for acceptance criteria and validation.

## Delivery checklist

- Add the native component/hook and a same-export `.web.tsx` null stub.
- Wire reactive `adsReady` and `canRequestAds` from the provider.
- Keep test/prod IDs separate and out of telemetry/logs.
- Verify the Android native promise path for the exact installed package version.
- Run typecheck, lint, a native Android compile, and an Expo export for every supported platform.
- Exercise not-ready to ready, success, failure/retry, background to foreground, consent loss, replacement, and unmount-during-load paths.
