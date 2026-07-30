import { describe, it, expect } from 'vitest';
import { parseJobPosting } from './lib/parser';

describe('parseJobPosting', () => {
  it('extracts skills, experience, and age from a Turkish job description', () => {
    const text = `
      Şirketimiz bünyesinde çalışacak Full-Stack Yazılımcı aranıyor.
      - Lisans mezunu (Tercihen Bilgisayar Mühendisliği)
      - En az 5 yıl tecrübe
      - React, Node, Python ve Docker bilen
      - İleri seviye İngilizce (C1)
      - Maksimum yaş 28
    `;
    const result = parseJobPosting(text);
    expect(result.experienceYears).toBe(5);
    expect(result.ageMax).toBe(28);
    expect(result.selectedIds).toContain('edu_bachelor');
    expect(result.selectedIds).toContain('field_cs');
    expect(result.selectedIds).toContain('skill_react');
    expect(result.selectedIds).toContain('skill_node');
    expect(result.selectedIds).toContain('skill_python');
    expect(result.selectedIds).toContain('skill_docker');
    expect(result.selectedIds).toContain('lang_en_c1');
  });

  it('extracts skills and experience from an English job description', () => {
    const text = `
      Senior Backend Engineer needed with 8+ years of experience.
      Requirements:
      - Master's degree in Engineering
      - Strong knowledge of TypeScript, Kubernetes, and AWS
      - PMP certification is a plus
    `;
    const result = parseJobPosting(text);
    expect(result.experienceYears).toBe(8);
    expect(result.selectedIds).toContain('edu_master');
    expect(result.selectedIds).toContain('field_engineering');
    expect(result.selectedIds).toContain('skill_typescript');
    expect(result.selectedIds).toContain('skill_kubernetes');
    expect(result.selectedIds).toContain('skill_aws');
    expect(result.selectedIds).toContain('cert_pmp');
  });
});

describe('parseJobPosting — whole-word matching', () => {
  it('does not read "JavaScript" as Java', () => {
    const r = parseJobPosting('Looking for a JavaScript developer.');
    expect(r.selectedIds).toContain('skill_javascript');
    expect(r.selectedIds).not.toContain('skill_java');
  });

  it('still finds Java when it stands on its own', () => {
    const r = parseJobPosting('Java ve Spring Boot deneyimi olan.');
    expect(r.selectedIds).toContain('skill_java');
    expect(r.selectedIds).toContain('skill_spring');
  });

  it('maps .NET to the framework, which implies C# downstream', () => {
    const r = parseJobPosting('Strong .NET Core background required.');
    expect(r.selectedIds).toContain('skill_dotnet');
  });

  it('does not fire on substrings buried inside other words', () => {
    // "ba" (bachelor), "ts" (typescript) and "go" used to match here.
    const r = parseJobPosting('Database administration and Google Workspace.');
    expect(r.selectedIds).not.toContain('edu_bachelor');
    expect(r.selectedIds).not.toContain('skill_typescript');
    expect(r.selectedIds).not.toContain('skill_go');
  });

  it('still matches Turkish stems through their suffixes', () => {
    const r = parseJobPosting('Bilgisayar Mühendisliğinden mezun, ehliyeti olan.');
    expect(r.selectedIds).toContain('field_cs');
    expect(r.selectedIds).toContain('misc_driver_license');
  });
});
