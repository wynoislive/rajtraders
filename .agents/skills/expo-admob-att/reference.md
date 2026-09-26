# Reference: Expo AdMob, UMP, and ATT

Use this as a portable pattern, not as a version lock. Replace every `CHANGE_ME_*` value and adapt import aliases to the target project.

## Contents

- [Version gate and dependencies](#version-gate-and-dependencies)
- [AdMob console prerequisites](#admob-console-prerequisites)
- [Static Expo config](#static-expo-config)
- [Native provider](#native-provider)
- [Web provider](#web-provider)
- [Settings privacy options](#settings-privacy-options)
- [Root layout](#root-layout)
- [Testing-only consent reset](#testing-only-consent-reset)
- [Config and runtime validation](#config-and-runtime-validation)
- [Why the order matters](#why-the-order-matters)

## Version gate and dependencies

Read the target repo instructions first. Then inspect, rather than guess, the versions:

```sh
node -p "require('expo/package.json').version"
node -p "require('react-native-google-mobile-ads/package.json').version"
npx expo install --check
```

For Expo SDK `N`, read `https://docs.expo.dev/versions/vN.0.0/sdk/tracking-transparency/` and the matching `build-properties` page before editing config. Inspect the installed ads package's `AdsConsentInfo` and `AdsConsentInterface` types because consent APIs can change.

Install Expo-owned packages with Expo's resolver and the ads package with the project's package manager:

```sh
npx expo install expo-tracking-transparency expo-build-properties
npm install react-native-google-mobile-ads
```

Substitute `yarn`, `pnpm`, or `bun` for the last command when the lockfile requires it. This integration needs a development/production native build; Expo Go cannot supply an arbitrary third-party native module.

## AdMob console prerequisites

Before testing code:

1. Create and publish the applicable regional privacy messages in AdMob **Privacy & messaging**.
2. On iOS, choose one ATT owner:
   - Preferred: configure an AdMob IDFA explainer so UMP presents the explainer and ATT alert.
   - Alternative: omit that message and use the provider's manual ATT fallback after UMP.
3. Register consent test devices before forcing debug geography on physical devices.

Do not show both a custom pre-prompt and a UMP IDFA explainer unless the product intentionally designed and reviewed that experience.

## Static Expo config

Merge this into the existing `app.json` or dynamic app config. Keep the two ATT strings identical. App IDs use `~`; ad unit IDs use `/` and do not belong here.

```json
{
  "expo": {
    "android": {
      "permissions": ["com.google.android.gms.permission.AD_ID"]
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "extraProguardRules": "-keep class com.google.android.gms.internal.consent_sdk.** { *; }"
          }
        }
      ],
      [
        "expo-tracking-transparency",
        {
          "userTrackingPermission": "CHANGE_ME_EXPLAIN_WHY_THE_APP_REQUESTS_TRACKING"
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          "iosAppId": "ca-app-pub-CHANGE_ME~CHANGE_ME",
          "androidAppId": "ca-app-pub-CHANGE_ME~CHANGE_ME",
          "delayAppMeasurementInit": true,
          "userTrackingUsageDescription": "CHANGE_ME_EXPLAIN_WHY_THE_APP_REQUESTS_TRACKING"
        }
      ]
    ]
  }
}
```

If `expo-build-properties` already has `extraProguardRules`, append the UMP rule with a newline instead of replacing existing rules. A native rebuild is required after config-plugin changes.

## Native provider

Create `providers/ads-init-provider.tsx`. This example targets the `react-native-google-mobile-ads` v16 consent surface. It intentionally:

- refreshes UMP on every native process launch;
- accepts only UMP's `canRequestAds` as eligibility;
- permits previous-session eligibility after a UMP network error;
- lets UMP own ATT when it already changed ATT status;
- otherwise requests ATT only after the consent flow and Purpose 1 check;
- initializes Mobile Ads once; and
- never turns readiness on merely because an operation failed.

```tsx
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from "react-native-google-mobile-ads";

type AdsInitState = {
  adsReady: boolean;
  canRequestAds: boolean;
  isPrivacyOptionsRequired: boolean;
};

type AdsInitContextValue = AdsInitState & {
  showPrivacyOptionsForm: () => Promise<void>;
};

const INITIAL_STATE: AdsInitState = {
  adsReady: false,
  canRequestAds: false,
  isPrivacyOptionsRequired: false,
};

const AdsInitContext = createContext<AdsInitContextValue>({
  ...INITIAL_STATE,
  showPrivacyOptionsForm: async () => {},
});

// Module state survives provider remounts and React Strict Mode effect replay.
let launchInitialization: Promise<AdsInitState> | null = null;
let mobileAdsInitialized = false;

function consentFields(info: AdsConsentInfo): Omit<AdsInitState, "adsReady"> {
  return {
    canRequestAds: info.canRequestAds,
    isPrivacyOptionsRequired:
      info.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
  };
}

async function previousSessionConsent(error: unknown): Promise<AdsConsentInfo | null> {
  console.warn("[Ads] UMP update/form failed; checking its prior-session state.", error);
  try {
    return await AdsConsent.getConsentInfo();
  } catch (fallbackError) {
    console.warn("[Ads] UMP state is unavailable.", fallbackError);
    return null;
  }
}

async function gatherConsent(): Promise<AdsConsentInfo | null> {
  try {
    // Required on every app launch on iOS and Android.
    await AdsConsent.requestInfoUpdate();
    return await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch (error) {
    // UMP may still allow ads from a valid decision made in a previous session.
    return previousSessionConsent(error);
  }
}

async function requestManualAttIfAppropriate(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const { status } = await getTrackingPermissionsAsync();

    // A configured UMP IDFA message will already have resolved this status.
    if (status !== "undetermined") return;

    const gdprApplies = await AdsConsent.getGdprApplies();
    if (gdprApplies) {
      const purposeConsents = await AdsConsent.getPurposeConsents();
      if (!purposeConsents.startsWith("1")) return;
    }

    // No timer is needed. This occurs only after the UMP form has completed.
    await requestTrackingPermissionsAsync();
  } catch (error) {
    // ATT controls IDFA. Failure or denial does not revoke UMP ad eligibility.
    console.warn("[Ads] ATT unavailable; continuing without IDFA.", error);
  }
}

async function initializeForConsent(info: AdsConsentInfo): Promise<AdsInitState> {
  const consent = consentFields(info);
  if (!consent.canRequestAds) return { ...consent, adsReady: false };

  await requestManualAttIfAppropriate();

  try {
    if (!mobileAdsInitialized) {
      await mobileAds().initialize();
      mobileAdsInitialized = true;
    }
    return { ...consent, adsReady: true };
  } catch (error) {
    console.warn("[Ads] Mobile Ads SDK initialization failed.", error);
    return { ...consent, adsReady: false };
  }
}

async function initializeLaunch(): Promise<AdsInitState> {
  const info = await gatherConsent();
  return info ? initializeForConsent(info) : INITIAL_STATE;
}

function initializeLaunchOnce(): Promise<AdsInitState> {
  launchInitialization ??= initializeLaunch();
  return launchInitialization;
}

export function AdsInitProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdsInitState>(INITIAL_STATE);
  const privacyFormPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void initializeLaunchOnce().then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const showPrivacyOptionsForm = useCallback((): Promise<void> => {
    if (privacyFormPromise.current) return privacyFormPromise.current;

    const task = (async () => {
      // Ad slots should observe this and release ads loaded under the old choice.
      setState((current) => ({ ...current, adsReady: false }));

      try {
        const info = await AdsConsent.showPrivacyOptionsForm();
        const next = await initializeForConsent(info);
        launchInitialization = Promise.resolve(next);
        setState(next);
      } catch (error) {
        const info = await previousSessionConsent(error);
        const next = info ? await initializeForConsent(info) : INITIAL_STATE;
        launchInitialization = Promise.resolve(next);
        setState(next);
        throw error;
      }
    })().finally(() => {
      privacyFormPromise.current = null;
    });

    privacyFormPromise.current = task;
    return task;
  }, []);

  const value = useMemo(
    () => ({ ...state, showPrivacyOptionsForm }),
    [showPrivacyOptionsForm, state],
  );

  return <AdsInitContext.Provider value={value}>{children}</AdsInitContext.Provider>;
}

export function useAdsInit(): AdsInitContextValue {
  return useContext(AdsInitContext);
}
```

Do not use `adsReady` to block rendering the application. Use it only to gate ad creation and to release ads when it becomes false. Each ad loader should require `adsReady && canRequestAds` immediately before calling the native ad API.

## Web provider

Create `providers/ads-init-provider.web.tsx` with the same exports and no native ads imports:

```tsx
import React, { createContext, useContext, useMemo } from "react";

type AdsInitContextValue = {
  adsReady: boolean;
  canRequestAds: boolean;
  isPrivacyOptionsRequired: boolean;
  showPrivacyOptionsForm: () => Promise<void>;
};

const AdsInitContext = createContext<AdsInitContextValue>({
  adsReady: false,
  canRequestAds: false,
  isPrivacyOptionsRequired: false,
  showPrivacyOptionsForm: async () => {},
});

export function AdsInitProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      adsReady: false,
      canRequestAds: false,
      isPrivacyOptionsRequired: false,
      showPrivacyOptionsForm: async () => {},
    }),
    [],
  );

  return <AdsInitContext.Provider value={value}>{children}</AdsInitContext.Provider>;
}

export function useAdsInit(): AdsInitContextValue {
  return useContext(AdsInitContext);
}
```

Give each ad component or hook its own `.web.tsx` no-op as well. A provider shim alone cannot protect a web bundle if another web-reachable module imports `react-native-google-mobile-ads` directly.

## Settings privacy options

Expose the provider through an optional project-named hook:

```tsx
export { useAdsInit } from "@/providers/ads-init-provider";
```

Render the row only when UMP requires it and coalesce duplicate taps:

```tsx
const {
  isPrivacyOptionsRequired,
  showPrivacyOptionsForm,
} = useAdsInit();
const [privacyBusy, setPrivacyBusy] = useState(false);

async function onPrivacyOptionsPress() {
  if (privacyBusy) return;
  setPrivacyBusy(true);
  try {
    await showPrivacyOptionsForm();
  } finally {
    setPrivacyBusy(false);
  }
}

// Adapt this to the project's settings-row component.
return isPrivacyOptionsRequired ? (
  <Button
    disabled={privacyBusy}
    onPress={() => void onPrivacyOptionsPress()}
    title="Privacy choices"
  />
) : null;
```

Do not label this action “reset consent.” It presents Google's currently required privacy-options form and applies the resulting eligibility.

## Root layout

Wrap navigation once, without delaying normal app UI:

```tsx
export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AdsInitProvider>
        <RootNavigation />
      </AdsInitProvider>
    </AppThemeProvider>
  );
}
```

Provider order may follow project dependencies; the requirement is that all native ad loaders are descendants of `AdsInitProvider`.

## Testing-only consent reset

`AdsConsent.reset()` is a UMP testing tool, not a production withdrawal API. If a debug screen needs it, make the guard impossible to bypass accidentally:

```tsx
async function resetConsentForRegisteredTestDevice() {
  if (!__DEV__) throw new Error("UMP reset is development-only");
  AdsConsent.reset();
  // Relaunch and run requestInfoUpdate with explicit debug settings.
}
```

Reset does not reset iOS ATT. Delete and reinstall the test app to exercise the ATT prompt again. Never use placeholder test IDs or forced geography in a release build.

## Config and runtime validation

### Introspect generated config

Run from the target project:

```sh
npx expo config --type introspect --json > /tmp/expo-admob-introspect.json
node <<'NODE'
const config = require('/tmp/expo-admob-introspect.json');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const plugin = (name) =>
  (config.plugins ?? []).find((entry) =>
    (Array.isArray(entry) ? entry[0] : entry) === name
  );

const adsPlugin = plugin('react-native-google-mobile-ads');
const trackingPlugin = plugin('expo-tracking-transparency');
const buildPlugin = plugin('expo-build-properties');
const infoPlist = config._internal?.modResults?.ios?.infoPlist ?? {};
const manifest = config._internal?.modResults?.android?.manifest?.manifest ?? {};
const permissions = manifest['uses-permission'] ?? [];
const metadata = manifest.application?.[0]?.['meta-data'] ?? [];

assert(Array.isArray(adsPlugin), 'AdMob Expo plugin missing');
assert(adsPlugin[1]?.delayAppMeasurementInit === true, 'Delayed measurement missing');
assert(infoPlist.GADDelayAppMeasurementInit === true, 'iOS delayed measurement not generated');
assert(Boolean(infoPlist.GADApplicationIdentifier), 'iOS AdMob app ID not generated');
assert(Boolean(infoPlist.NSUserTrackingUsageDescription), 'iOS ATT text not generated');
assert(
  trackingPlugin?.[1]?.userTrackingPermission ===
    adsPlugin?.[1]?.userTrackingUsageDescription,
  'ATT descriptions differ between plugins'
);
assert(
  permissions.some((item) =>
    item.$?.['android:name'] === 'com.google.android.gms.permission.AD_ID'
  ),
  'Android AD_ID permission missing'
);
assert(
  metadata.some((item) =>
    item.$?.['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
  ),
  'Android AdMob app ID not generated'
);
assert(
  metadata.some((item) =>
    item.$?.['android:name'] ===
      'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT' &&
    item.$?.['android:value'] === 'true'
  ),
  'Android delayed measurement not generated'
);
assert(
  buildPlugin?.[1]?.android?.extraProguardRules?.includes(
    'com.google.android.gms.internal.consent_sdk'
  ),
  'UMP ProGuard keep rule missing from Expo config'
);

console.log('AdMob/UMP Expo config checks passed');
NODE
```

Introspection verifies the config-plugin inputs and generated plist/manifest. To verify the actual ProGuard output, inspect `android/app/proguard-rules.pro` after prebuild. Run `expo prebuild` only in a clean/disposable worktree if native directories contain hand-written changes.

### Build and behavior checks

- Run the project's typecheck and lint commands.
- Build both native platforms after config changes; a JavaScript-only reload is insufficient.
- Confirm web export/build succeeds without resolving the native ads module.
- Test EEA first launch: consent form, Purpose 1 accepted/declined, ATT accepted/denied.
- Test non-EEA first launch and returning launches.
- Test UMP failure with no prior decision: no ad request and `adsReady` stays false.
- Test UMP failure with valid prior eligibility: IDFA-appropriate ads may continue.
- Test the required privacy-options row and confirm mounted ad slots release their old ads while the form is open.
- Test React Strict Mode/development replay and confirm Mobile Ads initialization occurs once.
- Use AdMob test unit IDs for ad rendering; consent debug settings and ad test IDs solve different problems.

## Why the order matters

- Google requires a consent-information update on each launch, then the required form, then a `canRequestAds` check.
- UMP can present the AdMob-configured IDFA explainer and ATT alert itself.
- When ATT remains undetermined, a manual request belongs after UMP; under GDPR, Purpose 1 must permit storage/access first.
- ATT denial removes IDFA from requests but does not itself forbid eligible ads.
- `privacyOptionsRequirementStatus` controls whether a production privacy entry point is required. Form availability is not the same state.
- Delayed measurement prevents the ads SDK from beginning user-level measurement before the consent-gated first ad request.

Primary sources: [Google UMP iOS](https://developers.google.com/admob/ios/privacy), [Google UMP Android](https://developers.google.com/admob/android/privacy), [Google IDFA message](https://developers.google.com/admob/ios/privacy/idfa), [Google GDPR guidance](https://developers.google.com/admob/ios/privacy/gdpr), [React Native Google Mobile Ads consent](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent), and the target Expo SDK's versioned TrackingTransparency/BuildProperties docs.
