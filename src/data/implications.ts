/**
 * implications.ts — Hierarchy maps and implication relationships.
 *
 * Defines:
 * 1. IMPLICATIONS: Map of criterion ID -> array of implied criterion IDs.
 *    If key criterion A is active, all criteria in IMPLICATIONS[A] are
 *    automatically subsumed (implied) and should not be double-counted.
 *
 * 2. DISJUNCTIVE_CATEGORIES: Criteria groups where selecting multiple criteria
 *    represents an OR (Union) choice in job postings (e.g. Location, Field of Study).
 */

/**
 * A category whose members are alternatives, not requirements. When more than
 * one member is selected the engine collapses them into a single synthetic
 * criterion whose probability is the *union* of the branches, instead of
 * multiplying them as if a candidate had to satisfy all of them at once.
 */
export interface DisjunctiveCategory {
  /** Selected criteria starting with this id prefix form one union. */
  prefix: string;
  /** Id of the synthetic group criterion the engine creates. */
  groupId: string;
  /** Which label prefix the engine uses when naming the group. */
  labelKey: 'location' | 'field' | 'age' | 'education';
}

/**
 * Job postings phrase these categories as "X or Y" far more often than as
 * "X and Y":
 *
 *   - loc_/field_: "İstanbul veya Ankara", "Bilgisayar veya Elektrik Müh."
 *   - age_:        two brackets are a range, never a conjunction — nobody is
 *                  25–34 *and* 35–44 at the same time.
 *   - edu_:        "lisans veya ön lisans" is the standard formulation. The
 *                  subsumption pre-pass has already collapsed comparable
 *                  levels (a bachelor's swallows the high-school rung), so
 *                  whatever survives into this group is a set of genuinely
 *                  parallel tracks — exactly the OR case.
 *
 * The trade-off for edu_ is that a real conjunction ("vocational high school
 * AND a bachelor's", occasionally seen for technician roles) can no longer be
 * expressed. That is deliberate: the AND reading misprices the common case by
 * ~14x, the OR reading misprices the rare case by much less.
 */
export const DISJUNCTIVE_CATEGORIES: DisjunctiveCategory[] = [
  { prefix: 'loc_', groupId: 'loc_disjunctive_group', labelKey: 'location' },
  { prefix: 'field_', groupId: 'field_disjunctive_group', labelKey: 'field' },
  { prefix: 'age_', groupId: 'age_disjunctive_group', labelKey: 'age' },
  { prefix: 'edu_', groupId: 'edu_disjunctive_group', labelKey: 'education' },
];

export const IMPLICATIONS: Record<string, string[]> = {
  // --- Education hierarchy ------------------------------------------------
  // NOTE: only *strictly cumulative* levels belong here. `edu_vocational`
  // (vocational high school) and `edu_associates` (ön lisans) are parallel
  // tracks, not lower rungs: someone with a bachelor's degree usually holds
  // neither, so a bachelor's must not subsume them.
  //
  // Whatever survives this pre-pass is therefore a set of incomparable levels,
  // and `DISJUNCTIVE_CATEGORIES` above then reads them as alternatives:
  // "bachelor's OR associate's" unions to ~31% of the pool rather than
  // multiplying to ~2%.
  edu_phd: ['edu_master', 'edu_bachelor', 'edu_highschool', 'edu_primary', 'edu_literate'],
  edu_master: ['edu_bachelor', 'edu_highschool', 'edu_primary', 'edu_literate'],
  edu_top10_uni: ['edu_bachelor', 'edu_highschool', 'edu_primary', 'edu_literate'],
  edu_bachelor: ['edu_highschool', 'edu_primary', 'edu_literate'],
  // Ön lisans / vocational high school both count as upper-secondary
  // attainment, so they do imply a high-school diploma.
  edu_associates: ['edu_highschool', 'edu_primary', 'edu_literate'],
  edu_vocational: ['edu_highschool', 'edu_primary', 'edu_literate'],
  edu_highschool: ['edu_primary', 'edu_literate'],
  edu_primary: ['edu_literate'],

  // --- Languages CEFR hierarchy -------------------------------------------
  lang_en_c2: ['lang_en_c1', 'lang_en_b2', 'lang_en_b1', 'lang_en_a2'],
  lang_en_c1: ['lang_en_b2', 'lang_en_b1', 'lang_en_a2'],
  lang_en_b2: ['lang_en_b1', 'lang_en_a2'],
  lang_en_b1: ['lang_en_a2'],

  lang_de_c1: ['lang_de_b2', 'lang_de_b1', 'lang_de_a2'],
  lang_de_b2: ['lang_de_b1', 'lang_de_a2'],
  lang_de_b1: ['lang_de_a2'],

  lang_fr_b2: ['lang_fr_b1', 'lang_fr_a2'],
  lang_fr_b1: ['lang_fr_a2'],

  lang_es_b1: ['lang_es_a2'],

  lang_ar_b2: ['lang_ar_b1', 'lang_ar_a2'],
  lang_ar_b1: ['lang_ar_a2'],

  lang_ru_b1: ['lang_ru_a2'],

  // --- Hard skills prerequisites & ecosystems -----------------------------
  // Only *hard* prerequisites belong here: you cannot write Spring Boot
  // without Java, so asking for both is asking for one thing. Merely
  // correlated pairs belong in correlations.ts instead — see the exclusion
  // list at the bottom of this block.

  // JS / TS ecosystem
  skill_nextjs: ['skill_react', 'skill_javascript'],
  skill_react_native: ['skill_react', 'skill_javascript'],
  skill_react: ['skill_javascript'],
  skill_angular: ['skill_typescript', 'skill_javascript'],
  skill_vue: ['skill_javascript'],
  skill_svelte: ['skill_javascript'],
  skill_typescript: ['skill_javascript'],
  skill_express: ['skill_node', 'skill_javascript'],
  skill_node: ['skill_javascript'],

  // Python ecosystem
  skill_django: ['skill_python'],
  skill_flask: ['skill_python'],
  skill_pandas: ['skill_python'],
  skill_tensorflow: ['skill_python'],
  skill_pytorch: ['skill_python'],
  skill_airflow: ['skill_python'],

  // JVM / .NET / PHP ecosystems
  skill_spring: ['skill_java'],
  skill_dotnet: ['skill_csharp'],
  skill_laravel: ['skill_php'],

  // Data / infra
  skill_sql_advanced: ['skill_sql'],
  skill_kubernetes: ['skill_docker'],

  // DELIBERATELY NOT LISTED (correlated, not prerequisite):
  //   skill_spark      → Scala, Java or Python; no single language is required
  //   skill_terraform  → multi-cloud by design, implies no specific provider
  //   skill_android    → Kotlin OR Java, a disjunction rather than implication
  //   skill_ios        → mostly Swift, but Objective-C codebases still exist
  //   skill_powerbi/tableau → neither requires SQL
  //   cert_ccna        → maps to no criterion we model

  // --- Certifications implications ----------------------------------------
  cert_toefl_100: ['lang_en_c1', 'lang_en_b2', 'lang_en_b1', 'lang_en_a2'],
  cert_ielts_7: ['lang_en_c1', 'lang_en_b2', 'lang_en_b1', 'lang_en_a2'],
  cert_cka: ['skill_kubernetes', 'skill_docker'],
  cert_aws_sa: ['skill_aws'],
  cert_aws_dev: ['skill_aws'],
  cert_azure_admin: ['skill_azure'],
  cert_csm: ['skill_agile'],

  // --- Misc ----------------------------------------------------------------
  misc_own_vehicle: ['misc_driver_license'],
};
