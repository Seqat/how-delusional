/**
 * correlations.ts — sparse lift table for non-independent criteria.
 *
 * WHY THIS EXISTS
 * ---------------
 * Naive multiplication `P(A) * P(B) * P(C) * ...` assumes every criterion is
 * statistically independent of every other. They are not. Knowing someone has
 * a CS degree massively raises the chance they know Python; knowing someone
 * speaks English C1 raises the chance they have a Bachelor's; demanding 10
 * years of experience is essentially incompatible with capping age at 28.
 *
 * Rather than fit a full Bayesian network (overkill, and we don't have the
 * joint distributions anyway), we model each known dependency as a conditional
 * lift:
 *
 *     P(A | B) = min(1, P(A) * lift)
 *
 * where `lift > 1` means "B makes A more likely" and `lift < 1` means "B makes
 * A less likely." Lifts are applied as a post-pass after the naive multiply —
 * see `applyCorrelations()` in `engine.ts`.
 *
 * Format: each entry says "when `given` is in the active criteria set, multiply
 * the probability of `target` by `lift`." Multiple entries can target the same
 * criterion; their lifts multiply.
 *
 * ⚠️ The numbers are rough author estimates calibrated against common sense,
 * not regression fits. If you have better numbers, edit them here.
 */

export interface CorrelationEntry {
  /** Criterion id that is the precondition (must be in the active set). */
  given: string;
  /** Criterion id whose probability gets re-scaled. */
  target: string;
  /** Multiplier applied to the target's probability. >1 = positive corr. */
  lift: number;
  /** Short note for future maintainers. */
  note: string;
}

export const CORRELATIONS: CorrelationEntry[] = [
  // --- Education → skills -------------------------------------------------
  { given: 'edu_bachelor',    target: 'field_cs',          lift: 8.0,  note: 'CS degree share among bachelor holders, not among whole pop' },
  { given: 'edu_bachelor',    target: 'field_engineering', lift: 6.0,  note: '' },
  { given: 'edu_bachelor',    target: 'field_business',    lift: 4.0,  note: '' },
  { given: 'edu_bachelor',    target: 'lang_en_b1',        lift: 2.5,  note: 'University grads disproportionately have B1+ English' },
  { given: 'edu_bachelor',    target: 'lang_en_b2',        lift: 3.0,  note: '' },
  { given: 'edu_bachelor',    target: 'lang_en_c1',        lift: 3.5,  note: '' },
  { given: 'edu_master',      target: 'lang_en_b2',        lift: 2.5,  note: 'Master cohort skews strongly B2+ English' },
  { given: 'edu_master',      target: 'lang_en_c1',        lift: 3.0,  note: '' },
  { given: 'edu_phd',         target: 'lang_en_c1',        lift: 4.0,  note: 'PhDs almost always read/write academic English' },
  { given: 'edu_phd',         target: 'lang_en_b2',        lift: 4.0,  note: '' },

  // --- CS degree → languages / frameworks (skill prevalence among CS grads
  //     is much higher than among the general population) ------------------
  { given: 'field_cs',        target: 'skill_python',      lift: 15.0, note: '' },
  { given: 'field_cs',        target: 'skill_javascript',  lift: 12.0, note: '' },
  { given: 'field_cs',        target: 'skill_typescript',  lift: 18.0, note: '' },
  { given: 'field_cs',        target: 'skill_java',        lift: 12.0, note: '' },
  { given: 'field_cs',        target: 'skill_sql',         lift: 8.0,  note: '' },
  { given: 'field_cs',        target: 'skill_react',       lift: 25.0, note: '' },
  { given: 'field_cs',        target: 'skill_node',        lift: 15.0, note: '' },
  { given: 'field_cs',        target: 'skill_aws',         lift: 12.0, note: '' },
  { given: 'field_cs',        target: 'skill_docker',      lift: 12.0, note: '' },
  { given: 'field_cs',        target: 'skill_git',         lift: 25.0, note: '' },
  { given: 'field_cs',        target: 'skill_linux',       lift: 8.0,  note: '' },

  // --- Engineering → CAD / hw-adjacent skills -----------------------------
  { given: 'field_engineering', target: 'skill_autocad',   lift: 8.0,  note: '' },
  { given: 'field_engineering', target: 'skill_solidworks',lift: 10.0, note: '' },
  { given: 'field_engineering', target: 'skill_matlab',    lift: 12.0, note: '' },
  { given: 'field_engineering', target: 'skill_cpp',       lift: 8.0,  note: '' },
  { given: 'field_engineering', target: 'skill_c',         lift: 6.0,  note: '' },

  // --- Business → accounting / BI -----------------------------------------
  { given: 'field_business',  target: 'skill_excel_adv',  lift: 5.0,  note: '' },
  { given: 'field_business',  target: 'skill_sap',        lift: 5.0,  note: '' },
  { given: 'field_business',  target: 'skill_powerbi',    lift: 6.0,  note: '' },
  { given: 'field_business',  target: 'cert_cpa',         lift: 10.0, note: '' },
  { given: 'field_business',  target: 'skill_sql',        lift: 3.0,  note: '' },

  // --- Design field → design tools ----------------------------------------
  { given: 'field_design',    target: 'skill_figma',      lift: 12.0, note: '' },
  { given: 'field_design',    target: 'skill_photoshop',  lift: 8.0,  note: '' },
  { given: 'field_design',    target: 'skill_illustrator',lift: 10.0, note: '' },

  // --- Certifications cluster with skills ---------------------------------
  { given: 'skill_aws',       target: 'cert_aws_sa',      lift: 30.0, note: 'AWS users far more likely to hold AWS cert' },
  { given: 'skill_kubernetes',target: 'cert_cka',         lift: 40.0, note: '' },
  { given: 'skill_agile',     target: 'cert_csm',         lift: 20.0, note: '' },
  { given: 'skill_jira',      target: 'cert_pmp',         lift: 8.0,  note: '' },
  { given: 'skill_sql_advanced', target: 'cert_aws_sa',   lift: 5.0,  note: '' },

  // --- English ↔ higher-ed cert chain -------------------------------------
  { given: 'lang_en_c1',      target: 'edu_bachelor',     lift: 2.0,  note: '' },
  { given: 'lang_en_c1',      target: 'edu_master',       lift: 3.0,  note: '' },
  { given: 'lang_en_c1',      target: 'cert_toefl_100',   lift: 15.0, note: '' },
  { given: 'lang_en_c1',      target: 'cert_ielts_7',     lift: 12.0, note: '' },
  { given: 'lang_en_c2',      target: 'cert_toefl_100',   lift: 25.0, note: '' },
  { given: 'lang_en_c2',      target: 'cert_ielts_7',     lift: 20.0, note: '' },

  // --- İstanbul → remote-ready (infra + role density) ---------------------
  { given: 'loc_istanbul',    target: 'loc_remote_tr',    lift: 2.5,  note: 'İstanbul has disproportionate share of remote-capable roles' },
  { given: 'loc_istanbul',    target: 'lang_en_b2',       lift: 1.8,  note: '' },

  // --- Misc correlations: married ↔ no_kids (negative), driver ↔ vehicle --
  { given: 'misc_own_vehicle',target: 'misc_driver_license', lift: 2.5, note: '' },
  { given: 'misc_married_ok', target: 'misc_no_kids',     lift: 0.4,  note: 'Married people more likely to have kids — negative correlation' },
  { given: 'misc_no_smoker',  target: 'edu_bachelor',     lift: 1.3,  note: 'Mild education gradient on smoking' },

  // --- Experience (handled in engine, but we still want a soft tie to
  //     certifications and seniority-adjacent skills) ----------------------
  // NOTE: experience is injected by the engine under synthetic id
  // 'experience_years' before correlation lookup. See engine.ts.
  { given: 'experience_years',target: 'cert_pmp',         lift: 6.0,  note: 'PMP requires 36+ months leading projects' },
  { given: 'experience_years',target: 'edu_master',       lift: 2.0,  note: '' },
];
