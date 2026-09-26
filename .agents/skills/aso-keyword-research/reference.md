# Reference: Cross-Platform ASO Research

## Research principle

Use three evidence layers:

1. Search-demand language:
   - Google autocomplete
   - related searches
   - People Also Ask
   - SERP titles/snippets
   - other observable search signals

2. Store-market language:
   - Google Play results
   - Apple App Store results
   - titles/names
   - subtitles
   - short descriptions
   - descriptions
   - categories
   - repeated feature/outcome language

3. Product relevance:
   - actual app idea
   - audience
   - use cases
   - features
   - differentiators

A phrase should not become a primary recommendation merely because it looks popular. It must fit the product.

## Search matrix

For each app idea, generate queries across:

### Problem
problem + app, problem + tracker, problem + solution

### Solution
solution + app, best solution app, free solution

### Feature
feature + app, feature + iphone, feature + android

### Outcome
desired outcome + app, automate outcome, outcome without common objection

### Audience
audience + solution, audience + app

### Use case
specific use case + app

### Alternatives
competitor alternative, product/category alternative, competitor vs competitor

Adapt the actual queries to the product.

## Evidence hierarchy

Strong:
- direct observation of Google/Play/App Store results
- official platform documentation
- multiple independent competitor listings using the same concept
- multiple Google search signals

Medium:
- one competitor repeatedly using a phrase
- snippets
- community language
- related queries

Weak:
- generic SEO keyword lists
- AI-generated keyword suggestions without validation
- plausible but unobserved phrases
- brand names treated as generic keywords

Never present weak evidence as hard demand data.

## Competitor extraction template

For every important competitor:

```text
App:
Platform:
Developer:
Category:
URL:

Name/title:
Subtitle:
Short description:
Long-description summary:

Primary positioning:
Main use cases:
Key features:
Repeated keyword themes:
Differentiators:
Potential weaknesses:
```

Summarize long descriptions instead of copying them.

## Keyword record

Track:

```text
keyword:
exact_phrases_observed:
intent:
problem_or_solution:
google_evidence:
play_evidence:
app_store_evidence:
competitor_count:
relevance:
competition:
opportunity:
brand_risk:
ambiguity:
recommended_use:
```

## Competition labels

**Low** — few strong direct competitors.

**Medium** — several relevant competitors without obvious domination.

**High** — many strong direct competitors.

**Brand-dominated** — established brands dominate.

**Irrelevant-result dominated** — many results do not match the intended product.

These are qualitative observations, not proprietary difficulty metrics.

## Naming rubric

Evaluate:

- memorability
- pronunciation
- spelling
- distinctiveness
- category clarity
- keyword relevance
- brand potential
- international usability
- trademark/brand risk
- availability concerns

Never claim legal trademark availability.

## Platform separation

### Google Play
Research:
- app name/title
- short description
- full description
- category
- developer/brand
- search-result presentation

Verify current Google Play Console guidance for limits and indexing behavior.

### Apple App Store
Research:
- app name
- subtitle
- promotional text where relevant
- description
- keyword field where applicable
- category

Verify current Apple documentation for:
- character limits
- indexed fields
- keyword-field syntax
- localization
- prohibited metadata practices

Never rely on stale ASO blog posts when official documentation is available.

## Localization

For each requested locale:

1. Search native-language queries.
2. Inspect local store results.
3. Extract native competitor language.
4. Re-score opportunities.
5. Generate localized metadata.

Do not merely translate English keywords.

## Confidence labels

Use:

- High — several independent observations support it.
- Medium — meaningful but limited evidence.
- Low — plausible but insufficiently validated.

Example:

```text
Primary theme: receipt scanner
Confidence: High
Reason: Appears in Google search language and repeatedly across relevant Play/App Store competitors.
```

## Never do

- invent search volume
- invent keyword difficulty
- invent rankings
- claim #1 without evidence
- claim conversion performance without evidence
- copy competitor descriptions wholesale
- recommend misleading popular terms
- treat competitor brands as generic terms
- equate Google SEO with Play ASO
- equate Play rules with Apple rules
- state outdated limits as current without verification
- hide uncertainty

## Optional machine-readable output

When the user is building an ASO pipeline, also produce:

```json
{
  "app_idea": "",
  "market": "",
  "assumptions": [],
  "primary_keywords": [],
  "secondary_keywords": [],
  "long_tail_keywords": [],
  "excluded_keywords": [],
  "competitors": [],
  "google_play": {
    "name": "",
    "short_description": "",
    "long_description": ""
  },
  "app_store": {
    "name": "",
    "subtitle": "",
    "description": "",
    "keyword_candidates": []
  },
  "confidence": {
    "naming": "",
    "keywords": "",
    "copy": ""
  },
  "sources": []
}
```

Human-readable research remains the primary output.
