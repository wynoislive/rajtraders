# Reference: ThemeProvider (cross-project)

Use this document as the **source of truth** when porting theme wiring to another Expo app. Replace placeholders (`YOUR_*`, `CHANGE_ME_*`) with project-specific values. **Path alias** `@/*` → repo root must match `tsconfig.json`.

**Single theme module:** All color (and shared `Layout` / `Fonts`) tokens live in **`constants/theme.ts`** only. Do **not** add `palette.ts`, `design-tokens.ts`, or other parallel files. For component-level color resolution with optional light/dark overrides, use **`hooks/use-theme-color.ts`** (`useThemeColor`) — do not invent app-specific “palette picker” hooks.

---

## Table of contents

- [Theme: `providers/app-theme-provider.tsx`](#theme-providersapp-theme-providertsx)
- [Hooks: color scheme + theme color](#hooks-color-scheme--theme-color)
  - [`hooks/use-color-scheme.ts`](#hooksuse-color-schemets)
  - [`hooks/use-color-scheme.web.ts`](#hooksuse-color-schemewebts)
  - [`hooks/use-theme-color.ts`](#hooksuse-theme-colorts)
- [Theme tokens (example): `constants/theme.ts`](#theme-tokens-example-constantsthemets)

---

## Theme: `providers/app-theme-provider.tsx`

Persisted preference (`system` | `light` | `dark`) drives `resolvedColorScheme` used by navigation theme, `StatusBar`, and hooks.

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform, useColorScheme as useRNColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

type AppThemeContextValue = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  resolvedColorScheme: "light" | "dark";
};

const THEME_STORAGE_KEY = "@YOUR_APP_SLUG/theme-preference";

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function parsePreference(raw: string | null): ThemePreference | null {
  if (raw === "system" || raw === "light" || raw === "dark") {
    return raw;
  }
  return null;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = (useRNColorScheme() ?? "light") as "light" | "dark";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (cancelled) {
          return;
        }
        const parsed = parsePreference(raw);
        if (parsed) {
          setPreferenceState(parsed);
        }
      } catch {
        // keep default
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, value);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    if (preference === "system") {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(preference);
    }
  }, [preference]);

  const resolvedColorScheme = preference === "system" ? systemScheme : preference;

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolvedColorScheme,
    }),
    [preference, setPreference, resolvedColorScheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppThemeContext(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppThemeContext must be used within AppThemeProvider");
  }
  return ctx;
}
```

**`THEME_STORAGE_KEY`:** Keep this string only in `app-theme-provider.tsx` (do not import AdMob or other native SDK modules from a shared constants barrel).

---

## Hooks: color scheme + theme color

### `hooks/use-color-scheme.ts`

```tsx
import { useAppThemeContext } from "@/providers/app-theme-provider";

export function useColorScheme(): "light" | "dark" {
  return useAppThemeContext().resolvedColorScheme;
}
```

### `hooks/use-color-scheme.web.ts`

```tsx
import { useAppThemeContext } from "@/providers/app-theme-provider";

export function useColorScheme(): "light" | "dark" {
  return useAppThemeContext().resolvedColorScheme;
}
```

### `hooks/use-theme-color.ts`

Resolves a named token from `Colors` for the current scheme, with optional per-mode overrides via `props` (Expo [color schemes](https://docs.expo.dev/guides/color-schemes/) pattern). Use this instead of new hooks that only wrap a separate palette file.

```tsx
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useThemeColor(props: { light?: string; dark?: string }, colorName: keyof typeof Colors.light & keyof typeof Colors.dark) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
```

---

## Theme tokens (example): `constants/theme.ts`

**Do not split** colors into another file. Extend **`Colors`**, **`Layout`**, and **`Fonts`** here as the app grows.

Minimal shape required by snippets above; swap hex values and fonts for your product.

```tsx
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#000000",
    background: "#fafafa",
    surface: "#ffffff",
    tint: "#000000",
    icon: "#525252",
    tabIconDefault: "#737373",
    tabIconSelected: "#000000",
    border: "#e5e5e5",
    muted: "#737373",
    inputBackground: "#ffffff",
    onPrimary: "#ffffff",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    surface: "#0a0a0a",
    tint: "#ffffff",
    icon: "#a3a3a3",
    tabIconDefault: "#a3a3a3",
    tabIconSelected: "#ffffff",
    border: "#404040",
    muted: "#a3a3a3",
    inputBackground: "#171717",
    onPrimary: "#000000",
  },
};

export const Layout = {
  borderRadius: 0 as const,
  tabBarHeight: 56,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
```
