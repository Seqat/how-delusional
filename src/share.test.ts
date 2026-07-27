import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from './lib/share';

describe('share.ts URL state codec', () => {
  it('encodes and decodes valid input correctly', () => {
    const state = {
      selectedIds: ['edu_bachelor', 'skill_python'],
      experienceYears: 5,
      ageMin: 21,
      ageMax: 30,
    };
    const b64 = encodeState(state);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);

    const decoded = decodeState(b64);
    expect(decoded.selectedIds).toEqual(['edu_bachelor', 'skill_python']);
    expect(decoded.experienceYears).toBe(5);
    expect(decoded.ageMin).toBe(21);
    expect(decoded.ageMax).toBe(30);
  });

  it('handles empty or malformed hash gracefully without throwing', () => {
    expect(decodeState('')).toEqual({ selectedIds: [], experienceYears: 0, ageMin: 0, ageMax: 0 });
    expect(decodeState('invalid_base64_!@#$%^&*')).toEqual({ selectedIds: [], experienceYears: 0, ageMin: 0, ageMax: 0 });
    expect(decodeState('WzE2Miw0NTNd')).toEqual({ selectedIds: [], experienceYears: 0, ageMin: 0, ageMax: 0 });
  });

  it('sanitizes extreme/negative numeric values and invalid criteria IDs', () => {
    const maliciousJson = JSON.stringify([['fake_id_123', 'edu_bachelor'], -100, 999, 'not_a_number']);
    const b64 = btoa(maliciousJson);
    const decoded = decodeState(b64);

    expect(decoded.selectedIds).toEqual(['edu_bachelor']);
    expect(decoded.experienceYears).toBe(0);
    expect(decoded.ageMin).toBe(80);
    expect(decoded.ageMax).toBe(0);
  });
});
