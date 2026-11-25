import { normalizeText } from './text.js';
import { urlKey } from './url.js';

export function dedupeItems(items, limit = 8) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const result = [];

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== 'object') continue;

    const url = urlKey(item.url);
    const title = normalizeText(item.title);
    if (!title || (url && seenUrls.has(url)) || seenTitles.has(title)) continue;

    if (url) seenUrls.add(url);
    seenTitles.add(title);
    result.push({ ...item });
    if (result.length >= limit) break;
  }

  return result;
}

export function dedupeSections(sections, limit = 8) {
  const input = sections && typeof sections === 'object' ? sections : {};
  return {
    politica: dedupeItems(input.politica, limit),
    tecnologia: dedupeItems(input.tecnologia, limit),
  };
}
