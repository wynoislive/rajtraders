---
name: expo-theme-provider
description: Wires Expo AppThemeProvider with persisted system/light/dark preference, useColorScheme hooks, and useThemeColor token resolution from constants/theme.ts only. Use when bootstrapping Expo app theming, adding AppThemeProvider, or setting up a single theme.ts color source without separate palette files.
---

# Expo: ThemeProvider

Functional wiring only. Theme colors stay in **`constants/theme.ts`** only with **`hooks/use-theme-color.ts`** for resolution — no separate palette files.

### Theme and colors

- **One file:** Put all color (and shared layout/font) tokens in **`constants/theme.ts`** only. Do **not** create extra files such as `constants/palette.ts`, `design-tokens.ts`, or app-specific color maps.
- **Resolving colors in components:** Use **`hooks/use-theme-color.ts`** (`useThemeColor`) with `Colors` from `@/constants/theme` and `useColorScheme` — see [reference.md](reference.md). Do **not** add hooks whose only job is wrapping a separate palette file.
- Match the target product’s look by editing **`constants/theme.ts`** in place, not by introducing parallel token sources.

## Stack assumptions

- Expo SDK 54+, **New Architecture** enabled, **expo-router** file-based routes.
- Path alias `@/*` → project root (see `tsconfig.json`).

---

## Agent checklist

**Theme**

- [ ] Keep tokens in **`constants/theme.ts`** only; add **`hooks/use-theme-color.ts`** as in reference. No standalone palette/token files.
- [ ] Add **`providers/app-theme-provider.tsx`** with persisted `system` | `light` | `dark` preference.
- [ ] Add **`hooks/use-color-scheme.ts`** + **`.web.tsx`** shim reading from `AppThemeProvider`.
- [ ] Wrap root layout outermost with **`AppThemeProvider`** (see AdMob skill for full provider order when combined).

---

## References

- **Full copy-paste snippets** (provider, hooks, theme tokens): [reference.md](reference.md)

---