import { MAX_ITEMS_PER_SECTION, TIMEOUT_MS } from './config.js';
import { dedupeSections } from './dedupe.js';
import { CollectionError, isTimeout } from './errors.js';
import { cleanText } from './text.js';
import { safeUrl } from './url.js';

const POLITICS_QUERY = 'política OR Congresso OR governo OR eleições';
const POLITICS_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(POLITICS_QUERY)}&lang=pt&max=10`;
const TECHNOLOGY_URL = 'https://gnews.io/api/v4/top-headlines?category=technology&lang=pt&max=10';

export function normalizeArticle(article) {
  const sourceValue = article?.source?.name ?? article?.source ?? '';
  const description = cleanText(article?.description ?? article?.content ?? '', 1400);
  const publishedAt = typeof article?.publishedAt === 'string' ? cleanText(article.publishedAt, 40) : '';

  return {
    title: cleanText(article?.title ?? '', 240),
    description,
    source: cleanText(sourceValue, 120) || 'Fonte não informada',
    publishedAt,
    url: safeUrl(article?.url ?? ''),
  };
}

async function fetchArticles(url, key, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { 'X-Api-Key': key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new CollectionError(isTimeout(error) ? 'timeout' : 'network');
  }

  if (response.status === 401 || response.status === 403) throw new CollectionError('unauthorized');
  if (response.status === 429) throw new CollectionError('rateLimited');
  if (!response.ok) throw new CollectionError('upstream');

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new CollectionError('invalidResponse');
  }
  return Array.isArray(payload?.articles) ? payload.articles.filter((item) => item && typeof item === 'object') : [];
}

export async function collectGNews({ key, date, now = new Date(), fetchImpl = fetch } = {}) {
  const [politicaRaw, tecnologiaRaw] = await Promise.all([
    fetchArticles(POLITICS_URL, key, fetchImpl),
    fetchArticles(TECHNOLOGY_URL, key, fetchImpl),
  ]);

  const sections = dedupeSections(
    {
      politica: politicaRaw.map(normalizeArticle),
      tecnologia: tecnologiaRaw.map(normalizeArticle),
    },
    MAX_ITEMS_PER_SECTION,
  );

  if (!sections.politica.length && !sections.tecnologia.length) throw new CollectionError('empty');

  const moment = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return {
    kind: 'gnews',
    date,
    collectedAt: moment.toISOString(),
    status: 'Edição GNews — descrições das fontes via GNews, sem verificação independente.',
    sections,
  };
}
