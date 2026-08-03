export const en = {
  appTitle: 'How Delusional Is This Job Offer?',
  appSubtitle: 'Paste the requirements. Get a Delusion Score.',
  tagline: 'A satirical but statistically-honest estimator of how unrealistic a job posting is.',
  langSwitch: 'TR',
  copyLink: 'Copy share link',
  copied: 'Copied!',
  reset: 'Reset',
  verdict_eyebrow: 'verdict',

  // Input panel groups
  group_education: 'Education',
  group_field: 'Field of study',
  group_skills: 'Hard skills',
  group_languages: 'Languages',
  group_certs: 'Certifications',
  group_age: 'Age range',
  group_location: 'Location',
  group_misc: 'Other life/admin constraints',
  group_experience: 'Experience (years)',
  experienceYears: 'Required years of experience',
  ageMin: 'Minimum age (optional)',
  ageMax: 'Maximum age (optional)',
  search: 'Filter skills…',
  clear: 'Clear',

  // Result
  result_headline: (pct: string) => `${pct} of the workforce qualifies`,
  result_subtitle: (oneIn: string) => `roughly 1 in ${oneIn} people`,
  result_impossible: 'This combination is mathematically impossible.',
  result_impossible_sub: 'A person satisfying all of these cannot exist under the laws of time.',
  delusion_label: 'Delusion Score',
  verdict_reasonable: 'Reasonable',
  verdict_reasonable_desc: 'You will actually find these people. Maybe even hire one.',
  verdict_ambitious: 'Ambitious',
  verdict_ambitious_desc: 'Tight but plausible. Be ready to wait, or to compromise.',
  verdict_optimistic: 'Optimistic',
  verdict_optimistic_desc: 'A real person exists. They are not applying to your posting.',
  verdict_delusional: 'Delusional',
  verdict_delusional_desc: 'There are not enough of these people in the country. Pick one.',
  verdict_unicorn: 'Looking for a unicorn',
  verdict_unicorn_desc: 'Unicorns do exist, statistically. There are maybe five. They are employed.',
  verdict_nonexistent: 'This person does not exist',
  verdict_nonexistent_desc: 'Your requirements are mutually exclusive. The math is honest about it.',
  contradictions_title: 'Logical contradictions found',
  subsumed_title: 'Already included',
  subsumed_badge: '⊂',
  subsumed_tooltip: (by: string) => `Already implied by ${by} — not counted twice.`,
  subsumed_note: (list: string) =>
    `${list} — these are prerequisites of something else you selected, so they were counted once, not twice.`,
  subsumed_pair: (id: string, by: string) => `${id} is already implied by ${by}`,

  // Breakdown
  breakdown_title: 'Where the candidate pool went to die',
  breakdown_subtitle: 'Each row is one requirement, sorted by how much it shrank the pool.',
  killer_label: 'The thing that killed your candidate pool:',
  before_label: 'Pool before',
  after_label: 'Pool after',

  // Footer
  footer_disclaimer:
    'Estimates from public statistics. For entertainment and discussion only. Not hiring advice, not legal advice, not a substitute for thinking about your job posting.',
  footer_data_note:
    'All numbers live in src/data/population.ts — edit them if you disagree.',

  // Presets & Job posting parser & Card export
  presets_title: 'Quick Presets',
  presets_subtitle: 'Test with iconic satirical job postings:',
  paste_title: 'Paste Job Posting Text',
  paste_placeholder: 'Paste full job description text here (e.g. from LinkedIn)...',
  paste_action: 'Auto-Detect Requirements',
  paste_success: (count: number) => `Detected ${count} requirements from text!`,
  global_search: 'Search all criteria…',
  export_card: 'Preview Share Card',
  card_copied: 'Card image copied to clipboard!',
  card_downloaded: 'Card image downloaded!',
  card_modal_title: 'Share Card Preview',
  card_modal_subtitle: 'Preview your Delusion Score card before downloading or copying:',
  btn_copy_image: 'Copy Image to Clipboard',
  btn_download_image: 'Download PNG',
  btn_close: 'Close',

  empty_input_hint: 'Nothing selected yet. The entire working-age population qualifies by default.',
};

export type Dict = typeof en;
