import { ALL_CRITERIA, Criterion } from '../data/population';

export interface ParsedJobPosting {
  selectedIds: string[];
  experienceYears: number;
  ageMin: number;
  ageMax: number;
}

/**
 * Keyword map for criteria aliases that might appear in raw job descriptions.
 * Helps map variations like "JS", "TypeScript", "BSc", "Lisans", "Yüksek Lisans",
 * "Python", "Kubernetes", "AWS", etc.
 */
const ALIAS_MAP: Record<string, string[]> = {
  edu_bachelor: ['bachelor', 'b.s.', 'bs', 'b.a.', 'ba', 'lisans', 'üniversite mezun', 'bachelors'],
  edu_master: ['master', 'm.s.', 'ms', 'm.a.', 'ma', 'yüksek lisans', 'tezli', 'masters'],
  edu_phd: ['phd', 'ph.d.', 'doktora', 'doctorate'],
  field_cs: ['computer science', 'bilgisayar mühendisliğ', 'yazılım mühendisliğ', 'bilişim', 'bilgisayar ve öğretim', 'software engineering', 'information systems'],
  field_engineering: ['engineering', 'mühendislik', 'mühendis'],
  field_business: ['business', 'işletme', 'ekonomi', 'economics', 'finance', 'finans'],
  field_design: ['design', 'tasarım', 'grafik', 'graphic', 'visual design'],
  skill_python: ['python', 'py'],
  skill_javascript: ['javascript', 'js'],
  skill_typescript: ['typescript', 'ts'],
  skill_react: ['react', 'reactjs', 'react.js'],
  skill_node: ['node', 'nodejs', 'node.js'],
  skill_java: ['java'],
  skill_csharp: ['c#', 'c-sharp', 'c sharp', '.net', 'dotnet'],
  skill_cpp: ['c++', 'cpp'],
  skill_go: ['golang', 'go language'],
  skill_rust: ['rust'],
  skill_sql: ['sql', 'postgres', 'postgresql', 'mysql'],
  skill_aws: ['aws', 'amazon web services'],
  skill_docker: ['docker', 'container'],
  skill_kubernetes: ['k8s', 'kubernetes'],
  skill_figma: ['figma'],
  skill_git: ['git', 'github', 'gitlab'],
  lang_en_b1: ['b1 english', 'b1 ingilizce', 'b1 ingilizce', 'orta seviye ingilizce', 'b1'],
  lang_en_b2: ['b2 english', 'b2 ingilizce', 'iyi seviye ingilizce', 'fluent english', 'akıcı ingilizce', 'b2'],
  lang_en_c1: ['c1 english', 'c1 ingilizce', 'ileri seviye ingilizce', 'excellent english', 'advanced english', 'c1'],
  lang_en_c2: ['c2 english', 'c2 ingilizce', 'native english', 'ana dili ingilizce', 'c2'],
  cert_pmp: ['pmp'],
  cert_aws_sa: ['aws certified', 'aws solution architect', 'aws architecture'],
  cert_toefl_100: ['toefl'],
  cert_ielts_7: ['ielts'],
  loc_istanbul: ['istanbul', 'İstanbul'],
  loc_ankara: ['ankara'],
  loc_izmir: ['izmir', 'İzmir'],
  loc_remote_tr: ['remote', 'uzaktan', 'evden çalışma', 'hibrit', 'hybrid'],
  misc_driver_license: ['ehliyet', 'driver license', 'b sınıfı'],
  misc_no_military: ['askerlik', 'askerliğini yapmış', 'askerlikle ilişiği olmayan'],
};

function normalizeText(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/i\u0307/g, 'i');
}

export function parseJobPosting(text: string): ParsedJobPosting {
  const normalized = normalizeText(text);
  const foundIds = new Set<string>();

  // 1. Check alias dictionary
  for (const [id, aliases] of Object.entries(ALIAS_MAP)) {
    for (const alias of aliases) {
      if (normalized.includes(alias.toLowerCase())) {
        foundIds.add(id);
        break;
      }
    }
  }

  // 2. Check label matches in population.ts
  for (const c of ALL_CRITERIA) {
    if (foundIds.has(c.id)) continue;
    const enLabel = c.label.en.toLowerCase();
    const trLabel = c.label.tr.toLowerCase();
    if (
      (enLabel.length > 3 && normalized.includes(enLabel)) ||
      (trLabel.length > 3 && normalized.includes(trLabel))
    ) {
      foundIds.add(c.id);
    }
  }

  // 3. Extract experience years using regex
  // Patterns like "5+ years", "3 - 5 yıl", "min 4 yıl tecrübe", "at least 6 years of experience"
  let experienceYears = 0;
  const expMatch =
    normalized.match(/(\d+)\s*\+?\s*(?:-\s*\d+)?\s*(?:years?|yıl|yil)\s*(?:of\s*)?(?:experience|deneyim|tecrübe)?/) ||
    normalized.match(/(?:deneyim|tecrübe|experience)\s*:?\s*(\d+)\s*(?:years?|yıl|yil)?/);
  if (expMatch && expMatch[1]) {
    const parsed = parseInt(expMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 40) {
      experienceYears = parsed;
    }
  }

  // 4. Extract max age constraint
  // Patterns like "max 25 age", "maksimum yaş 28", "yaş sınırı 28", "under 30 years old"
  let ageMax = 0;
  const ageMaxMatch =
    normalized.match(/(?:maksimum|maximum|max|maks)\s*(?:yaş|age)?\s*:?\s*(\d+)/i) ||
    normalized.match(/(?:yaş|age)\s*(?:sınırı|limiti|maks|max|maximum)?\s*:?\s*(\d+)/i) ||
    normalized.match(/(\d+)\s*(?:yaşından|yaş)\s*(?:küçük|altı|maks|max)/i);
  if (ageMaxMatch && ageMaxMatch[1]) {
    const parsed = parseInt(ageMaxMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 18 && parsed <= 70) {
      ageMax = parsed;
    }
  }

  // 5. Extract min age constraint
  let ageMin = 0;
  const ageMinMatch = normalized.match(/(?:min|minimum)\s*(?:age|yaş)\s*:?\s*(\d+)/);
  if (ageMinMatch && ageMinMatch[1]) {
    const parsed = parseInt(ageMinMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 18 && parsed <= 70) {
      ageMin = parsed;
    }
  }

  return {
    selectedIds: Array.from(foundIds),
    experienceYears,
    ageMin,
    ageMax,
  };
}
