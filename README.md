# How Delusional Is This Job Offer?

A satirical-but-statistically-honest single-page web app. Paste the requirements of a real job posting (education, years of experience, tech stack, languages, certifications, age, location, extras). The app estimates what fraction of the working-age population actually satisfies ALL of them, and reports it as a **Delusion Score**.

> **Punches up, not down.** The satire targets unrealistic job postings. It never punches at job seekers. If a person doesn't exist who satisfies your posting, that's a *you* problem.

---

## Stack

- **Vite + TypeScript + Preact** (via `@preact/preset-vite`)
- Single hand-written `src/styles.css` using CSS custom properties
- Hand-drawn inline SVG for the gauge and waterfall chart (no chart library)
- Static-only — no backend, no database, no auth, no analytics, no cookie banner
- All state in Preact hooks (`useState`/`useMemo`); no global state library
- Share-by-URL (criteria serialized as base64 JSON in the URL hash)

Production JS bundle is small (well under 60 KB gzipped).

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # run vitest unit tests
npm run build    # type-check + bundle into ./dist
npm run preview  # serve the built bundle locally
```

Node 18+ recommended.

---

## How the math works

The engine lives in [`src/lib/engine.ts`](src/lib/engine.ts) and is a pure function with zero DOM/Preact imports — fully unit-testable.

### Step 1 — Naive independence

Each criterion has a base `probability` (its share of the working-age population, stored in `src/data/population.ts`). We start by multiplying them:

```
P(All) = ∏ P(criterion_i)
```

This is the **upper bound**. Real life is rarely this bad — but it's the right starting point.

### Step 2 — Correlation lifts

Many requirements are not independent. Knowing someone has a CS degree massively raises the chance they know Python. Knowing someone speaks English C1 raises the chance they have a Bachelor's.

We model each known dependency as a conditional **lift**:

```
P(A | B) = min(1, P(A) * lift)
```

Lifts are stored as a sparse, commented table in [`src/data/correlations.ts`](src/data/correlations.ts). Multiple lifts on the same target multiply. The engine applies all matching lifts as a post-pass after the naive multiply.

Examples:
- `field_cs → skill_python`: lift 15× (CS grads are far more likely to know Python than the general population)
- `edu_bachelor → lang_en_b2`: lift 3× (university grads skew B2+ English)
- `misc_married_ok → misc_no_kids`: lift 0.4× (negative correlation — married people are more likely to have kids)

### Step 3 — Age–experience feasibility gate

If the posting demands **N** years of experience but caps age at **M**, and `M - N < 22` (i.e., the candidate would have had to start this career before finishing a bachelor's at 22), the result collapses toward zero and the UI flags it as a logical impossibility with a dedicated message.

A softer version also fires: if `M - N` is implausibly small (say, the candidate would have had to start at age 18–19), a warning is added to `contradictions` even though the math doesn't fully collapse.

### Step 4 — Experience distribution

We don't store experience as a flat lookup. `experienceProbability(years, age)` returns the cumulative probability of having at least `years` years of experience given a candidate's age, using a hand-tuned exponential decay with a half-life of ~6 years of experience, slightly bent by a tension factor that tails off the high end.

### Step 5 — Delusion Score

Log-scaled so the extremes read well:

```
delusionScore = clamp(0, 100, (-log10(fraction) / 7) * 100)
```

- `fraction = 1.0` → score 0 (entire workforce qualifies)
- `fraction = 0.001` → score ≈ 43 (1 in 1,000)
- `fraction = 1e-7` → score 100 (1 in 10 million — doesn't exist in TR)

### Step 6 — Breakdown waterfall

Each requirement contributes a row showing the pool size before and after that requirement was applied. Rows are sorted by descending damage. The most damaging requirement is highlighted and named ("The thing that killed your candidate pool: 8 years of Rust experience").

---

## Where the math is deliberately approximate

- **Independence assumption (post-lift):** After applying correlations, we still assume criteria are independent. They aren't. This is a known limitation.
- **Single lift per pair:** Real joint distributions are not captured by a single lift factor. We're approximating.
- **No age–skill interactions:** Knowing someone is 25 doesn't auto-lower their probability of knowing legacy enterprise tech — even though it should.
- **No "easy to learn" modeling:** A posting asking for both Python and Rust gets the same multiplicative penalty as Python and forklift-license, even though Python + Rust often co-occur in the same person.
- **Population denominators are TR-focused:** See `WORKING_AGE_POPULATION` in `population.ts`. Switch to `WORKING_AGE_POPULATION_GLOBAL` if you're hiring globally.

---

## How to edit the population data

Every number lives in [`src/data/population.ts`](src/data/population.ts) in a single typed array per criterion family. Each entry has:

```ts
{
  id: string,                    // stable id used in URLs and correlations
  label: { en: string, tr: string },
  probability: number,           // 0..1 share of working-age pop
  source: string,                // citation or note
  confidence: 'measured' | 'estimated',
}
```

To correct a number, edit it in place. To add a new criterion, add an entry and (optionally) a correlation lift in [`src/data/correlations.ts`](src/data/correlations.ts).

**Header comment in `population.ts` states clearly that the numbers are rough public-statistics estimates, not authoritative data.** Read it before quoting any of them.

---

## Bilingual UI

All UI strings live in `src/i18n/en.ts` and `src/i18n/tr.ts`. The default language is detected from `navigator.language`. A header toggle switches languages instantly. The criterion labels themselves are also bilingual (see `label: { en, tr }` on every criterion).

---

## Share-by-URL

The "Copy share link" button serializes the current criteria into a compact base64 JSON in the URL hash:

```
https://<user>.github.io/<repo>/#W1siZWR1X2JhY2hlbG9yIl0sNSwwLDBd
```

On page load, the hash is decoded and the form is restored. Malformed hashes silently fall back to empty state.

---

## Project structure

```
.
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .github/workflows/deploy.yml
├── README.md
└── src/
    ├── main.tsx                     # entry point
    ├── App.tsx                      # top-level component, wires everything
    ├── styles.css                   # single hand-written stylesheet
    ├── data/
    │   ├── population.ts            # ALL numbers live here
    │   └── correlations.ts          # sparse lift table
    ├── lib/
    │   ├── engine.ts                # pure calculation core
    │   └── share.ts                 # URL hash codec
    ├── i18n/
    │   ├── index.ts                 # lang detection
    │   ├── en.ts
    │   └── tr.ts
    ├── components/
    │   ├── InputPanel.tsx
    │   ├── ResultPanel.tsx
    │   ├── Gauge.tsx                # hand-drawn SVG arc gauge
    │   └── BreakdownChart.tsx       # hand-drawn SVG waterfall
    └── engine.test.ts               # vitest unit tests
```

---

## Deployment to GitHub Pages

The included `.github/workflows/deploy.yml` builds the site on every push to `main` and publishes `./dist` to GitHub Pages. In your repo settings, enable Pages with the **GitHub Actions** source (Settings → Pages → Source: GitHub Actions).

The build uses `base: './'` in `vite.config.ts` so it works on both root domains and project subpaths (`/<repo>/`).

---

## License

MIT. Use it, fork it, fix the numbers when they're wrong.

The numbers in `population.ts` are the most likely thing to be wrong. The math is honest about its own approximation — see the "Where the math is deliberately approximate" section above.
