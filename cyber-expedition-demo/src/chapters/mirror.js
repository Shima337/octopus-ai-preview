export const MIRROR_DETAILS = [
  { id: 'school-sign', category: 'school', risky: true },
  { id: 'geotag', category: 'location', risky: true },
  { id: 'pass-card', category: 'identity', risky: true },
  { id: 'house-number', category: 'address', risky: true },
  { id: 'cat', category: 'subject', risky: false },
  { id: 'cloud', category: 'background', risky: false },
];

export const MIRROR_CAPTIONS = [
  { id: 'after-school', label: 'После уроков у школы «Радуга»', safe: false },
  { id: 'near-home', label: 'Гуляю рядом с домом № 24', safe: false },
  { id: 'cat-day', label: 'Отличный день для фото с Барсиком! 🐈', safe: true },
];

const DETAIL_IDS = new Set(MIRROR_DETAILS.map((item) => item.id));
const CAPTION_IDS = new Set(MIRROR_CAPTIONS.map((item) => item.id));
const DETAIL_LABELS = {
  'school-sign': 'Вывеска «Школа Радуга»',
  geotag: 'Геометка «Зеркальный сад»',
  'pass-card': 'Учебный пропуск',
  'house-number': 'Номер дома 24',
  cat: 'Кот Барсик',
  cloud: 'Облако',
};
const DETAIL_ICONS = {
  'school-sign': '🏫', geotag: '📍', 'pass-card': '🪪',
  'house-number': '🏠', cat: '🐈', cloud: '☁️',
};

export function createMirrorState() {
  return { selectedDetails: [], captionId: null, submitted: false };
}

export function updateMirror(state, event) {
  const current = normalizeMirrorState(state);
  if (!event?.type) return current;

  if (event.type === 'TOGGLE_DETAIL' && DETAIL_IDS.has(event.detailId)) {
    const selected = new Set(current.selectedDetails);
    if (selected.has(event.detailId)) selected.delete(event.detailId);
    else selected.add(event.detailId);
    return { ...current, selectedDetails: [...selected], submitted: false };
  }

  if (event.type === 'CHOOSE_CAPTION' && CAPTION_IDS.has(event.captionId)) {
    return { ...current, captionId: event.captionId, submitted: false };
  }

  if (event.type === 'SUBMIT_MIRROR') return { ...current, submitted: true };
  return current;
}

export function evaluateMirror(state) {
  const current = normalizeMirrorState(state);
  const risky = MIRROR_DETAILS.filter((item) => item.risky);
  const missed = risky.filter((item) => !current.selectedDetails.includes(item.id));
  const safeCaption = current.captionId === 'cat-day';

  return {
    complete: missed.length === 0 && safeCaption,
    found: risky.length - missed.length,
    missed: missed.map((item) => item.id),
    safeCaption,
    hint: missed.length === 0 && safeCaption ? null : hintFor(missed[0]),
  };
}

export function renderMirror(state) {
  const current = normalizeMirrorState(state);
  const result = evaluateMirror(current);
  const hotspots = MIRROR_DETAILS.map((detail) => {
    const selected = current.selectedDetails.includes(detail.id);
    return `
      <button class="mirror-hotspot mirror-hotspot--${detail.id}${selected ? ' mirror-hotspot--selected' : ''}"
        type="button" data-action="TOGGLE_MIRROR_DETAIL" data-mirror-detail="${detail.id}"
        aria-pressed="${selected}">
        <span class="mirror-hotspot__icon" aria-hidden="true">${DETAIL_ICONS[detail.id]}</span>
        <span>${DETAIL_LABELS[detail.id]}</span>
        <span class="mirror-hotspot__mark" aria-hidden="true">${selected ? '✓' : '+'}</span>
      </button>`;
  }).join('');
  const captions = MIRROR_CAPTIONS.map((caption) => {
    const selected = current.captionId === caption.id;
    return `
      <button class="mirror-caption${selected ? ' mirror-caption--selected' : ''}" type="button"
        data-action="CHOOSE_MIRROR_CAPTION" data-mirror-caption="${caption.id}" aria-pressed="${selected}">
        <span class="mirror-caption__radio" aria-hidden="true">${selected ? '●' : '○'}</span>
        <span>${caption.label}</span>
      </button>`;
  }).join('');
  const feedback = current.submitted && !result.complete
    ? `<div class="mirror-hint" data-mirror-hint role="status"><span aria-hidden="true">💡</span><p><strong>Почти!</strong> ${result.hint}</p></div>`
    : '';

  return `
    <section class="mirror-game" data-screen="mirror">
      <div class="mirror-game__intro">
        <p class="eyebrow">Зеркальный сад · Задание 1</p>
        <h1>Собери безопасный пост</h1>
        <p class="lead">Нажми на детали, по которым можно узнать, где ты учишься или живёшь. Нейтральные детали тоже можно выбирать.</p>
      </div>

      <div class="mirror-workspace">
        <div class="mirror-post" aria-label="Вымышленный учебный макет публикации">
          <div class="mirror-post__top">
            <span class="mirror-post__avatar" aria-hidden="true">🧑‍🚀</span>
            <p><strong>Киберследопыт</strong><br><span>Учебный пост · всё вымышлено</span></p>
          </div>
          <div class="mirror-photo">
            <span class="mirror-photo__sun" aria-hidden="true">☀️</span>
            <div class="mirror-hotspots" aria-label="Детали на фото">${hotspots}</div>
          </div>
          <p class="mirror-found" data-mirror-found aria-live="polite">Отмечено важных деталей: <strong>${result.found} из 4</strong>
          </p>
        </div>

        <div class="mirror-controls">
          <fieldset class="mirror-captions">
            <legend>2. Выбери подпись без лишних подсказок</legend>
            <p>Какая подпись не раскрывает школу, адрес или распорядок дня?</p>
            <div class="mirror-caption-list">${captions}</div>
          </fieldset>
          ${feedback}
          <button class="button button--primary mirror-submit" type="button" data-action="SUBMIT_MIRROR">
            Проверить пост <span aria-hidden="true">→</span>
          </button>
          <p class="mirror-privacy-note"><span aria-hidden="true">🛡️</span> Здесь нет полей ввода: игра не просит и не сохраняет личные данные.</p>
        </div>
      </div>
    </section>`;
}

function normalizeMirrorState(state) {
  const source = state && typeof state === 'object' ? state : {};
  const selectedDetails = Array.isArray(source.selectedDetails)
    ? [...new Set(source.selectedDetails.filter((id) => DETAIL_IDS.has(id)))]
    : [];
  return {
    selectedDetails,
    captionId: CAPTION_IDS.has(source.captionId) ? source.captionId : null,
    submitted: source.submitted === true,
  };
}

function hintFor(detail) {
  const hints = {
    school: 'Посмотри, не видно ли на фото название школы.',
    location: 'Проверь, не показывает ли отметка точное место съёмки.',
    identity: 'Найди предмет, на котором могут быть имя или фото.',
    address: 'Проверь, не видно ли на фото номер дома или другую часть адреса.',
  };
  return detail
    ? hints[detail.category]
    : 'Проверь, не выдаёт ли подпись место съёмки.';
}
