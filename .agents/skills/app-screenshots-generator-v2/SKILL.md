---
name: app-screenshots-generator-v2
description: Generates unified bezel-less App Store and Google Play marketing screenshots from real app captures. Fills the prompt template with brand context, headlines, and platform canvas sizes. Use when creating app store screenshots, Play Store screenshots, iPad screenshots, ASO marketing images, or bezel-less floating screenshot assets.
---

# App Screenshots Generator v2

Generate a **unified screenshot set** for iPhone, Android, and iPad. All platforms share the same copy, brand system, and composition — only canvas size changes per export.

## Workflow

1. **Gather inputs** from the user (or infer from the project):
   - App name, product description, core use cases, target audience/region
   - Brand colors, accent colors, light/dark mode feel, personality
   - Claims or affiliations to avoid
   - Number of screenshots and role of each (e.g. hero, feature, social proof)
   - Background style, text alignment, screenshot panel position
   - One real production screenshot per marketing asset

2. **Draft the shared screenshot set** — same headline and subheadline for every platform per screenshot number. Never vary copy between iPhone, Android, or iPad.

3. **Fill the prompt template** below for each asset. Replace every `{{VARIABLE}}`. Only `{{PLATFORM_AND_SIZE}}` changes between platform exports.

4. **Generate each image** with the filled prompt and the user's attached real screenshot. Use status bar normalization only; do not redesign in-app UI.

5. **Verify consistency** across the set: matching headlines, subheadlines, colors, typography, spacing, and visual hierarchy.

## Unified Bezel-less Screenshot Prompt Template

```text
You are creating a SINGLE app store marketing screenshot asset for an app named “{{APP_NAME}}”.

This screenshot belongs to one unified screenshot set that must stay visually consistent across iPhone, Android, and iPad.

CRITICAL CONSISTENCY RULE:
All platforms in this screenshot set must use:
- The exact same number of screenshots.
- The exact same screenshot order.
- The exact same PRIMARY HEADLINE for the matching screenshot number.
- The exact same SUBHEADLINE for the matching screenshot number.
- The exact same brand colors.
- The exact same background style.
- The exact same typography style.
- The exact same spacing logic.
- The exact same visual hierarchy.
- The exact same marketing tone.
- The same overall composition system adapted only to the device canvas size.

Do NOT create different copy for iPhone, Android, or iPad.
Do NOT rewrite, paraphrase, shorten, expand, translate, or improve the headline or subheadline.
Use the supplied headline and subheadline exactly.

INPUT:
I attach one real screenshot from my production build. Treat it as the ONLY source for the app UI.

Preserve the attached screenshot UI exactly:
- Do NOT redesign the app screen.
- Do NOT repaint the app screen.
- Do NOT translate any text.
- Do NOT paraphrase any text.
- Do NOT replace any on-screen text.
- Do NOT invent new UI.
- Preserve fonts, spacing, icons, shadows, cards, colors, layout, tab bars, and all visible UI details inside the screenshot region.

STATUS BAR NORMALIZATION:
The only allowed modification inside the screenshot is system status bar normalization:
- Set visible time to 9:41.
- Show full battery.
- Show full Wi-Fi.
- Show full cellular signal strength.
- Keep indicators appropriate to the platform style if visible.
- Do not modify any other in-app content.

BEZEL-LESS PRESENTATION:
Do NOT place the screenshot inside an iPhone frame, Android frame, Pixel frame, iPad frame, tablet frame, or any physical device mockup.

Instead:
- Present the app screenshot as a clean floating glass panel.
- Use rounded corners only if they match the native screenshot shape.
- No black bezels.
- No metal frame.
- No camera notch.
- No Dynamic Island.
- No punch-hole.
- No tablet border.
- No phone body.
- No hardware buttons.
- No device shadow that suggests a physical phone frame.
- Use only a soft premium drop shadow or subtle glow behind the screenshot panel.
- Keep the screenshot crisp, flat, frontal, and undistorted.
- Maintain correct aspect ratio.
- Do not stretch or warp the screenshot.

BRAND CONTEXT:
- Product: {{APP_PRODUCT_DESCRIPTION}}
- Core use cases: {{APP_CORE_USE_CASES}}
- Target users / region: {{TARGET_AUDIENCE_AND_REGION}}
- Primary brand colors: {{PRIMARY_BRAND_COLORS}}
- Secondary / accent colors: {{ACCENT_COLORS}}
- Light mode feeling: {{LIGHT_MODE_BACKGROUND_FEEL}}
- Dark mode feeling: {{DARK_MODE_BACKGROUND_FEEL}}
- Personality: {{BRAND_PERSONALITY}}
- Important claims to avoid: {{CLAIMS_OR_AFFILIATIONS_TO_AVOID}}

MARKETING CANVAS:
Create a premium full-bleed background around the floating screenshot panel.

Use:
- Same background style across all screenshots.
- Same color palette across all platforms.
- Same headline typography across all platforms.
- Same subtitle typography across all platforms.
- Same text alignment across the screenshot set.
- Same top headline zone.
- Same subtitle zone.
- Same visual rhythm.

Typography:
- Use an SF Pro-like clean grotesk font.
- Headline should be bold, premium, high contrast.
- Subheadline should be smaller, clean, readable.
- Text must be razor sharp.
- Do not use decorative fonts.
- Do not use platform-specific typography differences.

COMPOSITION:
- Keep headline and subheadline in the same relative position across platforms.
- Keep screenshot panel large enough for UI readability.
- Use generous breathing room.
- Avoid busy textures behind text.
- Background may use soft radial brand glow, clean gradient, subtle vignette, or flat brand tint.
- Do not add extra badges, logos, seals, QR codes, people, lifestyle photography, or unrelated graphics.
- Highlight elements are allowed only if explicitly requested and must not cover the app UI.

TEXT CONTENT:
Use exactly the following text.

APP NAME:
{{APP_NAME}}

SCREENSHOT ROLE:
{{SCREENSHOT_ROLE}}

PRIMARY HEADLINE:
{{HEADLINE}}

SUBHEADLINE:
{{SUBHEAD}}

LEGAL FOOTNOTE:
{{LEGAL_FOOTNOTE}}

CANVAS / PLATFORM:
{{PLATFORM_AND_SIZE}}

DEVICE / SCREENSHOT PRESENTATION:
Bezel-less floating screenshot panel.

BACKGROUND STYLE:
{{BACKGROUND_STYLE}}

TEXT ALIGNMENT:
{{TEXT_ALIGNMENT}}

SCREENSHOT PANEL POSITION:
{{SCREENSHOT_PANEL_POSITION}}

CONTENT SAFETY:
- Do not obscure, regenerate, or invent sensitive data.
- If fields are redacted, keep redactions untouched.
- Preserve truthful attached UI over all creative choices.
- Do not imply official affiliation, certification, endorsement, or guaranteed outcomes unless approved wording is explicitly supplied.

NEGATIVE PROMPT:
No phone mockup. No tablet mockup. No iPhone bezel. No Android bezel. No Pixel frame. No iPad frame. No Dynamic Island. No notch. No punch-hole. No hardware buttons. No fake app UI. No rewritten text. No translated UI. No fake endorsements. No badges. No QR codes. No watermark. No competitor logos. No blurry screenshot. No warped screenshot. No stretched screenshot. No inconsistent headline. No inconsistent subtitle. No inconsistent colors. No inconsistent layout.

OUTPUT:
- ONE high-resolution screenshot marketing image.
- Razor-sharp headline and subheadline.
- Crisp floating screenshot panel.
- No physical device frame or bezel.
- Same visual system as the rest of the screenshot set.
```

---

## Use this shared screenshot set structure

Use the **same copy** for all three platforms:

```text
Screenshot 1:
HEADLINE: {{Same headline for iPhone, Android, iPad}}
SUBHEAD: {{Same subheadline for iPhone, Android, iPad}}

Screenshot 2:
HEADLINE: {{Same headline for iPhone, Android, iPad}}
SUBHEAD: {{Same subheadline for iPhone, Android, iPad}}

Screenshot 3:
HEADLINE: {{Same headline for iPhone, Android, iPad}}
SUBHEAD: {{Same subheadline for iPhone, Android, iPad}}
```

For example, do **not** do this:

```text
iPhone: Track Every Trade
Android: Monitor Your Trades
iPad: Your Trading Dashboard
```

Do this instead:

```text
iPhone: Track Every Trade
Android: Track Every Trade
iPad: Track Every Trade
```

---

## Platform size variables

Only change this part per export:

```text
PLATFORM_AND_SIZE:
Apple App Store iPhone 6.7-inch portrait screenshot canvas.

PLATFORM_AND_SIZE:
Google Play Store Android phone portrait screenshot canvas, 9:16.

PLATFORM_AND_SIZE:
Apple App Store iPad screenshot canvas, portrait or landscape as supplied.
```

Everything else should remain identical.

---
