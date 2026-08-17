const PART_IDS = ['signal', 'action', 'help'];

export function normalizeText(text) {
  return String(text)
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/[^а-яa-z0-9\s-]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(normalizeText(phrase)));
}

export function analyzeAnswer(text, scenario) {
  const normalized = normalizeText(text);
  const checks = {
    signal: includesAny(normalized, scenario?.signals ?? []),
    action: includesAny(normalized, scenario?.actions ?? []),
    help: includesAny(normalized, scenario?.help ?? []),
  };
  const found = PART_IDS.filter((id) => checks[id]);
  const missing = PART_IDS.filter((id) => !checks[id]);
  return { found, missing, complete: missing.length === 0 };
}
