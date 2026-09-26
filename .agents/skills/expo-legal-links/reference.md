# Reference: Legal Links (cross-project)

Use this document as the **source of truth** when porting legal link wiring to another Expo app. **Path alias** `@/*` → repo root must match `tsconfig.json`.

**Default URLs:** Use **`https://www.omarfarooq.dev`** for `termsOfService`, `privacyPolicy`, and `support` unless the user explicitly provides different URLs.

**Dependency:** `react-native-webview`. Only URLs listed in `LEGAL_URLS` (or matching `key`) load — avoids opening arbitrary URLs from query params.

---

## Table of contents

- [`constants/legal-config.ts`](#constantslegal-configts)
- [`app/legal-webview.tsx`](#applegal-webviewtsx)
- [Root layout: `app/_layout.tsx`](#root-layout-app_layouttsx)

---

## `constants/legal-config.ts`

```tsx
export const LEGAL_URLS = {
  termsOfService: "https://www.omarfarooq.dev",
  privacyPolicy: "https://www.omarfarooq.dev",
  support: "https://www.omarfarooq.dev",
} as const;

export type LegalDocKey = keyof typeof LEGAL_URLS;

export const LEGAL_SETTINGS_ROWS: { key: LegalDocKey; label: string }[] = [
  { key: "termsOfService", label: "Terms of Service" },
  { key: "privacyPolicy", label: "Privacy Policy" },
  { key: "support", label: "Support" },
];
```

---

## `app/legal-webview.tsx`

```tsx
import { LEGAL_URLS, type LegalDocKey } from "@/constants/legal-config";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const ALLOWED_URLS = new Set<string>(Object.values(LEGAL_URLS));

function resolveLegalUrl(key: string | undefined, fallbackUrl: string | undefined): string | null {
  if (key && key in LEGAL_URLS) {
    return LEGAL_URLS[key as LegalDocKey];
  }
  if (fallbackUrl && ALLOWED_URLS.has(fallbackUrl)) {
    return fallbackUrl;
  }
  return null;
}

export default function LegalWebViewScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { url, title, key } = useLocalSearchParams<{
    url?: string;
    title?: string;
    key?: string;
  }>();

  const resolvedUrl = useMemo(() => resolveLegalUrl(typeof key === "string" ? key : undefined, typeof url === "string" ? url : undefined), [key, url]);

  useEffect(() => {
    if (title) {
      navigation.setOptions({ title: String(title) });
    }
  }, [navigation, title]);

  if (!resolvedUrl) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingBottom: Platform.OS === "ios" ? 0 : insets.bottom }]}>
      <WebView
        source={{ uri: resolvedUrl }}
        style={styles.flex}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

**Navigation example:** `router.push({ pathname: '/legal-webview', params: { key: 'privacyPolicy', title: 'Privacy' } })`.

---

## Root layout: `app/_layout.tsx`

Add inside your `Stack`:

```tsx
<Stack.Screen name="legal-webview" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
```

Full provider order example (when combined with theme + AdMob skills):

```tsx
<Stack screenOptions={{ headerBackTitle: "Back" }}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="legal-webview" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
</Stack>
```
