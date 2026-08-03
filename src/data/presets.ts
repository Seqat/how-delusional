export interface Preset {
  id: string;
  name: { en: string; tr: string };
  description: { en: string; tr: string };
  selectedIds: string[];
  experienceYears: number;
  ageMin: number;
  ageMax: number;
}

export const PRESETS: Preset[] = [
  {
    id: 'junior_unicorn',
    name: {
      en: '🦄 "Entry-Level" Full-Stack Unicorn',
      tr: '🦄 "Giriş Seviyesi" Full-Stack Efsanesi',
    },
    description: {
      en: '5 years experience required, max age 25, must know React, Node, AWS, Python, and C1 English.',
      tr: '5 yıl tecrübe aranıyor, maksimum yaş 25, React, Node, AWS, Python ve C1 İngilizce bilmeli.',
    },
    selectedIds: [
      'edu_bachelor',
      'field_cs',
      'skill_typescript',
      'skill_react',
      'skill_node',
      'skill_python',
      'skill_aws',
      'skill_docker',
      'lang_en_c1',
    ],
    experienceYears: 5,
    ageMin: 21,
    ageMax: 25,
  },
  {
    id: 'corporate_overlord',
    name: {
      en: '🧙‍♂️ Corporate Tech Architect & Director',
      tr: '🧙‍♂️ Kurumsal Mimarlık & Yönetici İlanı',
    },
    description: {
      en: '10 years experience, PMP, AWS SA, Master degree, C2 English, Kubernetes, SQL, SAP.',
      tr: '10 yıl tecrübe, PMP, AWS SA, Yüksek Lisans, C2 İngilizce, Kubernetes, SQL, SAP.',
    },
    selectedIds: [
      'edu_master',
      'field_cs',
      'skill_kubernetes',
      'skill_aws',
      'skill_sql_advanced',
      'skill_sap',
      'cert_pmp',
      'cert_aws_sa',
      'lang_en_c2',
      'loc_istanbul',
    ],
    experienceYears: 10,
    ageMin: 30,
    ageMax: 45,
  },
  {
    id: 'entry_phd',
    name: {
      en: '🔬 "Junior" AI Scientist (PhD Required)',
      tr: '🔬 "Junior" Yapay Zeka Uzmanı (Doktoralı)',
    },
    description: {
      en: 'PhD in CS, PyTorch, C++, CUDA, 8 years experience, TOEFL 100+, age max 28.',
      tr: 'Bilgisayar Bilimlerinde Doktora, PyTorch, C++, CUDA, 8 yıl deneyim, TOEFL 100+, maks yaş 28.',
    },
    selectedIds: [
      'edu_phd',
      'field_cs',
      'skill_python',
      'skill_cpp',
      'cert_toefl_100',
      'lang_en_c1',
    ],
    experienceYears: 8,
    ageMin: 22,
    ageMax: 28,
  },
  {
    id: 'reasonable_dev',
    name: {
      en: '✅ Realistic Mid-Level Developer',
      tr: '✅ Gerçekçi Mid-Level Yazılımcı',
    },
    description: {
      en: 'Bachelor degree, 3 years experience, JavaScript, Git, B1 English.',
      tr: 'Lisans mezunu, 3 yıl deneyim, JavaScript, Git, B1 İngilizce.',
    },
    selectedIds: [
      'edu_bachelor',
      'skill_javascript',
      'skill_git',
      'lang_en_b1',
    ],
    experienceYears: 3,
    ageMin: 0,
    ageMax: 0,
  },
];
