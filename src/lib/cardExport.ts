import type { EngineResult } from './engine';
import { oneInN, formatAbsolute, formatPercent } from './engine';
import type { Dict } from '../i18n/en';

function verdictForScore(score: number, impossible: boolean): { nameKey: keyof Dict; color: string } {
  if (impossible || score >= 95) return { nameKey: 'verdict_nonexistent', color: '#f43f5e' };
  if (score >= 85) return { nameKey: 'verdict_unicorn', color: '#a855f7' };
  if (score >= 65) return { nameKey: 'verdict_delusional', color: '#f97316' };
  if (score >= 40) return { nameKey: 'verdict_optimistic', color: '#eab308' };
  if (score >= 20) return { nameKey: 'verdict_ambitious', color: '#06b6d4' };
  return { nameKey: 'verdict_reasonable', color: '#10b981' };
}

export async function generateShareCard(
  result: EngineResult,
  t: Dict,
  lang: 'en' | 'tr',
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const { fraction, delusionScore, impossible, breakdown } = result;
  const v = verdictForScore(delusionScore, impossible);
  const verdictName = t[v.nameKey] as string;

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Subtle grid pattern accent
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 630);
    ctx.stroke();
  }
  for (let y = 0; y < 630; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // 3. Header Branding
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('HOW DELUSIONAL IS THIS JOB OFFER?', 60, 65);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 16px system-ui, sans-serif';
  ctx.fillText(
    lang === 'en'
      ? 'A statistically-honest estimator of unrealistic job posting requirements.'
      : 'İş ilanlarının ne kadar gerçek dışı olduğunu tahmin eden istatistiksel hesaplayıcı.',
    60,
    95,
  );

  // 4. Large Score Card Container (Left side)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(60, 130, 650, 430, 20);
  ctx.fill();
  ctx.stroke();

  // 5. Delusion Score Badge
  ctx.fillStyle = v.color;
  ctx.font = '800 84px system-ui, sans-serif';
  const scoreStr = delusionScore.toFixed(0);
  ctx.fillText(scoreStr, 100, 240);

  const scoreWidth = ctx.measureText(scoreStr).width;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('/ 100', 100 + scoreWidth + 12, 205);

  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('DELUSION SCORE', 100 + scoreWidth + 12, 232);

  // 6. Verdict title & description
  ctx.fillStyle = v.color;
  ctx.font = '700 38px system-ui, sans-serif';
  ctx.fillText(verdictName, 100, 310);

  // 7. Qualify Headline (2 lines to prevent text overflow in extreme 1-in-N cases)
  const pctStr = formatPercent(fraction);
  const n = oneInN(fraction);
  let oneInStr = n === Infinity ? '∞' : formatAbsolute(n);
  if (oneInStr.length > 28) {
    oneInStr = oneInStr.slice(0, 25) + '…';
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 24px system-ui, sans-serif';
  const line1 = impossible
    ? t.result_impossible
    : `${pctStr} ${lang === 'en' ? 'of workforce qualifies' : 'işgücü karşılıyor'}`;
  ctx.fillText(line1, 100, 365);

  if (!impossible) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 18px system-ui, sans-serif';
    ctx.fillText(`(1 in ${oneInStr})`, 100, 398);
  }

  // 8. Requirements Breakdown Container (Right side)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(740, 130, 400, 430, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(
    lang === 'en' ? 'JOB REQUIREMENTS & POOL SHARE' : 'İŞ TANIMI & YÜZDELİK ORANLAR',
    770,
    170,
  );

  if (breakdown.length > 0) {
    const killer = breakdown[0];
    let yPos = 210;

    // Show Killer badge at top of right box
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(770, yPos, 340, 42, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 14px system-ui, sans-serif';
    const killerPrefix = lang === 'en' ? 'Killer Factor' : 'En Çok Daraltan';
    const killerLabelTrimmed = killer.label.length > 16 ? killer.label.slice(0, 15) + '…' : killer.label;
    const killerText = `⚡ ${killerPrefix}: ${killerLabelTrimmed} (-${killer.lostPercent.toFixed(1)}%)`;
    ctx.fillText(killerText, 782, yPos + 26);

    yPos += 58;

    // List top requirements with bullet points and percentages
    const maxEntries = Math.min(6, breakdown.length);
    for (let i = 0; i < maxEntries; i++) {
      const item = breakdown[i];
      const labelTrimmed = item.label.length > 18 ? item.label.slice(0, 17) + '…' : item.label;
      const pctFormatted = formatPercent(item.after);

      // Bullet dot
      ctx.fillStyle = i === 0 ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(782, yPos + 6, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText(labelTrimmed, 796, yPos + 11);

      // Percentage text
      ctx.fillStyle = i === 0 ? '#f59e0b' : '#38bdf8';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(pctFormatted, 1110, yPos + 11);
      ctx.textAlign = 'left';

      yPos += 38;
    }
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillText(
      lang === 'en' ? 'No criteria selected' : 'Henüz şart seçilmedi',
      770,
      220,
    );
  }

  // Footer URL watermark
  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px system-ui, sans-serif';
  ctx.fillText('how-delusional-this-job-offer', 60, 595);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to render canvas to PNG blob'));
    }, 'image/png');
  });
}

export async function copyShareCardToClipboard(
  result: EngineResult,
  t: Dict,
  lang: 'en' | 'tr',
): Promise<boolean> {
  try {
    const blob = await generateShareCard(result, t, lang);
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
  } catch (err) {
    console.error('Clipboard write error:', err);
  }
  return false;
}

export async function downloadShareCard(
  result: EngineResult,
  t: Dict,
  lang: 'en' | 'tr',
): Promise<void> {
  const blob = await generateShareCard(result, t, lang);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `delusion-score-${Math.round(result.delusionScore)}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
