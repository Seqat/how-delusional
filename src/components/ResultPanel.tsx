import type { JSX } from 'preact';
import type { EngineResult } from '../lib/engine';
import { oneInN, formatAbsolute, formatPercent } from '../lib/engine';
import type { Dict } from '../i18n/en';
import type { Lang } from '../i18n';
import { Gauge } from './Gauge';

interface Props {
  result: EngineResult;
  t: Dict;
  lang: Lang;
  onOpenModal: () => void;
}

function verdictFor(score: number, impossible: boolean): { key: keyof Dict; color: string } {
  if (impossible || score >= 95) return { key: 'verdict_nonexistent', color: 'var(--tier-6)' };
  if (score >= 85) return { key: 'verdict_unicorn', color: 'var(--tier-5)' };
  if (score >= 65) return { key: 'verdict_delusional', color: 'var(--tier-4)' };
  if (score >= 40) return { key: 'verdict_optimistic', color: 'var(--tier-3)' };
  if (score >= 20) return { key: 'verdict_ambitious', color: 'var(--tier-2)' };
  return { key: 'verdict_reasonable', color: 'var(--tier-1)' };
}

export function ResultPanel({ result, t, lang, onOpenModal }: Props): JSX.Element {
  const { fraction, absolutePeople, delusionScore, impossible, contradictions } = result;
  const v = verdictFor(delusionScore, impossible);
  const verdictName = t[v.key] as string;
  const verdictDescKey = `${v.key}_desc` as keyof Dict;
  const verdictDesc = t[verdictDescKey] as string;

  const pct = formatPercent(fraction);
  const n = oneInN(fraction);
  const oneIn = n === Infinity ? '∞' : formatAbsolute(n);
  const abs = formatAbsolute(absolutePeople);

  return (
    <div class="result-panel">
      <div class="result-headline">
        <div class="result-headline-main">{t.result_headline(pct)}</div>
        <div class="result-headline-sub">
          {impossible
            ? t.result_impossible_sub
            : `${t.result_subtitle(oneIn)} · ≈ ${abs}`}
        </div>
      </div>

      {impossible && (
        <div class="alert alert-impossible">
          <strong>{t.result_impossible}</strong>
          <p>{t.result_impossible_sub}</p>
        </div>
      )}

      <div class="gauge-row">
        <Gauge value={delusionScore} color={v.color} label={t.delusion_label} />
        <div class="verdict">
          <div class="verdict-eyebrow" style={{ color: v.color }}>— verdict —</div>
          <div class="verdict-name" style={{ color: v.color }}>{verdictName}</div>
          <div class="verdict-desc">{verdictDesc}</div>

          <div class="card-export-wrap">
            <button
              type="button"
              class="btn-card-export"
              onClick={onOpenModal}
            >
              🖼️ {t.export_card}
            </button>
          </div>
        </div>
      </div>

      {contradictions.length > 0 && (
        <div class="contradictions">
          <div class="contradictions-title">{t.contradictions_title}</div>
          {contradictions.map((c, i) => (
            <div key={i} class="alert alert-contradiction">{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}
