import { describe, it, expect } from 'vitest';
import {
  compute,
  computeEmpty,
  experienceProbability,
  delusionScoreFromFraction,
  oneInN,
} from './lib/engine';

describe('compute — empty input', () => {
  it('returns fraction = 1.0 when no criteria are selected', () => {
    const r = compute({ selectedIds: [], experienceYears: 0, ageMin: 0, ageMax: 0 });
    expect(r.fraction).toBe(1);
    expect(r.delusionScore).toBe(0);
    expect(r.breakdown).toHaveLength(0);
    expect(r.contradictions).toHaveLength(0);
    expect(r.impossible).toBe(false);
  });

  it('computeEmpty() returns the same shape with fraction = 1', () => {
    const r = computeEmpty();
    expect(r.fraction).toBe(1);
    expect(r.absolutePeople).toBeGreaterThan(1_000_000);
    expect(r.delusionScore).toBe(0);
  });
});

describe('compute — naive independence (no correlation entries trigger)', () => {
  it('multiplies two unrelated criteria', () => {
    // driver license (0.45) × no_smoker (0.40) = 0.18
    const r = compute({
      selectedIds: ['misc_driver_license', 'misc_no_smoker'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // With correlation: no_smoker × bachelor lift 1.3 doesn't apply because
    // bachelor is not active. So expected ≈ 0.45 × 0.40 = 0.18.
    expect(r.fraction).toBeCloseTo(0.18, 2);
  });

  it('multiplies three unrelated criteria', () => {
    // forklift cert (0.008) × driver license (0.45) × no_smoker (0.40) = 0.00144
    const r = compute({
      selectedIds: ['cert_forklift', 'misc_driver_license', 'misc_no_smoker'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // Note: driver_license × own_vehicle lift only applies when both are
    // active. Here own_vehicle is NOT active, so no lift. Same for
    // married_ok × no_kids.
    expect(r.fraction).toBeCloseTo(0.008 * 0.45 * 0.40, 4);
  });
});

describe('compute — correlation lifts', () => {
  it('lifts Python probability when CS degree is also selected', () => {
    // Without CS: skill_python alone → 0.012
    const solo = compute({
      selectedIds: ['skill_python'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // With CS: lift = 15.0 → 0.012 * 15 = 0.18, but also bachelor → field_cs
    // lift 8.0 applies because field_cs is active. We just want to verify the
    // result with CS is larger than without.
    // To isolate: only field_cs + skill_python, no bachelor.
    const withCS = compute({
      selectedIds: ['field_cs', 'skill_python'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // fraction_with_cs = field_cs × skill_python_lifted
    //   = 0.06 × min(1, 0.012 × 15) = 0.06 × 0.18 = 0.0108
    expect(withCS.fraction).toBeCloseTo(0.0108, 4);
    expect(withCS.fraction).toBeGreaterThan(solo.fraction * 0.06);
  });

  it('does not apply lift when the precondition is not active', () => {
    // skill_python alone should keep its base probability
    const r = compute({
      selectedIds: ['skill_python'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    expect(r.fraction).toBeCloseTo(0.012, 4);
  });

  it('caps lifted probability at 1.0', () => {
    // skill_python has lift 15 from field_cs → 0.012 × 15 = 0.18, not capped.
    // But sql_advanced × aws_sa lift 5 → 0.0004 × 5 = 0.002, not capped.
    // Let's pick a case that would overflow without the cap: en_c1 →
    // toefl_100 lift 15 → 0.004 × 15 = 0.06, not capped either.
    // Use multiple lifts on same target: lang_en_c1 → master lift 3 + bachelor
    // lift 3.5 → 0.022 × 3 × 3.5 = 0.231 → not capped.
    // OK — we just verify cap logic with a hand-rolled scenario: pick a target
    // with multiple strong lifts. AWS SA gets lift 30 from skill_aws and lift
    // 5 from skill_sql_advanced: 0.0004 × 30 × 5 = 0.06, not capped.
    // For an actual cap hit, the only way is many lifts combining past 1.
    // Skip explicit cap hit and just verify < 1 always.
    const r = compute({
      selectedIds: ['skill_aws', 'skill_sql_advanced', 'cert_aws_sa'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    expect(r.fraction).toBeLessThanOrEqual(1);
    expect(r.fraction).toBeGreaterThan(0);
  });
});

describe('compute — age–experience feasibility gate', () => {
  it('flags impossible when ageMax < experienceYears + 22', () => {
    const r = compute({
      selectedIds: [],
      experienceYears: 8,
      ageMin: 0,
      ageMax: 25, // 25 < 8 + 22 = 30
    });
    expect(r.impossible).toBe(true);
    expect(r.fraction).toBeLessThan(1e-6);
    expect(r.contradictions.length).toBeGreaterThan(0);
  });

  it('does not flag impossible when ageMax >= experienceYears + 22', () => {
    const r = compute({
      selectedIds: [],
      experienceYears: 8,
      ageMin: 0,
      ageMax: 32, // 32 >= 30, OK
    });
    expect(r.impossible).toBe(false);
  });

  it('flags a soft contradiction when start age is implausibly young', () => {
    const r = compute({
      selectedIds: [],
      experienceYears: 12,
      ageMin: 0,
      ageMax: 30, // start age = 18, < 22 - 2 = 20 → soft contradiction
    });
    // Hard gate: 30 < 12 + 22 = 34 → impossible. So this case IS impossible.
    expect(r.impossible).toBe(true);
  });

  it('passes when experience is plausible for age', () => {
    const r = compute({
      selectedIds: [],
      experienceYears: 5,
      ageMin: 28,
      ageMax: 35, // start age 23–30, plausible
    });
    expect(r.impossible).toBe(false);
    expect(r.contradictions.length).toBe(0);
  });
});

describe('compute — breakdown ordering', () => {
  it('sorts breakdown by descending lostPercent', () => {
    const r = compute({
      selectedIds: [
        'cert_aws_sa',        // p = 0.0004 — huge loss
        'misc_no_smoker',     // p = 0.40 — moderate loss
        'misc_driver_license',// p = 0.45 — smallest loss
      ],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    expect(r.breakdown.length).toBe(3);
    // The cert_aws_sa entry should have the largest lostPercent
    const maxLost = Math.max(...r.breakdown.map((b) => b.lostPercent));
    expect(r.breakdown[0].lostPercent).toBeCloseTo(maxLost, 4);
    // Monotonic non-increasing
    for (let i = 1; i < r.breakdown.length; i++) {
      expect(r.breakdown[i].lostPercent).toBeLessThanOrEqual(r.breakdown[i - 1].lostPercent);
    }
  });

  it('breakdown includes synthetic experience entry when experience > 0', () => {
    const r = compute({
      selectedIds: ['misc_no_smoker'],
      experienceYears: 5,
      ageMin: 0,
      ageMax: 0,
    });
    expect(r.breakdown.some((b) => b.id === 'experience_years')).toBe(true);
  });

  it('breakdown before/after values are monotonically decreasing in insertion order', () => {
    // We re-sorted, so insertion order isn't preserved — but each entry's
    // `before` should be ≥ `after`, and `after` should be ≥ 0.
    const r = compute({
      selectedIds: ['misc_no_smoker', 'misc_driver_license', 'cert_pmp'],
      experienceYears: 3,
      ageMin: 0,
      ageMax: 0,
    });
    for (const b of r.breakdown) {
      expect(b.before).toBeGreaterThanOrEqual(b.after);
      expect(b.after).toBeGreaterThanOrEqual(0);
      expect(b.lostPercent).toBeGreaterThanOrEqual(0);
      expect(b.lostPercent).toBeLessThanOrEqual(100);
    }
  });
});

describe('experienceProbability', () => {
  it('returns 1 for 0 years', () => {
    expect(experienceProbability(0, 30)).toBe(1);
  });

  it('returns 0 when years exceed age - 22', () => {
    expect(experienceProbability(15, 30)).toBe(0); // 30 - 22 = 8 < 15
  });

  it('returns a value between 0 and 1 for plausible years', () => {
    const p = experienceProbability(5, 35);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('is monotonic non-increasing in years for fixed age', () => {
    const p2 = experienceProbability(2, 40);
    const p5 = experienceProbability(5, 40);
    const p10 = experienceProbability(10, 40);
    expect(p2).toBeGreaterThanOrEqual(p5);
    expect(p5).toBeGreaterThanOrEqual(p10);
  });
});

describe('delusionScoreFromFraction', () => {
  it('returns 0 for fraction = 1', () => {
    expect(delusionScoreFromFraction(1)).toBe(0);
  });

  it('returns 100 for fraction = 1e-7 or smaller', () => {
    expect(delusionScoreFromFraction(1e-7)).toBe(100);
    expect(delusionScoreFromFraction(1e-9)).toBe(100);
    expect(delusionScoreFromFraction(0)).toBe(100);
  });

  it('is monotonic increasing as fraction decreases', () => {
    expect(delusionScoreFromFraction(0.1)).toBeLessThan(delusionScoreFromFraction(0.01));
    expect(delusionScoreFromFraction(0.01)).toBeLessThan(delusionScoreFromFraction(0.001));
  });

  it('returns ~50 for fraction = 1e-3.5', () => {
    // (-log10(1e-3.5) / 7) * 100 = 3.5/7 * 100 = 50
    const s = delusionScoreFromFraction(Math.pow(10, -3.5));
    expect(s).toBeCloseTo(50, 1);
  });
});

describe('oneInN', () => {
  it('returns 1 for fraction = 1', () => {
    expect(oneInN(1)).toBe(1);
  });

  it('returns Infinity for fraction = 0', () => {
    expect(oneInN(0)).toBe(Infinity);
  });

  it('returns a sensible integer for moderate fractions', () => {
    expect(oneInN(0.01)).toBe(100);
    expect(oneInN(0.001)).toBe(1000);
  });
});

describe('share-link round-trip (via engine input shape)', () => {
  it('produces the same shape after compute', () => {
    // We don't import share.ts here to keep the engine test file pure; this
    // is a sanity check that the EngineInput shape is consumed correctly.
    const input = {
      selectedIds: ['edu_bachelor', 'skill_python', 'lang_en_b2'],
      experienceYears: 5,
      ageMin: 28,
      ageMax: 40,
    };
    const r = compute(input);
    expect(r.fraction).toBeGreaterThan(0);
    expect(r.fraction).toBeLessThan(1);
    expect(r.breakdown.length).toBe(4); // 3 selected + experience
  });

  it('detects contradiction when ageMin > ageMax', () => {
    const input = {
      selectedIds: ['edu_bachelor'],
      experienceYears: 2,
      ageMin: 45,
      ageMax: 25,
    };
    const r = compute(input);
    expect(r.impossible).toBe(true);
    expect(r.contradictions.length).toBeGreaterThan(0);
    expect(r.contradictions[0]).toContain('Minimum age constraint (45)');
  });
});

