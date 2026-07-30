import { useState, useMemo, useEffect, useCallback } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  EDUCATION, FIELD_OF_STUDY, HARD_SKILLS, LANGUAGES, CERTIFICATIONS,
  AGE_RANGES, LOCATION, MISC,
} from './data/population';
import { compute, computeEmpty, type EngineInput } from './lib/engine';
import { readStateFromHash, writeStateToHash, encodeState } from './lib/share';
import { DICTS, detectLang, type Lang } from './i18n';
import { InputPanel } from './components/InputPanel';
import { ResultPanel } from './components/ResultPanel';
import { BreakdownChart } from './components/BreakdownChart';
import { CardModal } from './components/CardModal';
import type { Preset } from './data/presets';
import { parseJobPosting } from './lib/parser';

const DATA = {
  education: EDUCATION,
  field: FIELD_OF_STUDY,
  skills: HARD_SKILLS,
  languages: LANGUAGES,
  certs: CERTIFICATIONS,
  age: AGE_RANGES,
  location: LOCATION,
  misc: MISC,
};

export function App(): JSX.Element {
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const t = DICTS[lang];

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const initial = useMemo(() => readStateFromHash(), []);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.selectedIds));
  const [experienceYears, setExperienceYears] = useState<number>(initial.experienceYears);
  const [ageMin, setAgeMin] = useState<number>(initial.ageMin);
  const [ageMax, setAgeMax] = useState<number>(initial.ageMax);
  const [skillSearch, setSkillSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSelected(new Set());
    setExperienceYears(0);
    setAgeMin(0);
    setAgeMax(0);
    setSkillSearch('');
  }, []);

  const handleSelectPreset = useCallback((preset: Preset) => {
    setSelected(new Set(preset.selectedIds));
    setExperienceYears(preset.experienceYears);
    setAgeMin(preset.ageMin);
    setAgeMax(preset.ageMax);
  }, []);

  const handleParseText = useCallback((text: string) => {
    const parsed = parseJobPosting(text);
    if (parsed.selectedIds.length > 0) {
      setSelected(new Set(parsed.selectedIds));
    }
    if (parsed.experienceYears > 0) setExperienceYears(parsed.experienceYears);
    if (parsed.ageMin > 0) setAgeMin(parsed.ageMin);
    if (parsed.ageMax > 0) setAgeMax(parsed.ageMax);
  }, []);

  // Build engine input.
  const input: EngineInput = useMemo(
    () => ({
      selectedIds: [...selected],
      experienceYears,
      ageMin,
      ageMax,
      lang,
    }),
    [selected, experienceYears, ageMin, ageMax, lang],
  );

  // Compute result.
  const result = useMemo(() => {
    if (
      selected.size === 0 &&
      experienceYears === 0 &&
      ageMin === 0 &&
      ageMax === 0
    ) {
      return computeEmpty();
    }
    return compute(input);
  }, [input, selected, experienceYears, ageMin, ageMax]);

  // Sync hash changes (e.g. browser back/forward navigation or manual URL edits)
  useEffect(() => {
    const handleHashChange = () => {
      const stateFromHash = readStateFromHash();
      setSelected(new Set(stateFromHash.selectedIds));
      setExperienceYears(stateFromHash.experienceYears);
      setAgeMin(stateFromHash.ageMin);
      setAgeMax(stateFromHash.ageMax);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persist to URL hash.
  useEffect(() => {
    writeStateToHash(input);
  }, [input]);

  const copyLink = useCallback(async () => {
    const encoded = encodeState(input);
    const shareUrl = `${window.location.origin}${window.location.pathname}#${encoded}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable; fall back to prompt with exact shareUrl.
      window.prompt('Copy this link:', shareUrl);
    }
  }, [input]);

  return (
    <div class="app">
      <header class="header">
        <div class="header-inner">
          <div class="header-text">
            <h1 class="app-title">{t.appTitle}</h1>
            <p class="app-subtitle">{t.appSubtitle}</p>
            <p class="app-tagline">{t.tagline}</p>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="btn btn-theme"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button class="btn btn-lang" onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}>
              {t.langSwitch}
            </button>
            <button class="btn btn-primary" onClick={copyLink}>
              {copied ? t.copied : t.copyLink}
            </button>
          </div>
        </div>
      </header>

      <main class="main">
        <section class="col col-input" aria-label="Requirements">
          <InputPanel
            selected={selected}
            onToggle={toggle}
            experienceYears={experienceYears}
            onExperienceChange={setExperienceYears}
            ageMin={ageMin}
            ageMax={ageMax}
            onAgeMinChange={setAgeMin}
            onAgeMaxChange={setAgeMax}
            lang={lang}
            t={t}
            data={DATA}
            skillSearch={skillSearch}
            onSkillSearch={setSkillSearch}
            onReset={reset}
            onSelectPreset={handleSelectPreset}
            onParseText={handleParseText}
          />
        </section>

        <aside class="col-sticky-sidebar" aria-label="Results & Analysis">
          <section class="col col-result" aria-label="Result">
            <ResultPanel
              result={result}
              t={t}
              lang={lang}
              onOpenModal={() => setShowCardModal(true)}
            />
          </section>

          <section class="col col-breakdown" aria-label="Breakdown">
            <div class="breakdown-head">
              <h2>{t.breakdown_title}</h2>
              <p>{t.breakdown_subtitle}</p>
            </div>
            <BreakdownChart breakdown={result.breakdown} t={t} lang={lang} />
          </section>
        </aside>
      </main>

      <footer class="footer">
        <p>{t.footer_disclaimer}</p>
        <p class="footer-data-note">{t.footer_data_note}</p>
      </footer>

      <CardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        result={result}
        t={t}
        lang={lang}
      />
    </div>
  );
}
