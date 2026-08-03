/**
 * population.ts — Rough prevalence figures for working-age adults.
 *
 * ⚠️  DISCLAIMER (read before quoting any number from this file)
 * --------------------------------------------------------------
 * These numbers are ROUGH PUBLIC-STATISTICS ESTIMATES assembled from a mix of
 * TÜİK releases, Eurostat aggregates, OECD education indicators, Stack
 * Overflow Developer Survey, LinkedIn economic-graph reports, CEFR/Eurobarometer
 * language surveys, and — where no public number could be found — the author's
 * own gut estimates. They are NOT authoritative, they are NOT annually
 * reconciled, and they should NOT be used for hiring, firing, immigration,
 * insurance underwriting, or any other real decision.
 *
 * They exist purely to power a satire that punches at unrealistic job postings.
 * If a number offends you, edit it. The whole point of putting everything in
 * this one file is so you CAN edit it.
 *
 * Conventions used in this file:
 *   - `probability` is the share of the WORKING-AGE population (15–64) that
 *     satisfies the criterion. Working-age pop of Türkiye ≈ 53.5M (TÜİK 2023).
 *     Working-age pop of the world ≈ 4.6B.
 *   - `confidence: "measured"` means there is at least one citable public
 *     statistic reasonably close to the number. `"estimated"` means we
 *     interpolated, eyeballed, or flat-out guessed.
 *   - When TR data was missing we fell back to global/EU figures and marked
 *     them `estimated`.
 *   - For binary-ish conditions (e.g. "has driver's license") we use the
 *     unconditional population share, then handle correlations separately in
 *     `correlations.ts`.
 */

export type Confidence = 'measured' | 'estimated';

export interface Criterion {
  id: string;
  label: { en: string; tr: string };
  /** Share of the working-age population (15–64) that satisfies this criterion, 0..1. */
  probability: number;
  source: string;
  confidence: Confidence;
}

export const WORKING_AGE_POPULATION_TR = 53_500_000;
export const WORKING_AGE_POPULATION_GLOBAL = 4_600_000_000;
/** Used for the "1 in N people" headline. */
export const WORKING_AGE_POPULATION = WORKING_AGE_POPULATION_TR;

// ---------------------------------------------------------------------------
// 1. Education
// ---------------------------------------------------------------------------
export const EDUCATION: Criterion[] = [
  {
    id: 'edu_literate',
    label: { en: 'Literate', tr: 'Okuryazar' },
    probability: 0.965,
    source: 'TÜİK Adult Education Survey 2022 (≈96.5% adult literacy)',
    confidence: 'measured',
  },
  {
    id: 'edu_primary',
    label: { en: 'Primary school', tr: 'İlkokul' },
    probability: 0.92,
    source: 'TÜİK 2023 — primary completion among 25–64',
    confidence: 'measured',
  },
  {
    id: 'edu_highschool',
    label: { en: 'High school diploma', tr: 'Lise mezunu' },
    probability: 0.54,
    source: 'TÜİK 2023 — upper-secondary attainment 25–64',
    confidence: 'measured',
  },
  {
    id: 'edu_vocational',
    label: { en: 'Vocational high school', tr: 'Meslek lisesi' },
    probability: 0.21,
    source: 'TÜİK — vocational track share of upper-secondary',
    confidence: 'measured',
  },
  {
    id: 'edu_associates',
    label: { en: "Associate's degree (2yr)", tr: 'Ön lisans' },
    probability: 0.11,
    source: 'TÜİK 2023 — short-cycle tertiary attainment',
    confidence: 'measured',
  },
  {
    id: 'edu_bachelor',
    label: { en: "Bachelor's degree", tr: 'Lisans mezunu' },
    probability: 0.21,
    source: 'TÜİK 2023 — bachelor attainment 25–64',
    confidence: 'measured',
  },
  {
    id: 'edu_master',
    label: { en: "Master's degree", tr: 'Yüksek lisans' },
    probability: 0.045,
    source: 'TÜİK 2023 — master attainment 25–64',
    confidence: 'measured',
  },
  {
    id: 'edu_phd',
    label: { en: 'PhD', tr: 'Doktora' },
    probability: 0.005,
    source: 'TÜİK 2023 — PhD attainment 25–64',
    confidence: 'measured',
  },
  {
    id: 'edu_top10_uni',
    label: {
      en: "Bachelor's from a top-tier university",
      tr: '"Saygın" üniversite mezunu',
    },
    probability: 0.018,
    source: 'Estimated — top-10 TR universities × ~30k grads/yr × 40yr cohort',
    confidence: 'estimated',
  },
];

// ---------------------------------------------------------------------------
// 2. Field of study (mutually-ish exclusive, share of degree holders)
// ---------------------------------------------------------------------------
export const FIELD_OF_STUDY: Criterion[] = [
  {
    id: 'field_cs',
    label: { en: 'CS-adjacent degree', tr: 'Bilgisayar/Bilişim mezunu' },
    probability: 0.06,
    source: 'TÜİK + YÖK Atlas — CS/CE/SE/IS graduates as share of working-age pop',
    confidence: 'measured',
  },
  {
    id: 'field_engineering',
    label: { en: 'Engineering degree', tr: 'Mühendislik mezunu' },
    probability: 0.10,
    source: 'YÖK — engineering faculty graduates share',
    confidence: 'measured',
  },
  {
    id: 'field_business',
    label: { en: 'Business / Economics', tr: 'İşletme / Ekonomi' },
    probability: 0.13,
    source: 'YÖK — business/econ/admin graduates share',
    confidence: 'measured',
  },
  {
    id: 'field_law',
    label: { en: 'Law', tr: 'Hukuk' },
    probability: 0.012,
    source: 'YÖK — law faculty graduates share',
    confidence: 'measured',
  },
  {
    id: 'field_medicine',
    label: { en: 'Medicine', tr: 'Tıp' },
    probability: 0.011,
    source: 'YÖK — medical faculty graduates share',
    confidence: 'measured',
  },
  {
    id: 'field_stem_other',
    label: { en: 'Other STEM (math/physics/chem/bio)', tr: 'Diğer STEM (mat/fiz/kim/biy)' },
    probability: 0.025,
    source: 'YÖK — basic sciences graduates share',
    confidence: 'estimated',
  },
  {
    id: 'field_design',
    label: { en: 'Design / Architecture', tr: 'Tasarım / Mimarlık' },
    probability: 0.018,
    source: 'YÖK — design & architecture graduates share',
    confidence: 'estimated',
  },
];

// ---------------------------------------------------------------------------
// 3. Experience years — we don't store a flat probability, we store a decay
//    function. See engine.ts: experienceProbability(years, age).
//    Here we just expose a sensible upper bound for sanity checks.
// ---------------------------------------------------------------------------
export const EXPERIENCE_REFERENCE = {
  /** Median years of experience among employed working-age adults. */
  medianYears: 8,
  /** Effective floor on remaining working years after education (used by gate). */
  careerStartAge: 22,
  source: 'TÜİK Labour Force 2023 + author estimate of median tenure',
  confidence: 'estimated' as Confidence,
};

// ---------------------------------------------------------------------------
// 4. Hard skills — prevalence among the WORKING-AGE POPULATION (not among
//    devs). A skill that 50% of devs know but only 1% of the population works
//    as a dev ends up at ~0.005 here.
// ---------------------------------------------------------------------------
export const HARD_SKILLS: Criterion[] = [
  // --- Programming languages ------------------------------------------------
  { id: 'skill_python',     label: { en: 'Python',                 tr: 'Python' },                 probability: 0.012, source: 'SO Dev Survey 2024 + 1.2% TR pop as devs', confidence: 'estimated' },
  { id: 'skill_javascript', label: { en: 'JavaScript',             tr: 'JavaScript' },             probability: 0.010, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_typescript', label: { en: 'TypeScript',             tr: 'TypeScript' },             probability: 0.005, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_java',       label: { en: 'Java',                   tr: 'Java' },                   probability: 0.006, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_csharp',     label: { en: 'C#',                     tr: 'C#' },                     probability: 0.004, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_c',          label: { en: 'C',                      tr: 'C' },                      probability: 0.002, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_cpp',        label: { en: 'C++',                    tr: 'C++' },                    probability: 0.002, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_go',         label: { en: 'Go',                     tr: 'Go' },                     probability: 0.0008, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_rust',       label: { en: 'Rust',                   tr: 'Rust' },                   probability: 0.0003, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_php',        label: { en: 'PHP',                    tr: 'PHP' },                    probability: 0.005, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_ruby',       label: { en: 'Ruby',                   tr: 'Ruby' },                   probability: 0.0004, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_swift',      label: { en: 'Swift',                  tr: 'Swift' },                  probability: 0.0004, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_kotlin',     label: { en: 'Kotlin',                 tr: 'Kotlin' },                 probability: 0.0006, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_sql',        label: { en: 'SQL',                    tr: 'SQL' },                    probability: 0.015, source: 'SO Dev Survey 2024 (broad)', confidence: 'estimated' },
  { id: 'skill_r',          label: { en: 'R',                      tr: 'R' },                      probability: 0.0008, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_matlab',     label: { en: 'MATLAB',                 tr: 'MATLAB' },                 probability: 0.0007, source: 'Estimate — engineering/academia', confidence: 'estimated' },
  { id: 'skill_solidity',   label: { en: 'Solidity',               tr: 'Solidity' },               probability: 0.00005, source: 'Estimate — crypto niche', confidence: 'estimated' },

  // --- Frameworks / libraries ----------------------------------------------
  { id: 'skill_react',      label: { en: 'React',                  tr: 'React' },                  probability: 0.004, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_angular',    label: { en: 'Angular',                tr: 'Angular' },                probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_vue',        label: { en: 'Vue',                    tr: 'Vue' },                    probability: 0.0008, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_svelte',     label: { en: 'Svelte',                 tr: 'Svelte' },                 probability: 0.0002, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_nextjs',     label: { en: 'Next.js',                tr: 'Next.js' },                probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_node',       label: { en: 'Node.js',                tr: 'Node.js' },                probability: 0.005, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_django',     label: { en: 'Django',                 tr: 'Django' },                 probability: 0.0007, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_flask',      label: { en: 'Flask',                  tr: 'Flask' },                  probability: 0.0006, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_spring',     label: { en: 'Spring Boot',            tr: 'Spring Boot' },            probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_dotnet',     label: { en: '.NET / .NET Core',       tr: '.NET / .NET Core' },       probability: 0.003, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_express',    label: { en: 'Express',                tr: 'Express' },                probability: 0.002, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_laravel',    label: { en: 'Laravel',                tr: 'Laravel' },                probability: 0.0008, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_tailwind',   label: { en: 'Tailwind CSS',           tr: 'Tailwind CSS' },           probability: 0.0007, source: 'SO Dev Survey 2024', confidence: 'estimated' },

  // --- Cloud / DevOps ------------------------------------------------------
  { id: 'skill_aws',        label: { en: 'AWS',                    tr: 'AWS' },                    probability: 0.003, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_azure',      label: { en: 'Azure',                  tr: 'Azure' },                  probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_gcp',        label: { en: 'GCP',                    tr: 'GCP' },                    probability: 0.0008, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_docker',     label: { en: 'Docker',                 tr: 'Docker' },                 probability: 0.004, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_kubernetes', label: { en: 'Kubernetes',             tr: 'Kubernetes' },             probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_terraform',  label: { en: 'Terraform',              tr: 'Terraform' },              probability: 0.0008, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_ci_cd',      label: { en: 'CI/CD (GitHub Actions / Jenkins)', tr: 'CI/CD (GitHub Actions / Jenkins)' }, probability: 0.003, source: 'Estimate — DevOps workforce', confidence: 'estimated' },
  { id: 'skill_linux',      label: { en: 'Linux admin',            tr: 'Linux yönetimi' },         probability: 0.005, source: 'Estimate — IT workforce', confidence: 'estimated' },
  { id: 'skill_git',        label: { en: 'Git',                    tr: 'Git' },                    probability: 0.015, source: 'Estimate — near-universal among devs', confidence: 'estimated' },

  // --- Data / ML ----------------------------------------------------------
  { id: 'skill_sql_advanced', label: { en: 'Advanced SQL (window fns, perf)', tr: 'İleri SQL (window, performans)' }, probability: 0.004, source: 'Estimate — analyst/engineer overlap', confidence: 'estimated' },
  { id: 'skill_pandas',     label: { en: 'pandas / NumPy',         tr: 'pandas / NumPy' },         probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_spark',      label: { en: 'Apache Spark',           tr: 'Apache Spark' },           probability: 0.0004, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_airflow',    label: { en: 'Airflow',                tr: 'Airflow' },                probability: 0.0002, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_tensorflow', label: { en: 'TensorFlow',             tr: 'TensorFlow' },             probability: 0.0003, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_pytorch',    label: { en: 'PyTorch',                tr: 'PyTorch' },                probability: 0.0003, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_llm_prompt', label: { en: 'LLM prompting / RAG',    tr: 'LLM prompting / RAG' },    probability: 0.002, source: 'Estimate — post-2023 hype', confidence: 'estimated' },

  // --- Mobile / desktop ---------------------------------------------------
  { id: 'skill_android',    label: { en: 'Android (native)',       tr: 'Android (native)' },       probability: 0.0008, source: 'Estimate — mobile workforce', confidence: 'estimated' },
  { id: 'skill_ios',        label: { en: 'iOS (native)',           tr: 'iOS (native)' },           probability: 0.0006, source: 'Estimate — mobile workforce', confidence: 'estimated' },
  { id: 'skill_flutter',    label: { en: 'Flutter',                tr: 'Flutter' },                probability: 0.0006, source: 'Estimate — mobile workforce', confidence: 'estimated' },
  { id: 'skill_react_native', label: { en: 'React Native',         tr: 'React Native' },           probability: 0.0006, source: 'Estimate — mobile workforce', confidence: 'estimated' },

  // --- CAD / engineering tools --------------------------------------------
  { id: 'skill_autocad',    label: { en: 'AutoCAD',                tr: 'AutoCAD' },                probability: 0.0035, source: 'Estimate — engineering workforce', confidence: 'estimated' },
  { id: 'skill_solidworks', label: { en: 'SolidWorks',             tr: 'SolidWorks' },             probability: 0.0012, source: 'Estimate — mechanical engineering', confidence: 'estimated' },
  { id: 'skill_catia',      label: { en: 'CATIA',                  tr: 'CATIA' },                  probability: 0.0003, source: 'Estimate — automotive/aerospace', confidence: 'estimated' },
  { id: 'skill_revit',      label: { en: 'Revit (BIM)',            tr: 'Revit (BIM)' },            probability: 0.0006, source: 'Estimate — AEC workforce', confidence: 'estimated' },

  // --- Accounting / business software -------------------------------------
  { id: 'skill_excel_adv',  label: { en: 'Advanced Excel (PivotTables, VBA)', tr: 'İleri Excel (Pivot, VBA)' }, probability: 0.04, source: 'Estimate — office workforce', confidence: 'estimated' },
  { id: 'skill_sap',        label: { en: 'SAP',                    tr: 'SAP' },                    probability: 0.003, source: 'Estimate — enterprise IT', confidence: 'estimated' },
  { id: 'skill_logo',       label: { en: 'Logo (ERP)',             tr: 'Logo (ERP)' },             probability: 0.002, source: 'Estimate — TR SME accounting', confidence: 'estimated' },
  { id: 'skill_quickbooks', label: { en: 'QuickBooks',             tr: 'QuickBooks' },             probability: 0.0002, source: 'Estimate — US-centric', confidence: 'estimated' },

  // --- Design / creative --------------------------------------------------
  { id: 'skill_figma',      label: { en: 'Figma',                  tr: 'Figma' },                  probability: 0.0015, source: 'SO Dev Survey 2024', confidence: 'estimated' },
  { id: 'skill_photoshop',  label: { en: 'Photoshop',              tr: 'Photoshop' },              probability: 0.012, source: 'Estimate — broad creative workforce', confidence: 'estimated' },
  { id: 'skill_illustrator',label: { en: 'Illustrator',            tr: 'Illustrator' },            probability: 0.005, source: 'Estimate — design workforce', confidence: 'estimated' },
  { id: 'skill_premiere',   label: { en: 'Premiere / video editing', tr: 'Premiere / video kurgu' }, probability: 0.003, source: 'Estimate — creative workforce', confidence: 'estimated' },

  // --- PM / methodologies -------------------------------------------------
  { id: 'skill_agile',      label: { en: 'Agile / Scrum (practical)', tr: 'Agile / Scrum (pratik)' }, probability: 0.008, source: 'Estimate — knowledge workforce', confidence: 'estimated' },
  { id: 'skill_jira',       label: { en: 'Jira',                   tr: 'Jira' },                   probability: 0.006, source: 'Estimate — knowledge workforce', confidence: 'estimated' },
  { id: 'skill_powerbi',    label: { en: 'Power BI',               tr: 'Power BI' },               probability: 0.003, source: 'Estimate — analyst workforce', confidence: 'estimated' },
  { id: 'skill_tableau',    label: { en: 'Tableau',                tr: 'Tableau' },                probability: 0.001, source: 'Estimate — analyst workforce', confidence: 'estimated' },

  // --- Other ---------------------------------------------------------------
  { id: 'skill_salesforce', label: { en: 'Salesforce',             tr: 'Salesforce' },             probability: 0.0008, source: 'Estimate — CRM admins', confidence: 'estimated' },
  { id: 'skill_hubspot',    label: { en: 'HubSpot',                tr: 'HubSpot' },                probability: 0.0003, source: 'Estimate — marketing ops', confidence: 'estimated' },
  { id: 'skill_seo',        label: { en: 'SEO / SEM',              tr: 'SEO / SEM' },              probability: 0.002, source: 'Estimate — marketing workforce', confidence: 'estimated' },
  { id: 'skill_copywriting',label: { en: 'Copywriting (TR+EN)',    tr: 'Metin yazarlığı (TR+EN)' }, probability: 0.003, source: 'Estimate — content workforce', confidence: 'estimated' },
];

// ---------------------------------------------------------------------------
// 5. Languages — CEFR-bucketed, share of working-age population
// ---------------------------------------------------------------------------
export const LANGUAGES: Criterion[] = [
  { id: 'lang_en_a2', label: { en: 'English A2',   tr: 'İngilizce A2' },   probability: 0.20, source: 'Eurobarometer / EF EPI TR estimates', confidence: 'estimated' },
  { id: 'lang_en_b1', label: { en: 'English B1',   tr: 'İngilizce B1' },   probability: 0.12, source: 'Eurobarometer / EF EPI TR estimates', confidence: 'estimated' },
  { id: 'lang_en_b2', label: { en: 'English B2',   tr: 'İngilizce B2' },   probability: 0.06, source: 'Eurobarometer / EF EPI TR estimates', confidence: 'estimated' },
  { id: 'lang_en_c1', label: { en: 'English C1',   tr: 'İngilizce C1' },   probability: 0.022, source: 'Eurobarometer / EF EPI TR estimates', confidence: 'estimated' },
  { id: 'lang_en_c2', label: { en: 'English C2',   tr: 'İngilizce C2' },   probability: 0.006, source: 'Eurobarometer / EF EPI TR estimates', confidence: 'estimated' },

  { id: 'lang_de_a2', label: { en: 'German A2',    tr: 'Almanca A2' },     probability: 0.025, source: 'Goethe-Institut / Eurobarometer', confidence: 'estimated' },
  { id: 'lang_de_b1', label: { en: 'German B1',    tr: 'Almanca B1' },     probability: 0.012, source: 'Goethe-Institut / Eurobarometer', confidence: 'estimated' },
  { id: 'lang_de_b2', label: { en: 'German B2',    tr: 'Almanca B2' },     probability: 0.004, source: 'Goethe-Institut / Eurobarometer', confidence: 'estimated' },
  { id: 'lang_de_c1', label: { en: 'German C1',    tr: 'Almanca C1' },     probability: 0.0015, source: 'Goethe-Institut / Eurobarometer', confidence: 'estimated' },

  { id: 'lang_ar_a2', label: { en: 'Arabic A2',    tr: 'Arapça A2' },      probability: 0.015, source: 'Estimate — TR Arabic speakers', confidence: 'estimated' },
  { id: 'lang_ar_b1', label: { en: 'Arabic B1',    tr: 'Arapça B1' },      probability: 0.006, source: 'Estimate — TR Arabic speakers', confidence: 'estimated' },
  { id: 'lang_ar_b2', label: { en: 'Arabic B2',    tr: 'Arapça B2' },      probability: 0.002, source: 'Estimate — TR Arabic speakers', confidence: 'estimated' },

  { id: 'lang_fr_a2', label: { en: 'French A2',    tr: 'Fransızca A2' },   probability: 0.012, source: 'Eurobarometer', confidence: 'estimated' },
  { id: 'lang_fr_b1', label: { en: 'French B1',    tr: 'Fransızca B1' },   probability: 0.005, source: 'Eurobarometer', confidence: 'estimated' },
  { id: 'lang_fr_b2', label: { en: 'French B2',    tr: 'Fransızca B2' },   probability: 0.0018, source: 'Eurobarometer', confidence: 'estimated' },

  { id: 'lang_ru_a2', label: { en: 'Russian A2',   tr: 'Rusça A2' },       probability: 0.006, source: 'Estimate', confidence: 'estimated' },
  { id: 'lang_ru_b1', label: { en: 'Russian B1',   tr: 'Rusça B1' },       probability: 0.002, source: 'Estimate', confidence: 'estimated' },

  { id: 'lang_es_a2', label: { en: 'Spanish A2',   tr: 'İspanyolca A2' },  probability: 0.003, source: 'Estimate', confidence: 'estimated' },
  { id: 'lang_es_b1', label: { en: 'Spanish B1',   tr: 'İspanyolca B1' },  probability: 0.001, source: 'Estimate', confidence: 'estimated' },
];

// ---------------------------------------------------------------------------
// 6. Certifications
// ---------------------------------------------------------------------------
export const CERTIFICATIONS: Criterion[] = [
  { id: 'cert_pmp',         label: { en: 'PMP',                       tr: 'PMP' },                       probability: 0.0015, source: 'PMI registry — TR PMP holders', confidence: 'measured' },
  { id: 'cert_cpa',         label: { en: 'CPA',                       tr: 'CPA' },                       probability: 0.0006, source: 'Estimate — TR CPA-equivalent', confidence: 'estimated' },
  { id: 'cert_aws_sa',      label: { en: 'AWS Solutions Architect',   tr: 'AWS Solutions Architect' },   probability: 0.0004, source: 'AWS — TR certified population est.', confidence: 'estimated' },
  { id: 'cert_aws_dev',     label: { en: 'AWS Developer Associate',   tr: 'AWS Developer Associate' },   probability: 0.0002, source: 'AWS — TR certified population est.', confidence: 'estimated' },
  { id: 'cert_azure_admin', label: { en: 'Azure Administrator',       tr: 'Azure Administrator' },       probability: 0.0002, source: 'Microsoft — TR certified est.', confidence: 'estimated' },
  { id: 'cert_ccna',        label: { en: 'CCNA',                      tr: 'CCNA' },                      probability: 0.0005, source: 'Cisco — TR certified est.', confidence: 'estimated' },
  { id: 'cert_cka',         label: { en: 'CKA (Kubernetes)',          tr: 'CKA (Kubernetes)' },          probability: 0.00008, source: 'CNCF — TR certified est.', confidence: 'estimated' },
  { id: 'cert_csm',         label: { en: 'Certified ScrumMaster',     tr: 'Certified ScrumMaster' },     probability: 0.001, source: 'Scrum Alliance — TR est.', confidence: 'estimated' },
  { id: 'cert_toefl_100',   label: { en: 'TOEFL ≥ 100',               tr: 'TOEFL ≥ 100' },               probability: 0.004, source: 'ETS — TR test takers est.', confidence: 'estimated' },
  { id: 'cert_ielts_7',     label: { en: 'IELTS ≥ 7.0',               tr: 'IELTS ≥ 7.0' },               probability: 0.003, source: 'British Council — TR est.', confidence: 'estimated' },
  { id: 'cert_forklift',    label: { en: 'Forklift license',          tr: 'Forklift ehliyeti' },         probability: 0.008, source: 'Estimate — logistics workforce', confidence: 'estimated' },
  { id: 'cert_electrical',  label: { en: 'Electrical safety cert.',   tr: 'Elektrik iş güvenliği sertifikası' }, probability: 0.01, source: 'Estimate — industrial workforce', confidence: 'estimated' },
  { id: 'cert_first_aid',   label: { en: 'First aid cert.',           tr: 'İlk yardım sertifikası' },    probability: 0.05, source: 'TÜİK / TR Min. of Health est.', confidence: 'estimated' },
  { id: 'cert_teacher',     label: { en: 'Teaching certificate',      tr: 'Öğretmenlik formasyonu' },    probability: 0.03, source: 'MEB — formation holders est.', confidence: 'estimated' },
];

// ---------------------------------------------------------------------------
// 7. Age range — population share (TÜİK 2023 age pyramid, 15–64 normalized)
// ---------------------------------------------------------------------------
export const AGE_RANGES: Criterion[] = [
  { id: 'age_18_24',  label: { en: '18–24',  tr: '18–24'  }, probability: 0.16, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_25_29',  label: { en: '25–29',  tr: '25–29'  }, probability: 0.13, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_30_34',  label: { en: '30–34',  tr: '30–34'  }, probability: 0.12, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_35_39',  label: { en: '35–39',  tr: '35–39'  }, probability: 0.11, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_40_44',  label: { en: '40–44',  tr: '40–44'  }, probability: 0.10, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_45_49',  label: { en: '45–49',  tr: '45–49'  }, probability: 0.09, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_50_54',  label: { en: '50–54',  tr: '50–54'  }, probability: 0.08, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_55_59',  label: { en: '55–59',  tr: '55–59'  }, probability: 0.07, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
  { id: 'age_60_64',  label: { en: '60–64',  tr: '60–64'  }, probability: 0.06, source: 'TÜİK 2023 age pyramid', confidence: 'measured' },
];

// ---------------------------------------------------------------------------
// 8. Location — share of working-age population that can/will work there.
//    "Remote" here means "has the connectivity + setup + role type to work
//    remotely," not "currently works remotely."
// ---------------------------------------------------------------------------
export const LOCATION: Criterion[] = [
  { id: 'loc_istanbul',  label: { en: 'İstanbul',           tr: 'İstanbul' },           probability: 0.20, source: 'TÜİK 2023 — İstanbul share of pop', confidence: 'measured' },
  { id: 'loc_ankara',    label: { en: 'Ankara',             tr: 'Ankara' },             probability: 0.07, source: 'TÜİK 2023', confidence: 'measured' },
  { id: 'loc_izmir',     label: { en: 'İzmir',              tr: 'İzmir' },              probability: 0.06, source: 'TÜİK 2023', confidence: 'measured' },
  { id: 'loc_bursa',     label: { en: 'Bursa',              tr: 'Bursa' },              probability: 0.03, source: 'TÜİK 2023', confidence: 'measured' },
  { id: 'loc_antalya',   label: { en: 'Antalya',            tr: 'Antalya' },            probability: 0.02, source: 'TÜİK 2023', confidence: 'measured' },
  { id: 'loc_other_tr',  label: { en: 'Other TR city',      tr: 'Diğer TR şehri' },     probability: 0.55, source: 'TÜİK 2023 — residual', confidence: 'measured' },
  { id: 'loc_remote_tr', label: { en: 'Remote (Türkiye)',   tr: 'Uzaktan (Türkiye)' },  probability: 0.025, source: 'Estimate — share of workforce with remote-capable role + setup', confidence: 'estimated' },
  { id: 'loc_remote_global', label: { en: 'Remote (global)', tr: 'Uzaktan (küresel)' }, probability: 0.0005, source: 'Estimate — TR workers hired into global remote roles', confidence: 'estimated' },
  { id: 'loc_relocate_eu', label: { en: 'Willing to relocate to EU', tr: "AB'ye taşınmaya hazır" }, probability: 0.04, source: 'Eurobarometer mobility intent', confidence: 'estimated' },
];

// ---------------------------------------------------------------------------
// 9. Misc — life/admin constraints that postings often treat as free.
// ---------------------------------------------------------------------------
export const MISC: Criterion[] = [
  { id: 'misc_driver_license', label: { en: 'Driver license (B)', tr: 'B sınıfı ehliyet' }, probability: 0.45, source: 'TÜİK — driver license holders 18+', confidence: 'measured' },
  { id: 'misc_own_vehicle',    label: { en: 'Owns a vehicle',     tr: 'Kendi aracı var' },     probability: 0.30, source: 'TÜİK — vehicle ownership per household est.', confidence: 'estimated' },
  { id: 'misc_no_military',    label: { en: 'No military obligation (TR, male)', tr: 'Askerlik yok (TR, erkek)' }, probability: 0.40, source: 'Estimate — TR male pop × completed/exempt share', confidence: 'estimated' },
  { id: 'misc_shift_work',     label: { en: 'Tolerates shift work', tr: 'Vardiyalı çalışmaya uygun' }, probability: 0.18, source: 'Estimate — share willing/able to do shifts', confidence: 'estimated' },
  { id: 'misc_travel_50',      label: { en: 'Willing to travel ≥50% of time', tr: "Zamanının ≥%50'sinde seyahat" }, probability: 0.05, source: 'Estimate — sales/field workforce share', confidence: 'estimated' },
  { id: 'misc_relocate',       label: { en: 'Willing to relocate', tr: 'Taşınmaya hazır' }, probability: 0.08, source: 'Eurobarometer mobility intent', confidence: 'estimated' },
  { id: 'misc_no_smoker',      label: { en: 'Non-smoker',         tr: 'Sigara içmiyor' },       probability: 0.40, source: 'TÜİK — TR adult smoking rate (inverse)', confidence: 'measured' },
  { id: 'misc_married_ok',     label: { en: '"Married preferred" (parental leave exposure)', tr: '"Evli tercih edilir" (doğum izni riski)' }, probability: 0.55, source: 'TÜİK — share married 25–64 (proxy for the bias)', confidence: 'estimated' },
  { id: 'misc_no_kids',        label: { en: '"No children" (implicit bias)', tr: '"Çocuksuz" (örtük önyargı)' }, probability: 0.35, source: 'TÜİK — share 25–64 with no children', confidence: 'estimated' },
  { id: 'misc_overtime',       label: { en: 'Tolerates unpaid overtime', tr: 'Ücretsiz mesaiye uygun' }, probability: 0.30, source: 'Estimate — cultural tolerance proxy', confidence: 'estimated' },
];

// ---------------------------------------------------------------------------
// Convenience: id → criterion lookup table for the engine and the UI.
// ---------------------------------------------------------------------------
export const ALL_CRITERIA: Criterion[] = [
  ...EDUCATION,
  ...FIELD_OF_STUDY,
  ...HARD_SKILLS,
  ...LANGUAGES,
  ...CERTIFICATIONS,
  ...AGE_RANGES,
  ...LOCATION,
  ...MISC,
];

export const CRITERIA_BY_ID: Record<string, Criterion> = Object.fromEntries(
  ALL_CRITERIA.map((c) => [c.id, c]),
);

/** Estimate of the median age of the working-age population — used by the
 *  experience-probability curve when the user does not constrain age. */
export const DEFAULT_AGE = 33;
