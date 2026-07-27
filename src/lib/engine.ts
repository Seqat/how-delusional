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
import { IMPLICATIONS } from '../data/implications';

export interface EngineInput {
  /** IDs of selected criteria from population.ts (education, skills, etc.). */
  selectedIds: string[];
  /** Years of experience required (0 = "not specified"). */
  experienceYears: number;
  /** Required minimum age (0 = not specified). */
  ageMin: number;
  /** Required maximum age (0 = not specified, Infinity treated as no cap). */
  ageMax: number;
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
}

const EXPERIENCE_SYNTHETIC_ID = 'experience_years';

/**
 * Filter out criteria that are implied/subsumed by other selected criteria.
 * e.g., edu_master implies edu_bachelor; lang_en_c1 implies lang_en_b2.
 */
export function filterSubsumedCriteria(selectedIds: string[]): string[] {
  const implied = new Set<string>();
  for (const id of selectedIds) {
    const list = IMPLICATIONS[id];
    if (list) {
      for (const item of list) {
        implied.add(item);
      }
    }
  }
  return selectedIds.filter((id) => !implied.has(id));
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
 * We re-evaluate the per-criterion probability AFTER correlation by walking
 * the selected list once and accumulating lifts into a map.
 */
function applyCorrelations(
  baseProbById: Map<string, number>,
  activeIds: Set<string>,
): Map<string, number> {
  const liftById = new Map<string, number>();

  for (const c of CORRELATIONS) {
    if (!activeIds.has(c.given)) continue;
    const prev = liftById.get(c.target) ?? 1;
    liftById.set(c.target, prev * c.lift);
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
  const rawSelectedIds = input.selectedIds.filter((id) => CRITERIA_BY_ID[id]);
  // Pre-pass: Filter out subsumed/implied criteria (e.g. Bachelor's when Master's is selected)
  const selectedIds = filterSubsumedCriteria(rawSelectedIds);

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
            `requires starting this career at age ${neededAge - input.experienceYears + input.experienceYears - input.experienceYears}. ` +
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

  // --- Step 2: process disjunctive categories (Location & Field of Study) ---
  const activeIdsForCalculation: string[] = [];
  const baseProbById = new Map<string, number>();
  const labelById = new Map<string, string>();

  // Process disjunctive group: Location (loc_)
  const locIds = selectedIds.filter((id) => id.startsWith('loc_'));
  const nonLocIds = selectedIds.filter((id) => !id.startsWith('loc_'));

  if (locIds.length > 1) {
    const combinedProb = Math.min(
      1,
      locIds.reduce((sum, id) => sum + CRITERIA_BY_ID[id].probability, 0),
    );
    const combinedLabel = `Location: ${locIds.map((id) => CRITERIA_BY_ID[id].label.en).join(' OR ')}`;
    const syntheticLocId = 'loc_disjunctive_group';
    baseProbById.set(syntheticLocId, combinedProb);
    labelById.set(syntheticLocId, combinedLabel);
    activeIdsForCalculation.push(syntheticLocId);
  } else if (locIds.length === 1) {
    const id = locIds[0];
    const c = CRITERIA_BY_ID[id];
    baseProbById.set(id, c.probability);
    labelById.set(id, c.label.en);
    activeIdsForCalculation.push(id);
  }

  // Process disjunctive group: Field of Study (field_)
  const fieldIds = nonLocIds.filter((id) => id.startsWith('field_'));
  const remainingIds = nonLocIds.filter((id) => !id.startsWith('field_'));

  if (fieldIds.length > 1) {
    const combinedProb = Math.min(
      1,
      fieldIds.reduce((sum, id) => sum + CRITERIA_BY_ID[id].probability, 0),
    );
    const combinedLabel = `Field: ${fieldIds.map((id) => CRITERIA_BY_ID[id].label.en).join(' OR ')}`;
    const syntheticFieldId = 'field_disjunctive_group';
    baseProbById.set(syntheticFieldId, combinedProb);
    labelById.set(syntheticFieldId, combinedLabel);
    activeIdsForCalculation.push(syntheticFieldId);
  } else if (fieldIds.length === 1) {
    const id = fieldIds[0];
    const c = CRITERIA_BY_ID[id];
    baseProbById.set(id, c.probability);
    labelById.set(id, c.label.en);
    activeIdsForCalculation.push(id);
  }

  // Add all remaining non-disjunctive criteria
  for (const id of remainingIds) {
    const c = CRITERIA_BY_ID[id];
    baseProbById.set(id, c.probability);
    labelById.set(id, c.label.en);
    activeIdsForCalculation.push(id);
  }

  if (input.experienceYears > 0) {
    baseProbById.set(EXPERIENCE_SYNTHETIC_ID, experienceProb);
    labelById.set(
      EXPERIENCE_SYNTHETIC_ID,
      `${input.experienceYears} years of experience`,
    );
    activeIdsForCalculation.push(EXPERIENCE_SYNTHETIC_ID);
  }

  // --- Step 3: apply correlation lifts ------------------------------------
  // We pass rawSelectedIds to correlation lookup so that underlying given IDs
  // (e.g. field_cs) still trigger correlation lifts for their targets!
  const activeIdsForCorrelations = new Set<string>([
    ...rawSelectedIds,
    ...(input.experienceYears > 0 ? [EXPERIENCE_SYNTHETIC_ID] : []),
  ]);
  const adjusted = applyCorrelations(baseProbById, activeIdsForCorrelations);

  // --- Step 4: build the waterfall sorted by damage (most restrictive first) --
  const activeList = [...activeIdsForCalculation];

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

  // Sort breakdown by damage descending (most damaging first).
  const sortedBreakdown = [...breakdown].sort((a, b) => b.lostPercent - a.lostPercent);

  return {
    fraction,
    absolutePeople,
    delusionScore,
    impossible,
    contradictions,
    breakdown,
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
  };
}
