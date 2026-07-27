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

export const IMPLICATIONS: Record<string, string[]> = {
  // --- Education hierarchy ------------------------------------------------
  edu_phd: ['edu_master', 'edu_bachelor', 'edu_associates', 'edu_highschool', 'edu_vocational', 'edu_primary', 'edu_literate'],
  edu_master: ['edu_bachelor', 'edu_associates', 'edu_highschool', 'edu_vocational', 'edu_primary', 'edu_literate'],
  edu_top10_uni: ['edu_bachelor', 'edu_associates', 'edu_highschool', 'edu_vocational', 'edu_primary', 'edu_literate'],
  edu_bachelor: ['edu_associates', 'edu_highschool', 'edu_vocational', 'edu_primary', 'edu_literate'],
  edu_associates: ['edu_highschool', 'edu_vocational', 'edu_primary', 'edu_literate'],
  edu_highschool: ['edu_primary', 'edu_literate'],
  edu_vocational: ['edu_primary', 'edu_literate'],
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
  skill_nextjs: ['skill_react', 'skill_javascript'],
  skill_react_native: ['skill_react', 'skill_javascript'],
  skill_react: ['skill_javascript'],
  skill_typescript: ['skill_javascript'],
  skill_express: ['skill_node', 'skill_javascript'],
  skill_node: ['skill_javascript'],
  skill_django: ['skill_python'],
  skill_flask: ['skill_python'],
  skill_pandas: ['skill_python'],
  skill_sql_advanced: ['skill_sql'],
  skill_kubernetes: ['skill_docker'],

  // --- Certifications implications ----------------------------------------
  cert_toefl_100: ['lang_en_c1', 'lang_en_b2', 'lang_en_b1', 'lang_en_a2'],
  cert_ielts_7: ['lang_en_c1', 'lang_en_b2', 'lang_en_b1', 'lang_en_a2'],
  cert_cka: ['skill_kubernetes', 'skill_docker'],
  cert_aws_sa: ['skill_aws'],
  cert_aws_dev: ['skill_aws'],
  cert_azure_admin: ['skill_azure'],

  // --- Misc ----------------------------------------------------------------
  misc_own_vehicle: ['misc_driver_license'],
};
