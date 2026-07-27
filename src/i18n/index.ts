import { en } from './en';
import { tr } from './tr';

export type Lang = 'en' | 'tr';

export const DICTS: Record<Lang, typeof en> = { en, tr };

export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('tr')) return 'tr';
  return 'en';
}
