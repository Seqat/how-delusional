/**
 * engine.ts — pure calculation core.
 *
 * No DOM, no Preact, no global state. Just functions you can unit test.
 *
 * Pipeline:
 *   1. Collect active criteria (selected ids + synthetic experience id).
 *   2. Naive multiply of independent probabilities.
 *   3. Apply correlation lifts as a post-pass.
 *   4. Apply the age–experience feasibility gate (collapses to ~0 if
 *      M < N + 22).
 *   5. Convert to a log-scaled Delusion Score 0..100.
 *   6. Build the breakdown waterfall, sorted by damage.
 */

import {
  CRITERIA_BY_ID,
  Criterion,
  EXPERIENCE_REFERENCE,
  WORKING_AGE_POPULATION,
  DEFAULT_AGE,
} from '../data/population';
import { CORRELATIONS } from '../data/correlations';
import { DISJUNCTIVE_CATEGORIES, IMPLICATIONS } from '../data/implications';

export interface EngineInput {
  /** IDs of selected criteria from population.ts (education, skills, etc.). */
  selectedIds: string[];
  /** Years of experience required (0 = "not specified"). */
  experienceYears: number;
  /** Required minimum age (0 = not specified). */
  ageMin: number;
  /** Required maximum age (0 = not specified, Infinity treated as no cap). */
  ageMax: number;
  /** Language used for the human-readable breakdown labels. Defaults to 'en'. */
  lang?: 'en' | 'tr';
}

export interface BreakdownEntry {
  id: string;
  label: string;
  before: number;
  after: number;
  lostPercent: number;
}

export interface EngineResult {
  /** Share of the working-age population that satisfies ALL criteria, 0..1. */
  fraction: number;
  /** fraction × WORKING_AGE_POPULATION. */
  absolutePeople: number;
  /** Log-scaled 0..100. */
  delusionScore: number;
  /** True if the age–experience gate fired. */
  impossible: boolean;
  /** Human-readable logical conflicts found. */
  contradictions: string[];
  /** Waterfall entries ordered by descending damage. */
  breakdown: BreakdownEntry[];
  /**
   * Criteria dropped from the pool because another selection already implies
   * them (Java when Spring Boot is selected). Surfaced so the UI can explain
   * why adding them changed nothing.
   */
  subsumed: SubsumedEntry[];
}

export interface SubsumedEntry {
  /** The criterion that was folded away. */
  id: string;
  label: string;
  /** The selected criterion that implies it. */
  byId: string;
  byLabel: string;
}

const EXPERIENCE_SYNTHETIC_ID = 'experience_years';

/** i18n for the few strings the engine itself has to synthesise. */
const ENGINE_STRINGS = {
  en: {
    prefixes: {
      location: 'Location',
      field: 'Field',
      age: 'Age',
      education: 'Education',
    },
    or: ' OR ',
    experience: (y: number) => `${y} years of experience`,
  },
  tr: {
    prefixes: {
      location: 'Konum',
      field: 'Bölüm',
      age: 'Yaş',
      education: 'Eğitim',
    },
    or: ' VEYA ',
    experience: (y: number) => `${y} yıl deneyim`,
  },
} as const;

/**
 * Everything `id` transitively implies. The table is expected to be written
 * "flat", but we still walk it so a future half-specified entry (A → B where
 * B → C, without C listed under A) cannot silently leave C double-counted.
 */
export function impliedClosure(id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...(IMPLICATIONS[id] ?? [])];
  while (stack.length > 0) {
    const next = stack.pop() as string;
    if (next === id || out.has(next)) continue;
    out.add(next);
    for (const child of IMPLICATIONS[next] ?? []) stack.push(child);
  }
  return out;
}

/**
 * Split a selection into the criteria that actually constrain the pool and the
 * ones another selection already implies.
 *
 * e.g. edu_master implies edu_bachelor; skill_spring implies skill_java. The
 * implied ones are not requirements on top of their implier — counting them
 * separately multiplies the same constraint twice (Spring Boot + Java reads as
 * 1-in-111,000 instead of 1-in-667).
 *
 * `subsumedBy` records which selection did the implying, so the UI can say so
 * rather than silently ignoring a lit-up chip.
 */
export function resolveSubsumption(selectedIds: string[]): {
  kept: string[];
  subsumedBy: Map<string, string>;
} {
  const subsumedBy = new Map<string, string>();
  for (const id of selectedIds) {
    for (const item of impliedClosure(id)) {
      // Only report ids the user actually selected, and keep the first
      // implier so the attribution is stable across re-renders.
      if (selectedIds.includes(item) && !subsumedBy.has(item)) {
        subsumedBy.set(item, id);
      }
    }
  }
  return {
    kept: selectedIds.filter((id) => !subsumedBy.has(id)),
    subsumedBy,
  };
}

/**
 * Filter out criteria that are implied/subsumed by other selected criteria.
 * Thin wrapper over `resolveSubsumption` for callers that only need the
 * surviving set.
 */
export function filterSubsumedCriteria(selectedIds: string[]): string[] {
  return resolveSubsumption(selectedIds).kept;
}

/**
 * Cumulative probability of having AT LEAST `years` years of experience,
 * conditioned on the candidate's age. We don't have a real joint distribution,
 * so we use a hand-tuned curve:
 *
 *   - Career starts at `careerStartAge` (22 by default).
 *   - Maximum possible years at age A is `A - 22`.
 *   - Median years at age A is roughly `(A - 22) * 0.5` (people change jobs,
 *     are unemployed, study longer, etc.).
 *   - The cumulative P(years ≥ N | age A) follows an exponential-ish decay
 *     in N.
 *
 * If `years` is 0, return 1.
 * If `years > age - 22`, return 0 (impossible).
 */
export function experienceProbability(
  years: number,
  age: number = DEFAULT_AGE,
): number {
  if (years <= 0) return 1;
  const maxYears = Math.max(0, age - EXPERIENCE_REFERENCE.careerStartAge);
  if (years > maxYears) return 0;
  // Decay constant: half-life ≈ 6 years of experience.
  // At years=0 → 1, years=6 → 0.5, years=12 → 0.25, years=18 → 0.125.
  const halfLife = 6;
  const base = Math.pow(0.5, years / halfLife);
  // Slightly bend the curve so that very-high years (close to max) tail off
  // harder than the pure exponential suggests.
  const tension = 1 - 0.3 * Math.pow(years / Math.max(1, maxYears), 2);
  return Math.max(0, Math.min(1, base * tension));
}

/**
 * Apply correlation lifts. For each active `given`, multiply the probability
 * of every `target` that points to it.
 *
 * `givenWeights` maps an active criterion to how *certain* it is that a
 * qualifying candidate satisfies it, in [0,1]:
 *
 *   - 1 for a plain required criterion (every candidate in the pool has it),
 *   - P(member) / P(union) for a member of a disjunctive OR group, since only
 *     that share of the surviving pool actually satisfies this branch.
 *
 * The weight interpolates the lift linearly, which is exactly the mixture
 * model: P(t | a OR b) = w·P(t|a) + (1-w)·P(t|b), and with P(t|b) ≈ P(t)
 * that collapses to an effective lift of `1 + (lift - 1) * w`. At w = 1 this
 * reduces to the raw lift, so plain conjunctive criteria are unaffected.
 */
function applyCorrelations(
  baseProbById: Map<string, number>,
  givenWeights: Map<string, number>,
): Map<string, number> {
  const liftById = new Map<string, number>();

  for (const c of CORRELATIONS) {
    const weight = givenWeights.get(c.given);
    if (weight === undefined || weight <= 0) continue;
    const effectiveLift = 1 + (c.lift - 1) * Math.min(1, weight);
    const prev = liftById.get(c.target) ?? 1;
    liftById.set(c.target, prev * effectiveLift);
  }

  const adjusted = new Map<string, number>();
  for (const [id, p] of baseProbById) {
    const lift = liftById.get(id) ?? 1;
    adjusted.set(id, Math.min(1, p * lift));
  }
  return adjusted;
}

/** Format a count into "1 in N people" for headline copy. */
export function oneInN(fraction: number): number {
  if (fraction <= 0) return Infinity;
  return Math.max(1, Math.round(1 / fraction));
}

/** Format a count into an absolute number, e.g. "1,240". */
export function formatAbsolute(n: number): string {
  if (!isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

/** Human-friendly percentage formatting without raw scientific e-notation. */
export function formatPercent(fraction: number): string {
  if (fraction <= 0) return '0%';
  if (fraction >= 1) return '100%';
  const pct = fraction * 100;
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(3)}%`;
  if (pct >= 0.0001) return `${pct.toFixed(5)}%`;
  if (pct >= 1e-6) return `${pct.toFixed(7)}%`;
  return '< 0.00001%';
}

/** Log-scaled delusion score: 1.0 → 0, 1e-7 → 100. */
export function delusionScoreFromFraction(fraction: number): number {
  if (fraction <= 0) return 100;
  if (fraction >= 1) return 0;
  // -log10(1e-7) = 7 → 100%
  return Math.max(0, Math.min(100, (-Math.log10(fraction) / 7) * 100));
}

/** Pure engine: input → result. No side effects. */
export function compute(input: EngineInput): EngineResult {
  const contradictions: string[] = [];
  const lang = input.lang ?? 'en';
  const str = ENGINE_STRINGS[lang];

  // Dedupe first: a hand-edited share hash can carry the same id twice, and a
  // duplicate must never make a requirement cheaper — or a disjunctive union
  // wider — than asking for it once.
  const validSelectedIds = Array.from(
    new Set(input.selectedIds.filter((id) => CRITERIA_BY_ID[id])),
  );
  // Pre-pass: Filter out subsumed/implied criteria (e.g. Bachelor's when Master's is selected)
  const { kept: selectedIds, subsumedBy } = resolveSubsumption(validSelectedIds);
  const subsumed: SubsumedEntry[] = [...subsumedBy].map(([id, byId]) => ({
    id,
    label: CRITERIA_BY_ID[id].label[lang],
    byId,
    byLabel: CRITERIA_BY_ID[byId].label[lang],
  }));

  // --- Step 1: handle experience + age gate BEFORE building the pool. ------
  let impossible = false;
  let experienceProb = 1;

  if (input.ageMin > 0 && input.ageMax > 0 && input.ageMin > input.ageMax) {
    impossible = true;
    contradictions.push(
      `Minimum age constraint (${input.ageMin}) cannot be greater than maximum age constraint (${input.ageMax}).`,
    );
  }

  let experienceAge = input.ageMax > 0 ? input.ageMax : DEFAULT_AGE;
  if (input.ageMin > 0 && input.ageMax > 0) {
    // Use midpoint of the requested range as the representative age.
    experienceAge = Math.round((input.ageMin + input.ageMax) / 2);
  } else if (input.ageMax > 0) {
    experienceAge = input.ageMax;
  } else if (input.ageMin > 0) {
    experienceAge = input.ageMin + 5;
  } else {
    experienceAge = DEFAULT_AGE;
  }

  if (input.experienceYears > 0) {
    experienceProb = experienceProbability(input.experienceYears, experienceAge);

    // Hard gate: M < N + 22 means you cannot have that many years of
    // experience at that age (graduated too late).
    if (input.ageMax > 0) {
      const neededAge = input.experienceYears + EXPERIENCE_REFERENCE.careerStartAge;
      if (input.ageMax < neededAge) {
        impossible = true;
        contradictions.push(
          `Asking for ${input.experienceYears} years of experience but capping age at ${input.ageMax} ` +
            `requires starting this career at age ${neededAge - input.experienceYears}. ` +
            `The youngest anyone with that much experience can be is ${neededAge}.`,
        );
      }
    }

    // Soft contradiction: experienceYears × age where you'd have to start
    // before graduating.
    if (input.ageMax > 0 && input.experienceYears > 0) {
      const startAge = input.ageMax - input.experienceYears;
      if (startAge < EXPERIENCE_REFERENCE.careerStartAge - 2) {
        contradictions.push(
          `To have ${input.experienceYears} years of experience by age ${input.ageMax}, ` +
            `this person would have had to start at age ${startAge} — before finishing a bachelor's.`,
        );
      }
    }
  }

  // --- Step 2: base probabilities for every effective criterion -----------
  // Criteria stay individual here on purpose. Disjunctive OR groups are only
  // collapsed in step 5, AFTER correlation lifts, so that a lift targeting a
  // group member (e.g. edu_bachelor → field_cs ×8) is not silently dropped.
  const baseProbById = new Map<string, number>();
  const labelById = new Map<string, string>();

  for (const id of selectedIds) {
    const c: Criterion = CRITERIA_BY_ID[id];
    baseProbById.set(id, c.probability);
    labelById.set(id, c.label[lang]);
  }

  if (input.experienceYears > 0) {
    baseProbById.set(EXPERIENCE_SYNTHETIC_ID, experienceProb);
    labelById.set(EXPERIENCE_SYNTHETIC_ID, str.experience(input.experienceYears));
  }

  // --- Step 3: identify disjunctive OR groups (Location, Field of study) ---
  interface DisjunctiveGroup {
    syntheticId: string;
    memberIds: string[];
    label: string;
  }
  const groups: DisjunctiveGroup[] = [];

  for (const category of DISJUNCTIVE_CATEGORIES) {
    const memberIds = selectedIds.filter((id) => id.startsWith(category.prefix));
    // A single selection is just an ordinary criterion — no union to take.
    if (memberIds.length < 2) continue;
    groups.push({
      syntheticId: category.groupId,
      memberIds,
      label: `${str.prefixes[category.labelKey]}: ${memberIds
        .map((id) => CRITERIA_BY_ID[id].label[lang])
        .join(str.or)}`,
    });
  }

  // --- Step 4: apply correlation lifts ------------------------------------
  // Givens are the *effective* criteria only. A subsumed criterion must never
  // act as a given: it has already been folded into the criterion that implies
  // it, so letting it lift anything would make an added-but-redundant
  // requirement ("CKA certified" + "Kubernetes") look 40x easier to satisfy.
  const givenWeights = new Map<string, number>();
  for (const id of selectedIds) givenWeights.set(id, 1);
  if (input.experienceYears > 0) givenWeights.set(EXPERIENCE_SYNTHETIC_ID, 1);

  // A member of an OR group only holds for its share of the surviving pool,
  // so it lifts its targets proportionally instead of at full strength.
  for (const group of groups) {
    const total = group.memberIds.reduce(
      (sum, id) => sum + CRITERIA_BY_ID[id].probability,
      0,
    );
    for (const id of group.memberIds) {
      givenWeights.set(
        id,
        total > 0 ? CRITERIA_BY_ID[id].probability / total : 0,
      );
    }
  }

  const adjusted = applyCorrelations(baseProbById, givenWeights);

  // --- Step 5: collapse OR groups from the LIFT-ADJUSTED member probs ------
  // Union of the branches, so widening an OR can only ever widen the pool.
  const groupedMemberIds = new Set<string>();
  for (const group of groups) {
    const combined = Math.min(
      1,
      group.memberIds.reduce((sum, id) => sum + (adjusted.get(id) ?? 0), 0),
    );
    adjusted.set(group.syntheticId, combined);
    labelById.set(group.syntheticId, group.label);
    for (const id of group.memberIds) groupedMemberIds.add(id);
  }

  // --- Step 6: build the waterfall sorted by damage (most restrictive first) --
  const activeList = [...adjusted.keys()].filter(
    (id) => !groupedMemberIds.has(id),
  );

  // Sort criteria so that the most damaging / selective filter comes first
  activeList.sort((a, b) => {
    const pA = adjusted.get(a) ?? 1;
    const pB = adjusted.get(b) ?? 1;
    return pA - pB;
  });

  let running = 1;
  const breakdown: BreakdownEntry[] = [];
  for (const id of activeList) {
    const before = running;
    const p = adjusted.get(id) ?? 1;
    const after = running * p;
    const lostPercent = (1 - p) * 100;
    breakdown.push({
      id,
      label: labelById.get(id) ?? id,
      before,
      after,
      lostPercent,
    });
    running = after;
  }

  let fraction = running;
  if (impossible) {
    // Collapse to a near-zero but non-zero number so the gauge still renders
    // without NaN-ing out. We use 1 in 1e9 — "we found one person, maybe."
    fraction = 1e-9;
  }

  // Clamp to [0,1].
  fraction = Math.max(0, Math.min(1, fraction));

  const absolutePeople = fraction * WORKING_AGE_POPULATION;
  const delusionScore = delusionScoreFromFraction(fraction);

  return {
    fraction,
    absolutePeople,
    delusionScore,
    impossible,
    contradictions,
    breakdown,
    subsumed,
  };
}

/** Convenience: empty input → fraction = 1.0 (everyone qualifies). */
export function computeEmpty(): EngineResult {
  return {
    fraction: 1,
    absolutePeople: WORKING_AGE_POPULATION,
    delusionScore: 0,
    impossible: false,
    contradictions: [],
    breakdown: [],
    subsumed: [],
  };
}
