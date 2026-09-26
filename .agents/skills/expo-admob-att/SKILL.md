---
name: expo-admob-att
description: Wire or audit privacy-safe Google Mobile Ads startup in an Expo app using react-native-google-mobile-ads, Android/iOS UMP consent, iOS ATT, delayed app measurement, web shims, and a production privacy-options entry point. Use when adding or reviewing AdMob initialization, AdsInitProvider, expo-tracking-transparency, canRequestAds gating, GDPR/UMP or IDFA messages, consent withdrawal, or AdMob settings UI.
---

# Expo AdMob, UMP, and ATT

Implement consent as an ad-request gate, not as a timer. Read [reference.md](reference.md) before generating provider or settings code.

## Establish the exact versions

1. Read the repository instructions and `package.json`.
2. Determine the installed Expo SDK and `react-native-google-mobile-ads` versions. Do not copy dependency versions from this skill.
3. Read the matching versioned Expo docs, for example SDK 57:
   - `https://docs.expo.dev/versions/v57.0.0/sdk/tracking-transparency/`
   - `https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/`
4. Check the installed ads package types and its current consent guide before using an API. The snippets in `reference.md` target the v16 consent API; adapt only when the installed API proves different.

## Preserve these invariants

- Request fresh UMP consent information on **every native app launch on both platforms**.
- Load and show the required UMP form, then read the returned/current `canRequestAds` value.
- Never request an ad or expose `adsReady: true` unless UMP says ads may be requested and `mobileAds().initialize()` succeeded.
- On a UMP error, inspect UMP's previous-session `canRequestAds`; never manufacture eligibility.
- Let a configured UMP IDFA message handle ATT. If ATT is manual, request it only after UMP and only when GDPR Purpose 1 permits device storage/access.
- Treat ATT denial as loss of IDFA, not loss of ad eligibility. Continue with eligible IDFA-less ads.
- Initialize the Mobile Ads SDK once per process and tolerate React Strict Mode effect replay.
- Derive the settings entry from `privacyOptionsRequirementStatus`; present `showPrivacyOptionsForm()` from a user action.
- Use `AdsConsent.reset()` only on registered test devices during development, never as production consent withdrawal.
- Keep native ads imports out of web bundles with matching `.web.tsx` modules.

## Implementation workflow

1. Configure GDPR/privacy messages in AdMob. Configure an IDFA explainer there if UMP should own ATT.
2. Install version-compatible dependencies with the project's package manager. Prefer `npx expo install` for Expo packages.
3. Configure both AdMob app IDs, the same ATT usage string in both plugins, `delayAppMeasurementInit: true`, Android `AD_ID`, and the UMP ProGuard keep rule. Merge with existing plugin options; do not overwrite other ProGuard rules.
4. Add the native/web provider pair from `reference.md` and wrap navigation at the root.
5. Make every ad loader require both `adsReady` and `canRequestAds`, and make it release loaded ads when readiness becomes false.
6. Add a privacy-options row only when required. Disable duplicate taps while its promise is pending.
7. Validate config introspection, TypeScript, lint, native generation/builds, and the consent test matrix in `reference.md`.

## Reject these patterns

- ATT-first flow, arbitrary prompt sleeps, or skipping UMP after ATT denial
- `isConsentFormAvailable` used as “consent required” or as the settings-row condition
- unconditional `adsReady: true` merely because an operation threw
- ad requests before `canRequestAds`
- persisted app-owned consent status used instead of the per-launch UMP update
- production “revoke” actions implemented with `AdsConsent.reset()`
- debug geography or test-device overrides shipped in release configuration

## Primary references

- [Google UMP for iOS](https://developers.google.com/admob/ios/privacy)
- [Google UMP for Android](https://developers.google.com/admob/android/privacy)
- [Google iOS IDFA message](https://developers.google.com/admob/ios/privacy/idfa)
- [Google GDPR guidance](https://developers.google.com/admob/ios/privacy/gdpr)
- [React Native Google Mobile Ads consent guide](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent)
- [Reusable code and verification](reference.md)
