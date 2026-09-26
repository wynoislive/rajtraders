---
name: aso-keyword-research
description: Researches an app idea across Google Search, Google Play Store, and Apple App Store, analyzes competitor titles and descriptions, discovers keyword opportunities, and produces evidence-backed ASO recommendations for app name/title, subtitle, short description, long description, keyword themes, and localization. Use when planning or optimizing an Android/iOS app listing from an app idea, feature set, or product concept.
---

# ASO Keyword Research

Turn an app idea into an evidence-backed, cross-platform App Store Optimization (ASO) package.

## Objective

Given an app idea, determine:

- What users search for on Google.
- What relevant search terms surface on Google Play.
- Which competing apps appear for those terms.
- Which competitor titles, subtitles, short descriptions, and descriptions repeatedly use relevant concepts.
- What appears relevant on Apple App Store.
- Which keyword clusters have strong intent and product relevance.
- What to use for:
  - Android app name/title
  - Google Play short description
  - Google Play long description
  - iOS App Store app name
  - iOS subtitle
  - iOS description
  - iOS keyword-field candidates where applicable
  - future keyword/content opportunities

Do not invent search volume, ranking, difficulty, conversion rates, or popularity metrics.

## Inputs

Accept:

- App idea
- Feature list
- Target audience
- Country/market
- Language/locales
- Competitor names
- Existing app/store URLs
- Existing listing copy

If details are missing, make reasonable assumptions and state them. Do not block the research.

Default assumptions:

- Market: global English
- Platforms: Google Play + Apple App Store
- Sources: Google Search + Google Play + Apple App Store
- Competitors: direct + adjacent alternatives

## Phase 1 — Understand the product

Extract:

1. Core problem.
2. Primary user.
3. Job-to-be-done.
4. Main features.
5. Synonyms.
6. User language.
7. Likely category.
8. Use cases.
9. Differentiators.
10. Terms that should be avoided.

Create seed groups:

- Problem
- Solution
- Feature
- Outcome
- Audience
- Use case
- Product/category
- Long-tail
- Alternative
- Competitor/brand

Seeds are hypotheses until validated.

## Phase 2 — Google Search

Search multiple intent patterns:

- `[problem] app`
- `[solution] app`
- `best [category] app`
- `[feature] app`
- `[problem] on iphone`
- `[problem] on android`
- `how to [job]`
- `[job] app`
- `free [solution]`
- `[audience] [solution]`
- `[competitor] alternative`
- `[competitor] vs [competitor]`

Inspect available:

- autocomplete
- related searches
- People Also Ask
- result titles
- snippets
- relevant landing pages
- community language

Capture exact phrases only when observed.

Label evidence as:

- autocomplete
- related_search
- PAA
- SERP_title
- SERP_snippet
- landing_page
- community_language

Do not infer exact volume from appearance.

## Phase 3 — Google Play

For promising keywords:

1. Search Google Play.
2. Record visible relevant apps.
3. Inspect leading competitors.
4. Capture available:
   - name/title
   - short description
   - full description
   - category
   - developer
   - ratings/reviews
5. Identify repeated keyword themes.
6. Distinguish exact matches from semantic variants.

Assess each keyword:

- relevance
- user intent
- qualitative competition
- direct competitor density
- brand dominance
- unrelated-result risk

Do not fabricate universal rankings. Store results can be dynamic or personalized.

## Phase 4 — Apple App Store

Repeat the process on Apple App Store.

Capture available:

- app name
- subtitle
- promotional text
- description
- category
- developer
- ratings/reviews

Separate iOS recommendations from Android recommendations.

Do not assume platform indexing rules are identical. Verify current Apple documentation before asserting metadata rules or limits.

## Phase 5 — Competitor analysis

Cluster competitors as:

### Direct
Same core problem and audience.

### Adjacent
Similar problem or nearby use case.

### Alternative
Different product/category solving the same job.

### Branded leaders
Strong brands dominating relevant searches.

For each cluster identify:

- shared terminology
- feature language
- outcomes
- differentiators
- gaps
- overused generic terms
- high-signal repeated concepts

Repeated competitor language is evidence of market language, not proof of search volume.

## Keyword scoring

Score each keyword 0–5:

- relevance
- intent
- market_evidence
- competitive_opportunity
- specificity
- brand_risk
- ambiguity

Use:

`opportunity = relevance + intent + market_evidence + competitive_opportunity + specificity - brand_risk - ambiguity`

This is an internal prioritization score, NOT search volume.

Classify every recommendation:

- Primary
- Secondary
- Long-tail
- Feature
- Problem
- Outcome
- Audience
- Use-case
- Alternative
- Brand/Competitor
- Exclude

Competitor brands should normally be excluded from listing copy unless a compliant strategy explicitly calls for them.

## Listing generation

Only generate final copy after research.

### Google Play

Produce:

**App name/title**
- Brandable
- Clear
- Relevant descriptive wording where appropriate

**Short description**
- Lead with benefit
- Natural keyword usage
- No keyword stuffing

**Long description**
1. Value proposition
2. Core benefit
3. Use cases
4. Features
5. Differentiators
6. Validated terminology naturally incorporated
7. CTA

### Apple App Store

Produce:

**App name**
- Brand + concise category/value proposition where appropriate

**Subtitle**
- Strong benefit/category language

**Description**
- Conversion-oriented natural copy

**Keyword field**
- Candidates where applicable, separated from visible copy

Verify current platform character limits and metadata rules using official documentation before finalizing.

## Avoid keyword stuffing

Prioritize:

- semantic coverage
- natural language
- related concepts
- user benefits
- readability
- platform-specific behavior

Do not turn descriptions into keyword lists.

## Evidence table

Return:

| Keyword | Google evidence | Play evidence | App Store evidence | Competitor evidence | Relevance | Opportunity | Notes |
|---|---|---|---|---|---:|---:|---|

Use source links when available.

Do not reproduce long competitor descriptions. Summarize them and use short quotes only when necessary.

## Final report

Return:

### 1. Executive recommendation
- recommended naming direction
- top keyword themes
- positioning
- biggest opportunity
- biggest risk

### 2. Market language
Strong observed phrases grouped by intent.

### 3. Keyword opportunity table
Top 20–50 keywords/themes with:
- rank
- keyword
- intent
- platform evidence
- relevance
- competition
- opportunity score
- recommended use
- notes

### 4. Competitor analysis
For 5–15 important competitors:
- app
- platform
- positioning
- relevant metadata language
- keyword themes
- strengths
- weaknesses/opportunities

### 5. Google Play listing
- app name/title
- short description
- long description
- keyword coverage
- character counts

### 6. Apple App Store listing
- app name
- subtitle
- description
- keyword candidates
- keyword coverage
- character counts

### 7. Alternative names
Provide 3–5 options:
- name
- positioning
- why it works
- main keyword/theme
- downside

### 8. Keywords to avoid
Include:
- irrelevant terms
- ambiguous terms
- competitor brands
- trademark-sensitive terms
- misleading claims
- overly broad low-intent terms

### 9. Research log
List:
- searches performed
- platforms checked
- competitors inspected
- important sources
- assumptions
- missing data

## Quality gates

Before finalizing:

- [ ] Google Search researched
- [ ] Google Play researched
- [ ] Apple App Store researched
- [ ] Several direct competitors inspected
- [ ] No invented volume/rankings
- [ ] Google and Apple recommendations separated
- [ ] Copy is natural
- [ ] Competitor trademarks treated carefully
- [ ] Character counts checked
- [ ] Current platform limits verified where possible
- [ ] Claims qualified when evidence is weak
- [ ] Sources included
- [ ] Final recommendation is actionable

## Failure handling

If a source is blocked, inaccessible, personalized, or incomplete:

- never fabricate missing data
- mark it unavailable
- use alternative observable evidence
- reduce confidence

If a keyword behaves differently across Google, Play, and App Store, preserve the distinction.

If a keyword produces irrelevant store results, downgrade it.

If a competitor has a strong title but poor product relevance, do not copy it blindly.

The final answer must clearly answer:

> Given this app idea and the evidence found, what should I call the app, what should I write in each store's metadata, and which keyword themes should I target?
