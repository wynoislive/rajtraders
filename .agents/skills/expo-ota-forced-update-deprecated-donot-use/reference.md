# Expo OTA Forced Update — Reference

Copy-paste reference for the standard file set. Use the same paths in every Expo project.

---

## 1. Prerequisites

### expo-updates

Ensure EAS Update (or equivalent) is configured:

```bash
npx expo install expo-updates
```

`app.json` / `app.config.js` should include update URL and runtime version. Without this, `Updates.checkForUpdateAsync()` will not work in production builds.

### Path alias

Templates use `@/` imports. Match your project's alias (`tsconfig.json` → `paths`) or replace with relative imports.

---

## 2. File layout

```
your-expo-app/
├── app/
│   └── _layout.tsx              # mount <UpdateBanner />
├── components/
│   └── update-banner.tsx        # banner UI + update orchestration
├── constants/
│   └── posthog-feature-flags.ts # OTA flag section (PostHog projects only)
├── hooks/
│   └── use-forced-ota-update.ts # ONLY swap point: PostHog ↔ hardcoded
└── lib/
    ├── forced-ota-update.ts     # platform resolver
    └── update-banner-preview.ts # optional, dev preview store
```

---

## 3. `lib/forced-ota-update.ts`

Pure logic — no PostHog, no React. Identical in every project.

```typescript
import { Platform } from "react-native";

export type ForcedOtaUpdateConfig = {
  ios: boolean;
  android: boolean;
};

export function resolveForcedOtaUpdateForPlatform(
  config: ForcedOtaUpdateConfig,
  platform: typeof Platform.OS = Platform.OS,
): boolean {
  if (platform === "ios") return config.ios;
  if (platform === "android") return config.android;
  return config.ios;
}
```

---

## 4. `constants/posthog-feature-flags.ts` (PostHog projects)

Add this block to your existing flags file (or create the file if needed):

```typescript
/**
 * PostHog flag: Feature flags → New flag
 * - Key: ota-forced-update
 * - Type: boolean release toggle
 * - Payload (optional): { "ios": true, "android": false }
 * - Safe default when PostHog fails or flag is not ready: ios false, android false
 * - Flag enabled without payload: both platforms true
 * - To hardcode instead of PostHog, swap hooks/use-forced-ota-update.ts
 */
export const OTA_FORCED_UPDATE_FLAG = "ota-forced-update";

/** Used when PostHog is unavailable, not ready, or flag evaluation fails */
export const OTA_FORCED_UPDATE_DEFAULTS = {
  ios: false,
  android: false,
} as const;
```

### PostHog dashboard setup

| Goal | Flag value | Payload |
|------|------------|---------|
| Silent updates everywhere | `false` | — |
| Forced update both platforms | `true` | — |
| iOS only | `true` | `{ "ios": true, "android": false }` |
| Android only | `true` | `{ "ios": false, "android": true }` |

---

## 5. `hooks/use-forced-ota-update.ts`

### Variant A — PostHog (default)

`UpdateBanner` must render inside `PostHogProvider`.

```typescript
import { useFeatureFlagWithPayload, usePostHog } from "posthog-react-native";
import { useEffect, useMemo } from "react";
import { AppState } from "react-native";

import {
  OTA_FORCED_UPDATE_DEFAULTS,
  OTA_FORCED_UPDATE_FLAG,
} from "@/constants/posthog-feature-flags";
import {
  resolveForcedOtaUpdateForPlatform,
  type ForcedOtaUpdateConfig,
} from "@/lib/forced-ota-update";

type ForcedOtaUpdatePayload = {
  ios?: boolean;
  android?: boolean;
};

function parsePayload(payload: unknown): ForcedOtaUpdatePayload {
  if (payload == null || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  return {
    ios: typeof record.ios === "boolean" ? record.ios : undefined,
    android: typeof record.android === "boolean" ? record.android : undefined,
  };
}

function buildConfig(
  flagValue: boolean | string,
  payload: ForcedOtaUpdatePayload,
): ForcedOtaUpdateConfig {
  if (flagValue !== true) {
    return { ios: false, android: false };
  }

  return {
    ios: payload.ios ?? true,
    android: payload.android ?? true,
  };
}

export function useForcedOtaUpdate(): {
  ready: boolean;
  forcedUpdate: boolean;
  config: ForcedOtaUpdateConfig;
} {
  const posthog = usePostHog();
  const [flagValue, payload] = useFeatureFlagWithPayload(OTA_FORCED_UPDATE_FLAG);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        posthog.reloadFeatureFlags();
      }
    });
    return () => subscription.remove();
  }, [posthog]);

  const parsed = useMemo(() => parsePayload(payload), [payload]);
  const ready = flagValue !== undefined;

  const config = useMemo(() => {
    if (!ready || flagValue === undefined) {
      return {
        ios: OTA_FORCED_UPDATE_DEFAULTS.ios,
        android: OTA_FORCED_UPDATE_DEFAULTS.android,
      };
    }

    return buildConfig(flagValue, parsed);
  }, [ready, flagValue, parsed]);

  const forcedUpdate = useMemo(
    () => resolveForcedOtaUpdateForPlatform(config),
    [config],
  );

  return { ready, forcedUpdate, config };
}
```

### Variant B — Hardcoded (no PostHog)

Replace the **entire hook file** with this. No other files change.

```typescript
import {
  resolveForcedOtaUpdateForPlatform,
  type ForcedOtaUpdateConfig,
} from "@/lib/forced-ota-update";

const HARDCODED_CONFIG: ForcedOtaUpdateConfig = {
  ios: false,
  android: false,
};

export function useForcedOtaUpdate(): {
  ready: boolean;
  forcedUpdate: boolean;
  config: ForcedOtaUpdateConfig;
} {
  return {
    ready: true,
    forcedUpdate: resolveForcedOtaUpdateForPlatform(HARDCODED_CONFIG),
    config: HARDCODED_CONFIG,
  };
}
```

Edit `HARDCODED_CONFIG` per project. Remove PostHog imports entirely — `posthog-react-native` is not required.

---

## 6. `lib/update-banner-preview.ts` (optional)

Dev-only store for previewing banner states from Settings without publishing an OTA.

```typescript
export type UpdateBannerStatus = "idle" | "checking" | "downloading" | "ready";

export type UpdateBannerPreviewStatus = "downloading" | "ready" | null;

let previewStatus: UpdateBannerPreviewStatus = null;
const listeners = new Set<() => void>();

export function getUpdateBannerPreviewStatus() {
  return previewStatus;
}

export function setUpdateBannerPreviewStatus(status: UpdateBannerPreviewStatus) {
  previewStatus = status;
  listeners.forEach((listener) => listener());
}

export function subscribeUpdateBannerPreview(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
```

Wire in Settings (`__DEV__` only): call `setUpdateBannerPreviewStatus("downloading" | "ready" | null)`.

---

## 7. `components/update-banner.tsx`

Adapt theme imports (`Colors`, `useColorScheme`) to your project. Keep file name and hook usage unchanged.

```typescript
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// TODO: swap for your project's theme tokens
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useForcedOtaUpdate } from "@/hooks/use-forced-ota-update";
import {
  getUpdateBannerPreviewStatus,
  subscribeUpdateBannerPreview,
  type UpdateBannerStatus,
} from "@/lib/update-banner-preview";

function useUpdateBannerPreviewStatus() {
  return useSyncExternalStore(
    subscribeUpdateBannerPreview,
    getUpdateBannerPreviewStatus,
    () => null,
  );
}

async function runSilentUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  } catch {
    // ON_LOAD is fallback
  }
}

export function UpdateBanner() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { ready, forcedUpdate } = useForcedOtaUpdate();
  const previewStatus = useUpdateBannerPreviewStatus();
  const [status, setStatus] = useState<UpdateBannerStatus>("idle");

  const effectiveForcedUpdate = forcedUpdate || (__DEV__ && previewStatus != null);

  const showUpdateReadyAlert = useCallback(() => {
    Alert.alert(
      "Update ready",
      "A new version has been downloaded. Restart the app to apply it.",
      [
        { text: "Later", onPress: () => setStatus("idle") },
        {
          text: "Restart now",
          onPress: () => {
            if (__DEV__ && previewStatus) {
              Alert.alert(
                "Preview mode",
                "Restart is disabled while previewing the update banner.",
              );
              return;
            }
            void Updates.reloadAsync();
          },
        },
      ],
    );
  }, [previewStatus]);

  const checkUpdate = useCallback(async () => {
    try {
      setStatus("checking");
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        setStatus("idle");
        return;
      }
      setStatus("downloading");
      await Updates.fetchUpdateAsync();
      setStatus("ready");
      showUpdateReadyAlert();
    } catch {
      setStatus("idle");
    }
  }, [showUpdateReadyAlert]);

  useEffect(() => {
    if (!ready) return;

    if (!effectiveForcedUpdate) {
      void runSilentUpdate();
      return;
    }

    if (__DEV__ && previewStatus) return;
    void checkUpdate();
  }, [ready, effectiveForcedUpdate, previewStatus, checkUpdate]);

  useEffect(() => {
    if (!ready || !effectiveForcedUpdate) return;
    if (__DEV__ && previewStatus === "ready") {
      showUpdateReadyAlert();
    }
  }, [ready, effectiveForcedUpdate, previewStatus, showUpdateReadyAlert]);

  if (!ready || !effectiveForcedUpdate) return null;

  const effectiveStatus = __DEV__ && previewStatus ? previewStatus : status;
  if (effectiveStatus === "idle" || effectiveStatus === "checking") return null;

  const message =
    effectiveStatus === "downloading"
      ? "Downloading update..."
      : "Update downloaded. Restart required.";

  const iconName =
    effectiveStatus === "ready" ? "cloud-done-outline" : "cloud-download-outline";

  return (
    <View
      style={[
        styles.banner,
        {
          top: insets.top + 8,
          backgroundColor: c.billCard,
          borderColor: c.border,
        },
        Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colorScheme === "dark" ? 0.25 : 0.08,
            shadowRadius: 8,
          },
          android: { elevation: 4 },
          default: {},
        }),
      ]}
    >
      <View style={styles.headerRow}>
        {effectiveStatus === "downloading" ? (
          <ActivityIndicator size="small" color={c.billHeaderTitle} />
        ) : (
          <Ionicons name={iconName} size={20} color={c.billHeaderTitle} />
        )}
        <Text style={[styles.message, { color: c.billOnSurface }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
});
```

If you skip dev preview, replace preview imports with stubs:

```typescript
const previewStatus = null;
// remove useSyncExternalStore helper and preview-related effects branches
```

---

## 8. `app/_layout.tsx` integration

### With PostHog

```tsx
import { PostHogProvider } from "posthog-react-native";
import { UpdateBanner } from "@/components/update-banner";

export default function RootLayout() {
  return (
    <PostHogProvider apiKey="..." options={{ host: "https://eu.i.posthog.com" }}>
      {/* other providers */}
      <RootNavigation />
    </PostHogProvider>
  );
}

function RootNavigation() {
  return (
    <>
      {/* Stack / Tabs */}
      <UpdateBanner />
      <StatusBar />
    </>
  );
}
```

`UpdateBanner` must be a **child** of `PostHogProvider`.

### Without PostHog

Same layout — omit `PostHogProvider`. Use hardcoded hook variant.

```tsx
import { UpdateBanner } from "@/components/update-banner";

function RootNavigation() {
  return (
    <>
      {/* Stack / Tabs */}
      <UpdateBanner />
    </>
  );
}
```

Never pass `forcedUpdate` as a prop. The banner reads config from the hook.

---

## 9. Settings dev preview (optional)

In a dev-only settings section:

```tsx
import { setUpdateBannerPreviewStatus } from "@/lib/update-banner-preview";

// Chips: Off (null) | Downloading | Ready
onPress={() => setUpdateBannerPreviewStatus("downloading")}
onPress={() => setUpdateBannerPreviewStatus("ready")}
onPress={() => setUpdateBannerPreviewStatus(null)}
```

Preview works in `__DEV__` even when forced update is disabled for the platform.

---

## 10. Decision tree

```
Need OTA forced update in a new Expo project?
│
├─ PostHog installed?
│   ├─ Yes → Variant A hook + flag constants + PostHogProvider wraps UpdateBanner
│   └─ No  → Variant B hook (hardcoded config only)
│
├─ Flag fails / not loaded?
│   └─ Both platforms false → silent updates (safe default)
│
└─ Need to preview UI in dev?
    └─ Add update-banner-preview.ts + settings chips
```

---

## 11. Troubleshooting

| Issue | Fix |
|-------|-----|
| Banner shows then disappears | Flag flipped from true → false after reload; check PostHog rollout |
| Always silent, never banner | Hook returns false; verify flag is `true` or hardcoded config |
| Crash on launch without PostHog | Using PostHog hook outside `PostHogProvider`; switch to Variant B |
| Updates never apply | Check EAS Update config; dev builds skip OTA unless configured |
| iOS works, Android doesn't | PostHog payload `{ "android": false }` or hardcoded config |
| Flash of wrong mode on cold start | Ensure `if (!ready) return` guards exist in UpdateBanner effects |

---

## 12. Migrating an existing project

1. Add files in order: `lib/forced-ota-update.ts` → hook → `update-banner.tsx` → layout mount.
2. Remove any inline `forcedUpdate={true/false}` props from layout.
3. Move flag key into `constants/posthog-feature-flags.ts` if not already there.
4. Set `OTA_FORCED_UPDATE_DEFAULTS` to `{ ios: false, android: false }`.
5. Test both modes: flag off (silent) and flag on with payload per platform.
