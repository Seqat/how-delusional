import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Dict } from '../i18n/en';
import type { Lang } from '../i18n';
import type { Criterion } from '../data/population';
import { PRESETS, Preset } from '../data/presets';

interface GroupProps {
  title: string;
  criteria: Criterion[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  lang: Lang;
  search?: string;
  t: Dict;
  /** subsumed criterion id -> label of the selection that already implies it. */
  subsumedBy: Map<string, string>;
}

function Group({
  title,
  criteria,
  selected,
  onToggle,
  lang,
  search = '',
  t,
  subsumedBy,
}: GroupProps): JSX.Element {
  const filtered = search
    ? criteria.filter(
        (c) =>
          c.label.en.toLowerCase().includes(search.toLowerCase()) ||
          c.label.tr.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase()),
      )
    : criteria;

  if (search && filtered.length === 0) {
    return <span style={{ display: 'none' }} />;
  }

  return (
    <fieldset class="group">
      <legend class="group-title">{title}</legend>
      <div class="chips">
        {filtered.map((c) => {
          const isOn = selected.has(c.id);
          // Selected, but another selection already implies it — the engine
          // counted it once, so say so instead of leaving the chip looking
          // like it is doing work.
          const impliedBy = isOn ? subsumedBy.get(c.id) : undefined;
          const tooltip = `${c.source}\nconfidence: ${c.confidence}\nbase prob: ${(c.probability * 100).toFixed(2)}%`;
          return (
            <button
              key={c.id}
              type="button"
              class={`chip ${isOn ? 'chip-on' : ''} ${impliedBy ? 'chip-subsumed' : ''}`}
              aria-pressed={isOn}
              title={impliedBy ? `${tooltip}\n\n${t.subsumed_tooltip(impliedBy)}` : tooltip}
              onClick={() => onToggle(c.id)}
            >
              <span class="chip-dot" aria-hidden="true">{isOn ? '✓' : ''}</span>
              <span class="chip-text">{c.label[lang]}</span>
              {impliedBy && (
                <span class="chip-subsumed-badge" aria-label={t.subsumed_tooltip(impliedBy)}>
                  {t.subsumed_badge} {impliedBy}
                </span>
              )}
              <span class="chip-prob">{(c.probability * 100).toFixed(c.probability >= 0.01 ? 1 : 2)}%</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface InputPanelProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
  experienceYears: number;
  onExperienceChange: (n: number) => void;
  ageMin: number;
  ageMax: number;
  onAgeMinChange: (n: number) => void;
  onAgeMaxChange: (n: number) => void;
  lang: Lang;
  t: Dict;
  data: {
    education: Criterion[];
    field: Criterion[];
    skills: Criterion[];
    languages: Criterion[];
    certs: Criterion[];
    age: Criterion[];
    location: Criterion[];
    misc: Criterion[];
  };
  skillSearch: string;
  onSkillSearch: (s: string) => void;
  onReset: () => void;
  onSelectPreset: (preset: Preset) => void;
  onParseText: (text: string) => number;
  /** subsumed criterion id -> label of the selection that already implies it. */
  subsumedBy: Map<string, string>;
}

export function InputPanel(props: InputPanelProps): JSX.Element {
  const {
    selected, onToggle, experienceYears, onExperienceChange,
    ageMin, ageMax, onAgeMinChange, onAgeMaxChange,
    lang, t, data, skillSearch, onSkillSearch, onReset,
    onSelectPreset, onParseText, subsumedBy,
  } = props;

  // Shared by every Group; keeps the eight call sites below readable.
  const groupCommon = { selected, onToggle, lang, t, subsumedBy };

  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseNotice, setParseNotice] = useState('');

  const handleParse = () => {
    if (!pasteText.trim()) return;
    const count = onParseText(pasteText);
    setParseNotice(t.paste_success(count));
    setTimeout(() => {
      setParseNotice('');
      setShowPasteBox(false);
    }, 2000);
  };

  return (
    <div class="input-panel">
      <div class="input-panel-head">
        <div class="search-global-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            class="input-search-global"
            placeholder={t.global_search}
            value={skillSearch}
            onInput={(e) => onSkillSearch((e.currentTarget as HTMLInputElement).value)}
          />
          {skillSearch && (
            <button
              type="button"
              class="search-clear-btn"
              onClick={() => onSkillSearch('')}
              aria-label={t.clear}
            >
              ×
            </button>
          )}
        </div>
        <button type="button" class="btn btn-reset" onClick={onReset}>{t.reset}</button>
      </div>

      {/* Presets Row */}
      <div class="presets-section">
        <div class="section-title">{t.presets_title}</div>
        <p class="section-subtitle">{t.presets_subtitle}</p>
        <div class="preset-chips">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              class="preset-chip"
              onClick={() => onSelectPreset(p)}
              title={p.description[lang]}
            >
              {p.name[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Paste Job Text Toggle */}
      <div class="paste-section">
        <button
          type="button"
          class="paste-toggle-btn"
          onClick={() => setShowPasteBox(!showPasteBox)}
        >
          📋 {t.paste_title}
        </button>

        {showPasteBox && (
          <div class="paste-box">
            <textarea
              class="paste-textarea"
              rows={4}
              placeholder={t.paste_placeholder}
              value={pasteText}
              onInput={(e) => setPasteText((e.currentTarget as HTMLTextAreaElement).value)}
            />
            <div class="paste-box-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onClick={handleParse}
              >
                {t.paste_action}
              </button>
              {parseNotice && <span class="paste-notice">{parseNotice}</span>}
            </div>
          </div>
        )}
      </div>

      <fieldset class="group group-experience">
        <legend class="group-title">{t.group_experience}</legend>
        <div class="num-inputs">
          <label htmlFor="input-exp-years">
            <span>{t.experienceYears}</span>
            <input
              id="input-exp-years"
              type="number"
              min={0}
              max={50}
              step={1}
              value={experienceYears || ''}
              onInput={(e) => {
                const raw = (e.currentTarget as HTMLInputElement).value;
                const val = parseInt(raw, 10);
                onExperienceChange(isNaN(val) ? 0 : Math.max(0, Math.min(50, val)));
              }}
            />
          </label>
          <label htmlFor="input-age-min">
            <span>{t.ageMin}</span>
            <input
              id="input-age-min"
              type="number"
              min={0}
              max={80}
              step={1}
              value={ageMin || ''}
              onInput={(e) => {
                const raw = (e.currentTarget as HTMLInputElement).value;
                const val = parseInt(raw, 10);
                onAgeMinChange(isNaN(val) ? 0 : Math.max(0, Math.min(80, val)));
              }}
            />
          </label>
          <label htmlFor="input-age-max">
            <span>{t.ageMax}</span>
            <input
              id="input-age-max"
              type="number"
              min={0}
              max={80}
              step={1}
              value={ageMax || ''}
              onInput={(e) => {
                const raw = (e.currentTarget as HTMLInputElement).value;
                const val = parseInt(raw, 10);
                onAgeMaxChange(isNaN(val) ? 0 : Math.max(0, Math.min(80, val)));
              }}
            />
          </label>
        </div>
      </fieldset>

      <Group title={t.group_education} criteria={data.education} search={skillSearch} {...groupCommon} />

      <Group title={t.group_field} criteria={data.field} search={skillSearch} {...groupCommon} />

      <Group title={t.group_skills} criteria={data.skills} search={skillSearch} {...groupCommon} />

      <Group title={t.group_languages} criteria={data.languages} search={skillSearch} {...groupCommon} />

      <Group title={t.group_certs} criteria={data.certs} search={skillSearch} {...groupCommon} />

      <Group title={t.group_age} criteria={data.age} search={skillSearch} {...groupCommon} />

      <Group title={t.group_location} criteria={data.location} search={skillSearch} {...groupCommon} />

      <Group title={t.group_misc} criteria={data.misc} search={skillSearch} {...groupCommon} />
    </div>
  );
}
