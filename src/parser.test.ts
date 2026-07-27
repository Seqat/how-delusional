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
