import type { JSX } from 'preact';
import type { BreakdownEntry } from '../lib/engine';
import { formatPercent } from '../lib/engine';
import type { Dict } from '../i18n/en';

interface Props {
  breakdown: BreakdownEntry[];
  t: Dict;
  lang: 'en' | 'tr';
}

/**
 * High-contrast, highly-readable horizontal waterfall chart.
 * Each row is one requirement. Bar length = remaining pool.
 */
export function BreakdownChart({ breakdown, t, lang }: Props): JSX.Element {
  if (breakdown.length === 0) {
    return (
      <div class="breakdown-empty">{t.empty_input_hint}</div>
    );
  }

  const killer = breakdown[0];
  const killerLabel = killer ? killer.label : '';

  const ROW_H = 36;
  const LABEL_W = 210;
  const BAR_W = 320;
  const GAP = 12;
  const totalH = breakdown.length * (ROW_H + GAP) + 20;

  const trim = (s: string, n = 26) =>
    s.length > n ? s.slice(0, n - 1) + '…' : s;

  return (
    <div class="breakdown">
      <svg
        viewBox={`0 0 ${LABEL_W + BAR_W + 140} ${totalH}`}
        class="breakdown-svg"
        role="img"
        aria-label={t.breakdown_title}
      >
        {breakdown.map((row, i) => {
          const y = i * (ROW_H + GAP) + 8;
          const isKiller = row.id === killer?.id;
          const barLen = Math.max(3, row.after * BAR_W);
          const lostLen = (row.before - row.after) * BAR_W;

          return (
            <g key={row.id} class="bd-row">
              {/* Requirement Text Label */}
              <text
                x={LABEL_W - 10}
                y={y + ROW_H / 2 + 5}
                text-anchor="end"
                class={`bd-label ${isKiller ? 'bd-label-killer' : ''}`}
                font-size="14"
                font-weight={isKiller ? '700' : '600'}
                fill={isKiller ? '#f59e0b' : '#f8fafc'}
              >
                {trim(row.label)}
              </text>

              {/* Background Track */}
              <rect
                x={LABEL_W}
                y={y}
                width={BAR_W}
                height={ROW_H}
                fill="#1e293b"
                rx={6}
              />

              {/* Lost Portion (Red/Orange) */}
              <rect
                x={LABEL_W}
                y={y}
                width={lostLen}
                height={ROW_H}
                fill={isKiller ? 'rgba(239, 68, 68, 0.55)' : 'rgba(239, 68, 68, 0.25)'}
                rx={6}
              />

              {/* Surviving Portion (Green / Highlight) */}
              <rect
                x={LABEL_W}
                y={y}
                width={barLen}
                height={ROW_H}
                fill={isKiller ? '#f97316' : '#10b981'}
                rx={6}
              />

              {/* Percentage Label */}
              <text
                x={LABEL_W + BAR_W + 12}
                y={y + ROW_H / 2 + 5}
                class={`bd-pct ${isKiller ? 'bd-pct-killer' : ''}`}
                font-size="14"
                font-weight="700"
                fill={isKiller ? '#f59e0b' : '#38bdf8'}
              >
                {formatPercent(row.after)}
              </text>
            </g>
          );
        })}
      </svg>

      {killer && (
        <div class="killer-callout">
          <div class="killer-eyebrow">{t.killer_label}</div>
          <div class="killer-name">{killerLabel}</div>
          <div class="killer-meta">
            {lang === 'en'
              ? `Cut the pool by -${killer.lostPercent.toFixed(1)}% in one step.`
              : `Havuzu tek adımda %${killer.lostPercent.toFixed(1)} daralttı.`}
          </div>
        </div>
      )}
    </div>
  );
}
