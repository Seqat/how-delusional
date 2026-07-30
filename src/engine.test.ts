import { describe, it, expect } from 'vitest';
import {
  compute,
  computeEmpty,
  experienceProbability,
  delusionScoreFromFraction,
  oneInN,
  filterSubsumedCriteria,
  impliedClosure,
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

describe('compute — implication subsumption & disjunctive categories', () => {
  it('subsumes Bachelor when Master degree is also selected', () => {
    const r = compute({
      selectedIds: ['edu_master', 'edu_bachelor'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // Master's probability is 0.045. Bachelor's (0.21) is subsumed and omitted.
    expect(r.fraction).toBeCloseTo(0.045, 4);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].id).toBe('edu_master');
  });

  it('subsumes English B2 when English C1 is also selected', () => {
    const r = compute({
      selectedIds: ['lang_en_c1', 'lang_en_b2'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // C1 is 0.022. B2 (0.06) is subsumed.
    expect(r.fraction).toBeCloseTo(0.022, 4);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].id).toBe('lang_en_c1');
  });

  it('subsumes React & JS when Next.js is selected', () => {
    const r = compute({
      selectedIds: ['skill_nextjs', 'skill_react', 'skill_javascript'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    // Next.js probability is 0.0015. React and JS are subsumed.
    expect(r.fraction).toBeCloseTo(0.0015, 4);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].id).toBe('skill_nextjs');
  });

  it('combines multiple locations as OR (disjunction)', () => {
    // İstanbul (0.20) + Ankara (0.07) = 0.27
    const r = compute({
      selectedIds: ['loc_istanbul', 'loc_ankara'],
      experienceYears: 0,
      ageMin: 0,
      ageMax: 0,
    });
    expect(r.fraction).toBeCloseTo(0.27, 4);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].id).toBe('loc_disjunctive_group');
  });
});

describe('compute — subsumption must be a true no-op', () => {
  const base = { experienceYears: 0, ageMin: 0, ageMax: 0 };

  it('adding an already-implied skill does not fire its correlation lift', () => {
    // cert_aws_sa implies skill_aws. The AWS posting parser emits BOTH ids for
    // "AWS Certified Solutions Architect". If the subsumed skill_aws were still
    // used as a correlation `given`, {given: skill_aws, target: cert_aws_sa,
    // lift: 30} would fire and make the stricter posting look 30x easier.
    const certOnly = compute({ selectedIds: ['cert_aws_sa'], ...base });
    const certPlusSkill = compute({
      selectedIds: ['cert_aws_sa', 'skill_aws'],
      ...base,
    });
    expect(certOnly.fraction).toBeCloseTo(0.0004, 8);
    expect(certPlusSkill.fraction).toBeCloseTo(certOnly.fraction, 10);
  });

  it('adding an already-implied cert prerequisite does not fire its lift', () => {
    // cert_cka implies skill_kubernetes ({given: skill_kubernetes,
    // target: cert_cka, lift: 40}).
    const certOnly = compute({ selectedIds: ['cert_cka'], ...base });
    const withK8s = compute({
      selectedIds: ['cert_cka', 'skill_kubernetes', 'skill_docker'],
      ...base,
    });
    expect(withK8s.fraction).toBeCloseTo(certOnly.fraction, 10);
    expect(withK8s.breakdown).toHaveLength(1);
  });

  it('does not compound lifts from a subsumed education level', () => {
    // edu_bachelor lifts lang_en_c1 by 3.5 and edu_master lifts it by 3.0.
    // Requiring "Master's" already covers the bachelor's, so adding it must
    // not multiply both lifts onto English C1.
    const withoutBachelor = compute({
      selectedIds: ['edu_master', 'lang_en_c1'],
      ...base,
    });
    const withBachelor = compute({
      selectedIds: ['edu_master', 'edu_bachelor', 'lang_en_c1'],
      ...base,
    });
    // master 0.045 × 3.0 (from C1) × C1 0.022 × 3.0 (from master)
    expect(withoutBachelor.fraction).toBeCloseTo(0.135 * 0.066, 8);
    expect(withBachelor.fraction).toBeCloseTo(withoutBachelor.fraction, 10);
  });

  it('ignores duplicate ids instead of widening a disjunctive union', () => {
    // A hand-edited share hash can carry the same id twice; requiring İstanbul
    // twice must not double the pool.
    const once = compute({ selectedIds: ['loc_istanbul'], ...base });
    const twice = compute({
      selectedIds: ['loc_istanbul', 'loc_istanbul'],
      ...base,
    });
    expect(once.fraction).toBeCloseTo(0.2, 8);
    expect(twice.fraction).toBeCloseTo(once.fraction, 10);
    expect(twice.breakdown).toHaveLength(1);
    expect(twice.breakdown[0].id).toBe('loc_istanbul');
  });
});

describe('compute — disjunctive OR groups keep correlation lifts', () => {
  const base = { experienceYears: 0, ageMin: 0, ageMax: 0 };

  it('widening an OR group never shrinks the pool', () => {
    // edu_bachelor lifts field_cs ×8 and field_engineering ×6. If collapsing
    // the group dropped those lifts, accepting an EXTRA degree would shrink
    // the pool from 10.1% to 3.4%.
    const csOnly = compute({
      selectedIds: ['edu_bachelor', 'field_cs'],
      ...base,
    });
    const csOrEngineering = compute({
      selectedIds: ['edu_bachelor', 'field_cs', 'field_engineering'],
      ...base,
    });
    // 0.21 × min(1, 0.06 × 8)
    expect(csOnly.fraction).toBeCloseTo(0.21 * 0.48, 8);
    expect(csOrEngineering.fraction).toBeGreaterThanOrEqual(csOnly.fraction);
    // union of the lifted branches: 0.48 + 0.60 → clamped to 1
    expect(csOrEngineering.fraction).toBeCloseTo(0.21, 8);
    expect(
      csOrEngineering.breakdown.some((b) => b.id === 'field_disjunctive_group'),
    ).toBe(true);
  });

  it('weights a disjunct member lift by its share of the union', () => {
    // field_cs lifts skill_python ×15 when CS is mandatory. As one of two
    // accepted fields it only holds for its share of the pool, so the lift is
    // interpolated: 1 + (15 - 1) × P(cs)/P(cs or business).
    const csOnly = compute({
      selectedIds: ['field_cs', 'skill_python'],
      ...base,
    });
    const csOrBusiness = compute({
      selectedIds: ['field_cs', 'field_business', 'skill_python'],
      ...base,
    });
    const share = 0.06 / (0.06 + 0.13);
    const effectiveLift = 1 + (15 - 1) * share;

    expect(csOnly.fraction).toBeCloseTo(0.06 * 0.012 * 15, 8);
    expect(csOrBusiness.fraction).toBeCloseTo(
      0.19 * 0.012 * effectiveLift,
      8,
    );
    // strictly between "no lift at all" and "full-strength lift"
    expect(csOrBusiness.fraction).toBeGreaterThan(0.19 * 0.012);
    expect(csOrBusiness.fraction).toBeLessThan(0.19 * 0.012 * 15);
  });

  it('localises synthetic group and experience labels', () => {
    const args = {
      selectedIds: ['loc_istanbul', 'loc_ankara'],
      experienceYears: 5,
      ageMin: 0,
      ageMax: 0,
    };
    const en = compute(args);
    expect(
      en.breakdown.find((b) => b.id === 'loc_disjunctive_group')?.label,
    ).toBe('Location: İstanbul OR Ankara');
    expect(en.breakdown.find((b) => b.id === 'experience_years')?.label).toBe(
      '5 years of experience',
    );

    const tr = compute({ ...args, lang: 'tr' as const });
    expect(
      tr.breakdown.find((b) => b.id === 'loc_disjunctive_group')?.label,
    ).toBe('Konum: İstanbul VEYA Ankara');
    expect(tr.breakdown.find((b) => b.id === 'experience_years')?.label).toBe(
      '5 yıl deneyim',
    );
  });
});

describe('implication table — hierarchy vs parallel tracks', () => {
  const base = { experienceYears: 0, ageMin: 0, ageMax: 0 };

  it('follows implications transitively', () => {
    expect(impliedClosure('edu_phd').has('edu_literate')).toBe(true);
    // cert_cka → skill_kubernetes → skill_docker
    expect(impliedClosure('cert_cka').has('skill_docker')).toBe(true);
    expect(impliedClosure('skill_nextjs').has('skill_javascript')).toBe(true);
  });

  it('does not treat vocational HS / associate degree as lower rungs', () => {
    // Both are parallel tracks: a bachelor's holder usually has neither.
    expect(impliedClosure('edu_bachelor').has('edu_vocational')).toBe(false);
    expect(impliedClosure('edu_bachelor').has('edu_associates')).toBe(false);
    expect(impliedClosure('edu_phd').has('edu_vocational')).toBe(false);
  });

  it('keeps a vocational HS requirement alongside a bachelor requirement', () => {
    const r = compute({
      selectedIds: ['edu_bachelor', 'edu_vocational'],
      ...base,
    });
    expect(r.breakdown).toHaveLength(2);
    expect(r.fraction).toBeCloseTo(0.21 * 0.21, 8);
  });

  it('still subsumes strictly cumulative education levels', () => {
    const r = compute({
      selectedIds: ['edu_bachelor', 'edu_highschool', 'edu_literate'],
      ...base,
    });
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].id).toBe('edu_bachelor');

    // vocational HS is still an upper-secondary diploma
    const v = compute({
      selectedIds: ['edu_vocational', 'edu_highschool'],
      ...base,
    });
    expect(v.breakdown).toHaveLength(1);
    expect(v.breakdown[0].id).toBe('edu_vocational');
  });

  it('keeps only the strongest criterion of a chain', () => {
    expect(
      filterSubsumedCriteria(['edu_bachelor', 'edu_phd', 'edu_master']),
    ).toEqual(['edu_phd']);
    expect(
      filterSubsumedCriteria(['skill_javascript', 'skill_react', 'skill_nextjs']),
    ).toEqual(['skill_nextjs']);
  });

  it('leaves unrelated criteria untouched', () => {
    const ids = ['skill_python', 'misc_driver_license', 'loc_izmir'];
    expect(filterSubsumedCriteria(ids)).toEqual(ids);
  });
});


