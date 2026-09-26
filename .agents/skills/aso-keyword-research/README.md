# ASO Keyword Research — Cursor Skill

This skill turns an app idea into a cross-platform ASO research and copy package.

It researches:
- Google Search
- Google Play Store
- Apple App Store

It produces:
- app-name recommendations
- Google Play title/name
- Google Play short description
- Google Play long description
- iOS App Store name
- iOS subtitle
- iOS description
- iOS keyword-field candidates where applicable
- keyword clusters and scoring
- competitor analysis
- evidence and confidence
- keywords to avoid

## Files

- `SKILL.md` — main Cursor skill instructions
- `reference.md` — detailed methodology and machine-readable output shape
- `README.md` — installation/use notes

## Example prompt

> Research ASO for this app idea: "An app that lets users scan food labels and identify ingredients they may want to avoid."

Optionally add:
- target country
- audience
- competitors
- positioning
- languages

## Important

The skill intentionally does not invent search volume or rankings. If a quantitative ASO API/provider is available in the environment, its data can be added as another evidence layer and clearly labeled as such.
