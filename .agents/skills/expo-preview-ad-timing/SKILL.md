---
name: expo-preview-ad-timing
description: Single hook use-ad-ui-delay for PostHog ad UI delays on preview overlay and results search screens. Modes preview-overlay and results-min-total. Skips delay on fetch error or ad failure. Use for ad revenue, preview-ad-timing, results-ad-timing flags in Expo utility apps.
---

# Expo Preview Ad Timing

One hook: **`hooks/use-ad-ui-delay.ts`** — PostHog timing + delay logic for both screen types.

Full templates: [reference.md](reference.md)

## File manifest

| File | Role |
|------|------|
| `hooks/use-ad-ui-delay.ts` | **Only file to copy / hardcode** |
| `constants/posthog-feature-flags.ts` | `PREVIEW_AD_TIMING` + `RESULTS_AD_TIMING` bundles |
| `components/ad-gate-loading-overlay.tsx` | Preview overlay progress bar (optional rename) |
| Preview / results screens | Pass `mode` + ad state — **never touch native-ad.tsx** |

---

## Two modes

### `preview-overlay` — WebView / overlay screens

PostHog flag: `preview-ad-timing`. Runs `adWaitMs` + `displayMs` after screen opens.

```typescript
const { adWaitMs, displayMs, adPhase, phaseComplete } = useAdUiDelay({
  mode: "preview-overlay",
  timing: PREVIEW_AD_TIMING,
  enabled: Platform.OS !== "web" && contentKey != null,
  resetKey: contentKey,
  adsReady,
  hasAd: nativeAd != null,
  adFailed: adsReady && !adLoading && !nativeAd,
});
const contentVisible = contentReady && (phaseComplete || Platform.OS === "web");
```

### `results-min-total` — search → results screens

PostHog flag: `results-ad-timing`. `displayMs` = **min total** ms from search tap (not added after slow fetch).

| Case | Behavior |
|------|----------|
| Fetch fails | Error immediately |
| Ad failed | Reveal immediately |
| Fetch ≥ displayMs | Reveal immediately on success |
| Fetch < displayMs, ad OK | Wait remaining time, spinner stays |

```typescript
const fetchStartedAtRef = useRef<number | null>(null);

useAdUiDelay({
  mode: "results-min-total",
  timing: RESULTS_AD_TIMING,
  enabled: awaitingReveal && loading && hasResult && Platform.OS !== "web",
  fetchStartedAt: fetchStartedAtRef.current,
  hasAd: nativeAd != null,
  adFailed: adsReady && !adLoading && !nativeAd,
  adLoading,
  onReveal: () => { setLoading(false); setAwaitingReveal(false); },
});
```

---

## PostHog vs hardcoded

Replace `useAdUiDelayValues` in the hook file:

```typescript
function useAdUiDelayValues(_timing: AdUiDelayTimingConfig) {
  return { ready: true, adWaitMs: 3_000, displayMs: 10_000 };
}
```

Screens unchanged.

---

## When fixing bugs

| Symptom | Check |
|---------|-------|
| Results instant | `fetchStartedAtRef` set at search start? `awaitingReveal` on success? |
| Extra delay after slow fetch | Must use `results-min-total`, not additive overlay timing |
| Delay on error | Error path must not set `awaitingReveal` |
| Delay without ad | `adFailed` — reveal runs immediately |
| Preview stuck | `phaseComplete` + `contentReady` both required |
