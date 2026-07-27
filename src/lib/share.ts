/**
 * share.ts — URL-hash codec for criteria state.
 *
 * Compact format: base64 of a minimal JSON array.
 * We use the array form (not object) to keep keys short, and we strip any
 * default-valued fields. Decoding is forgiving and strictly sanitized: malformed input → empty state.
 */

import type { EngineInput } from './engine';
import { CRITERIA_BY_ID } from '../data/population';

const EMPTY: EngineInput = {
  selectedIds: [],
  experienceYears: 0,
  ageMin: 0,
  ageMax: 0,
};

function utf8ToBase64(str: string): string {
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  }
  return typeof Buffer !== 'undefined'
    ? Buffer.from(str, 'utf8').toString('base64')
    : '';
}

function base64ToUtf8(b64: string): string {
  if (typeof TextDecoder !== 'undefined' && typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return typeof Buffer !== 'undefined'
    ? Buffer.from(b64, 'base64').toString('utf8')
    : '';
}

/** Encode the engine input into a URL-safe base64 string. */
export function encodeState(s: EngineInput): string {
  // Sanitize numeric inputs before encoding
  const cleanExp = Math.max(0, Math.min(50, Math.floor(s.experienceYears || 0)));
  const cleanAgeMin = Math.max(0, Math.min(80, Math.floor(s.ageMin || 0)));
  const cleanAgeMax = Math.max(0, Math.min(80, Math.floor(s.ageMax || 0)));
  const cleanIds = (s.selectedIds || []).filter((id) => Boolean(CRITERIA_BY_ID[id]));

  const compact = [cleanIds, cleanExp, cleanAgeMin, cleanAgeMax];
  try {
    const json = JSON.stringify(compact);
    const b64 = utf8ToBase64(json);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

/** Decode a base64 string back into engine input. Tolerates malformed input. */
export function decodeState(hash: string): EngineInput {
  if (!hash || typeof hash !== 'string') return { ...EMPTY };
  try {
    let b64 = hash.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = base64ToUtf8(b64);
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || !Array.isArray(arr[0])) return { ...EMPTY };

    const [selectedIds, experienceYears, ageMin, ageMax] = arr;

    const validIds = Array.isArray(selectedIds)
      ? selectedIds.filter(
          (x: unknown): x is string => typeof x === 'string' && Boolean(CRITERIA_BY_ID[x]),
        )
      : [];

    const sanitizeNum = (val: unknown, min: number, max: number): number => {
      if (typeof val !== 'number' || !isFinite(val) || isNaN(val)) return 0;
      return Math.max(min, Math.min(max, Math.floor(val)));
    };

    return {
      selectedIds: validIds,
      experienceYears: sanitizeNum(experienceYears, 0, 50),
      ageMin: sanitizeNum(ageMin, 0, 80),
      ageMax: sanitizeNum(ageMax, 0, 80),
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Read state from window.location.hash on initial load. SSR-safe. */
export function readStateFromHash(): EngineInput {
  if (typeof window === 'undefined') return { ...EMPTY };
  const raw = window.location.hash.replace(/^#/, '');
  return decodeState(raw);
}

/** Push state into window.location.hash without scrolling. */
export function writeStateToHash(s: EngineInput): void {
  if (typeof window === 'undefined') return;
  const encoded = encodeState(s);
  const newHash = `#${encoded}`;
  if (window.location.hash !== newHash) {
    // Use replaceState to avoid filling the browser history.
    const url = `${window.location.pathname}${window.location.search}${newHash}`;
    window.history.replaceState(null, '', url);
  }
}
