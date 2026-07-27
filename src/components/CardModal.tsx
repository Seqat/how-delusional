import { useState, useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import type { EngineResult } from '../lib/engine';
import type { Dict } from '../i18n/en';
import type { Lang } from '../i18n';
import { generateShareCard, copyShareCardToClipboard, downloadShareCard } from '../lib/cardExport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: EngineResult;
  t: Dict;
  lang: Lang;
}

export function CardModal({ isOpen, onClose, result, t, lang }: Props): JSX.Element | null {
  if (!isOpen) return null;

  const [imgUrl, setImgUrl] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    async function loadCard() {
      setLoading(true);
      try {
        const blob = await generateShareCard(result, t, lang);
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setImgUrl(createdUrl);
        }
      } catch (err) {
        console.error('Failed to generate card preview:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCard();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [result, t, lang, onClose]);

  const handleCopy = async () => {
    const copied = await copyShareCardToClipboard(result, t, lang);
    if (copied) {
      setNotice(t.card_copied);
    } else {
      await downloadShareCard(result, t, lang);
      setNotice(t.card_downloaded);
    }
    setTimeout(() => setNotice(''), 2500);
  };

  const handleDownload = async () => {
    await downloadShareCard(result, t, lang);
    setNotice(t.card_downloaded);
    setTimeout(() => setNotice(''), 2500);
  };

  return (
    <div class="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div>
            <h3 id="modal-title" class="modal-title">{t.card_modal_title}</h3>
            <p class="modal-subtitle">{t.card_modal_subtitle}</p>
          </div>
          <button type="button" class="modal-close" onClick={onClose} aria-label={t.btn_close}>
            ×
          </button>
        </div>

        <div class="modal-body">
          {loading ? (
            <div class="modal-loading">Generating card...</div>
          ) : (
            imgUrl && <img src={imgUrl} alt="Delusion Score Card Preview" class="modal-img-preview" />
          )}
        </div>

        <div class="modal-footer">
          {notice && <span class="modal-notice">{notice}</span>}
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick={handleCopy}>
              📋 {t.btn_copy_image}
            </button>
            <button type="button" class="btn btn-primary" onClick={handleDownload}>
              ⬇️ {t.btn_download_image}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
