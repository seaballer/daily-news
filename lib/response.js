import { COOLDOWN_MS } from './config.js';
import { editionDateFor } from './edition-date.js';
import { formatDateTime, formatEditionDate } from './time.js';

function viewItem(item) {
  return {
    title: String(item?.title ?? ''),
    description: String(item?.description ?? ''),
    source: String(item?.source ?? ''),
    publishedAt: String(item?.publishedAt ?? ''),
    publishedAtLabel: formatDateTime(item?.publishedAt),
    url: String(item?.url ?? ''),
    descriptionOrigin: String(item?.descriptionOrigin ?? ''),
  };
}

export function editionView(edition) {
  if (!edition || typeof edition !== 'object') return null;
  const sections = edition.sections ?? {};
  return {
    kind: edition.kind,
    date: edition.date,
    dateLabel: formatEditionDate(edition.date),
    collectedAt: edition.collectedAt ?? null,
    collectedAtLabel: formatDateTime(edition.collectedAt),
    status: String(edition.status ?? ''),
    sections: {
      politica: (Array.isArray(sections.politica) ? sections.politica : []).map(viewItem),
      tecnologia: (Array.isArray(sections.tecnologia) ? sections.tecnologia : []).map(viewItem),
    },
  };
}

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function computeStatus({ edition, state = {}, hasKey = false, now = new Date() } = {}) {
  const moment = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const currentDate = editionDateFor(moment);
  const hasCurrentGnews = edition?.kind === 'gnews' && edition.date === currentDate;
  const lastAttempt = timestamp(state.lastAttemptAt);
  const elapsed = lastAttempt === null ? Infinity : moment.getTime() - lastAttempt;
  const cooldownMs = elapsed >= COOLDOWN_MS ? 0 : Math.max(0, Math.ceil(COOLDOWN_MS - elapsed));
  const dayChanged = edition?.kind === 'gnews' && edition.date !== currentDate && state.lastStatus !== 'falha';
  const retryAfterMs = dayChanged ? 0 : cooldownMs;

  let message;
  if (edition) {
    message = String(edition.status ?? '');
  } else if (hasKey) {
    message = String(state.lastErrorSeguro ?? 'Coleta GNews ainda não concluída.');
  } else {
    message = 'Sem chave GNews e sem edição disponível. Configure GNEWS_API_KEY no .env (veja .env.example) e reinicie o servidor.';
  }

  return {
    kind: edition?.kind ?? 'none',
    message,
    collectedAt: edition?.collectedAt ?? null,
    hasKey: Boolean(hasKey),
    canRefresh: Boolean(hasKey && !hasCurrentGnews && retryAfterMs === 0),
    retryAfterMs,
    nextAutomaticAt: new Date(moment.getTime() + retryAfterMs).toISOString(),
    lastError: state.lastErrorSeguro ?? null,
  };
}

export function responseBody({ edition, state, hasKey, now }) {
  return {
    edition: editionView(edition),
    status: computeStatus({ edition, state, hasKey, now }),
    serverTime: now.toISOString(),
  };
}
