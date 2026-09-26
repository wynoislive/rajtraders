# Expo Preview Ad Timing — Reference

One hook for all ad UI delay patterns. Copy these files into every Expo utility app.

---

## 1. File layout

```
your-expo-app/
├── hooks/
│   └── use-ad-ui-delay.ts          ← only hook file
├── constants/
│   └── posthog-feature-flags.ts    ← PREVIEW_AD_TIMING + RESULTS_AD_TIMING bundles
├── components/
│   └── ad-gate-loading-overlay.tsx ← preview overlay only (optional)
├── app/
│   ├── *-preview.tsx               ← mode: preview-overlay
│   └── *-results.tsx               ← mode: results-min-total
└── components/native-ad.tsx          ← do not modify for delay feature
```

---

## 2. Flag bundles (`constants/posthog-feature-flags.ts`)

```typescript
export const PREVIEW_AD_TIMING_FLAG = "preview-ad-timing";
export const PREVIEW_AD_TIMING_DEFAULTS = { adWaitMs: 3_000, displayMs: 5_000 } as const;
export const PREVIEW_AD_TIMING_BOUNDS = {
  adWaitMs: { min: 0, max: 10_000 },
  displayMs: { min: 0, max: 15_000 },
} as const;
export const PREVIEW_AD_TIMING = {
  flag: PREVIEW_AD_TIMING_FLAG,
  defaults: PREVIEW_AD_TIMING_DEFAULTS,
  bounds: PREVIEW_AD_TIMING_BOUNDS,
} as const;

export const RESULTS_AD_TIMING_FLAG = "results-ad-timing";
export const RESULTS_AD_TIMING_DEFAULTS = { adWaitMs: 3_000, displayMs: 10_000 } as const;
export const RESULTS_AD_TIMING_BOUNDS = {
  adWaitMs: { min: 0, max: 10_000 },
  displayMs: { min: 0, max: 30_000 },
} as const;
export const RESULTS_AD_TIMING = {
  flag: RESULTS_AD_TIMING_FLAG,
  defaults: RESULTS_AD_TIMING_DEFAULTS,
  bounds: RESULTS_AD_TIMING_BOUNDS,
} as const;
```

### PostHog payloads

| Flag | Payload example |
|------|-----------------|
| `preview-ad-timing` | `{ "adWaitMs": 3000, "displayMs": 5000 }` |
| `results-ad-timing` | `{ "adWaitMs": 3000, "displayMs": 10000 }` |

---

## 3. `hooks/use-ad-ui-delay.ts`

Copy from wapda-bill-check project — single file containing:

- PostHog timing via `useFeatureFlagWithPayload`
- `mode: "preview-overlay"` → `adPhase` state machine, returns `phaseComplete`
- `mode: "results-min-total"` → min-total reveal timer, calls `onReveal`

### Hardcoded swap (no PostHog)

Replace only `useAdUiDelayValues`:

```typescript
function useAdUiDelayValues(_timing: AdUiDelayTimingConfig) {
  return { ready: true, adWaitMs: 3_000, displayMs: 10_000 };
}
```

### API

```typescript
export type AdPhase = "waiting" | "displaying" | "done";

export function useAdUiDelay(options: UseAdUiDelayOptions): {
  ready: boolean;
  adWaitMs: number;
  displayMs: number;
  adPhase: AdPhase;
  phaseComplete: boolean;
};
```

**Preview options:** `mode`, `timing`, `enabled`, `resetKey`, `adsReady`, `hasAd`, `adFailed`

**Results options:** `mode`, `timing`, `enabled`, `fetchStartedAt`, `hasAd`, `adFailed`, `adLoading`, `onReveal`

---

## 4. Preview screen (`mode: "preview-overlay"`)

```typescript
import { PREVIEW_AD_TIMING } from "@/constants/posthog-feature-flags";
import { useAdUiDelay } from "@/hooks/use-ad-ui-delay";

const { adWaitMs, displayMs, adPhase, phaseComplete } = useAdUiDelay({
  mode: "preview-overlay",
  timing: PREVIEW_AD_TIMING,
  enabled: Platform.OS !== "web" && displayHtml != null,
  resetKey: displayHtml,
  adsReady,
  hasAd: nativeAd != null,
  adFailed: adsReady && !adLoading && !nativeAd,
});

const previewReady = webViewReady && (phaseComplete || Platform.OS === "web");
```

- Hide WebView until `previewReady`
- Overlay shows ad + optional progress bar using `adPhase`, `adWaitMs`, `displayMs`
- Preview ad slot: `{ maxRetries: 0 }` recommended

---

## 5. Results screen (`mode: "results-min-total"`)

```typescript
import { RESULTS_AD_TIMING } from "@/constants/posthog-feature-flags";
import { useAdUiDelay } from "@/hooks/use-ad-ui-delay";

const fetchStartedAtRef = useRef<number | null>(null);
const [awaitingReveal, setAwaitingReveal] = useState(false);

async function onSearch() {
  fetchStartedAtRef.current = Date.now();
  setAwaitingReveal(false);
  setLoading(true);
  setResult(null);
  try {
    const data = await fetchData();
    setResult(data);
    setAwaitingReveal(true); // keep loading=true
  } catch {
    setLoading(false); // immediate error
  }
}

useAdUiDelay({
  mode: "results-min-total",
  timing: RESULTS_AD_TIMING,
  enabled: awaitingReveal && loading && result != null && Platform.OS !== "web",
  fetchStartedAt: fetchStartedAtRef.current,
  hasAd: nativeAd != null,
  adFailed: adsReady && !adLoading && !nativeAd,
  adLoading,
  onReveal: () => { setLoading(false); setAwaitingReveal(false); },
});

// Show result cards only when !loading; ad stays in normal slot during gate
```

### Results timing rules

| Fetch time | Ad | Total wait |
|------------|-----|------------|
| 1s | loaded | ~10s (displayMs total) |
| 17s | loaded | ~17s (immediate on arrival) |
| 1s | failed | ~1s (immediate) |

---

## 6. wapda-bill-check mapping

| Screen | Mode | Flag bundle |
|--------|------|-------------|
| `app/bill-html-preview.tsx` | `preview-overlay` | `PREVIEW_AD_TIMING` |
| `app/(tabs)/check-bill.tsx` | `results-min-total` | `RESULTS_AD_TIMING` |

---

## 7. Checklist for new project

```
- [ ] Copy hooks/use-ad-ui-delay.ts
- [ ] Add PREVIEW_AD_TIMING + RESULTS_AD_TIMING to posthog-feature-flags.ts
- [ ] Create PostHog flags with payloads
- [ ] Wire preview screen with mode preview-overlay
- [ ] Wire results screen with mode results-min-total
- [ ] Do not modify native-ad loading/retry logic
```
