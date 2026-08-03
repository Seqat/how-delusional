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
 *
 * Aliases match on whole words. A trailing `*` marks a STEM, which also matches
 * anything suffixed onto it — necessary for Turkish, where "mühendislik"
 * surfaces as "mühendisliği", "mühendisliğinde", "mühendisliğinden" and so on.
 * Use it only where the stem is long and unambiguous; a short stem like `js*`
 * would swallow half the dictionary.
 */
const ALIAS_MAP: Record<string, string[]> = {
  edu_bachelor: ['bachelor', 'b.s.', 'bs', 'b.a.', 'ba', 'lisans', 'üniversite mezun*', 'bachelors'],
  edu_master: ['master', 'm.s.', 'ms', 'm.a.', 'ma', 'yüksek lisans', 'tezli', 'masters'],
  edu_phd: ['phd', 'ph.d.', 'doktora', 'doctorate'],
  field_cs: ['computer science', 'bilgisayar mühendisliğ*', 'yazılım mühendisliğ*', 'bilişim', 'bilgisayar ve öğretim', 'software engineering', 'information systems'],
  field_engineering: ['engineering', 'mühendis*'],
  field_business: ['business', 'işletme', 'ekonomi*', 'economics', 'finance', 'finans*'],
  field_design: ['design', 'tasarım*', 'grafik*', 'graphic', 'visual design'],
  skill_python: ['python', 'py'],
  skill_javascript: ['javascript', 'js'],
  skill_typescript: ['typescript', 'ts'],
  skill_react: ['react', 'reactjs', 'react.js'],
  skill_nextjs: ['next.js', 'nextjs'],
  skill_angular: ['angular', 'angularjs'],
  skill_vue: ['vue', 'vuejs', 'vue.js'],
  skill_node: ['node', 'nodejs', 'node.js'],
  skill_java: ['java'],
  skill_spring: ['spring boot', 'springboot', 'spring'],
  skill_kotlin: ['kotlin'],
  skill_csharp: ['c#', 'c-sharp', 'c sharp'],
  // .NET implies C# via IMPLICATIONS, so match the framework itself here
  // instead of silently rewriting it into the language.
  skill_dotnet: ['.net', 'dotnet', 'asp.net'],
  skill_cpp: ['c++', 'cpp'],
  skill_go: ['golang', 'go language'],
  skill_rust: ['rust'],
  skill_php: ['php'],
  skill_laravel: ['laravel'],
  skill_swift: ['swift'],
  skill_sql: ['sql', 'postgres', 'postgresql', 'mysql'],
  skill_aws: ['aws', 'amazon web services'],
  skill_docker: ['docker', 'container*'],
  skill_kubernetes: ['k8s', 'kubernetes'],
  skill_terraform: ['terraform'],
  skill_figma: ['figma'],
  skill_git: ['git', 'github', 'gitlab'],
  skill_excel_adv: ['excel', 'pivot', 'vba'],
  skill_sap: ['sap'],
  lang_en_b1: ['b1 english', 'b1 ingilizce', 'orta seviye ingilizce', 'b1'],
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
  misc_driver_license: ['ehliyet*', 'driver license', 'b sınıfı'],
  misc_no_military: ['askerlik*', 'askerliğini yapmış', 'askerlikle ilişiği olmayan'],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_CHAR = /[\p{L}\p{N}]/u;
const boundaryCache = new Map<string, RegExp>();

/**
 * Whole-word containment.
 *
 * Plain `includes()` matches "java" inside "JavaScript", "ba" inside
 * "database" and "ts" inside "arts" — a pasted posting for a JavaScript role
 * used to light up the Java chip and blow the estimate up by a factor of
 * hundreds. We wrap the needle in lookarounds instead.
 *
 * Two needles get no boundary on one side:
 *   - those already starting/ending in punctuation ("c#", "c++", ".net",
 *     "node.js"), where there is no word character for the boundary to hinge
 *     on and requiring one would never match;
 *   - stems marked with a trailing `*`, which must stay open on the right so
 *     Turkish suffixes still attach.
 */
function containsWord(haystack: string, needle: string): boolean {
  if (needle.length === 0) return false;
  let re = boundaryCache.get(needle);
  if (!re) {
    const isStem = needle.endsWith('*');
    const body = isStem ? needle.slice(0, -1) : needle;
    if (body.length === 0) return false;
    const left = WORD_CHAR.test(body[0]) ? '(?<![\\p{L}\\p{N}])' : '';
    const right =
      !isStem && WORD_CHAR.test(body[body.length - 1])
        ? '(?![\\p{L}\\p{N}])'
        : '';
    re = new RegExp(`${left}${escapeRegExp(body)}${right}`, 'u');
    boundaryCache.set(needle, re);
  }
  return re.test(haystack);
}

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

  // 1. Check alias dictionary. Longest alias first so a specific phrase
  // ("spring boot") is tried before the generic one it contains ("spring").
  for (const [id, aliases] of Object.entries(ALIAS_MAP)) {
    const ordered = [...aliases].sort((a, b) => b.length - a.length);
    for (const alias of ordered) {
      if (containsWord(normalized, alias.toLowerCase())) {
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
      (enLabel.length > 3 && containsWord(normalized, enLabel)) ||
      (trLabel.length > 3 && containsWord(normalized, trLabel))
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
