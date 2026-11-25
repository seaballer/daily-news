import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_HISTORICAL_ROOTS } from './config.js';
import { dedupeSections } from './dedupe.js';
import { cleanText } from './text.js';
import { formatDateBR } from './time.js';
import { safeUrl } from './url.js';

const FILE_PATTERN = /^noticias-(politicas|tech)-(\d{4}-\d{2}-\d{2})\.md$/;
const ITEM_PATTERN = /^\s*\d+\.\s+\*\*(.+?)\*\*\s*(.*)$/;
const HISTORICAL_STATUS = 'Edição histórica — relatórios Markdown locais; NÃO é atualização GNews.';

function sourceFromLinks(links, url) {
  if (links.length) return links[0];
  if (!url) return 'Relatório local';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Relatório local';
  }
}

export function parseMarkdownItems(text, date) {
  const descriptionOrigin = `Texto editorial do relatório histórico (${formatDateBR(date)})`;
  const publishedAt = date;
  const items = [];

  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = ITEM_PATTERN.exec(line);
    if (!match) continue;

    const title = cleanText(match[1], 240);
    if (!title) continue;

    const remainder = match[2] ?? '';
    const links = [...remainder.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)]
      .map((link) => cleanText(link[1], 120))
      .filter(Boolean);
    const url = safeUrl(/\[([^\]]+)\]\(([^)\s]+)\)/.exec(remainder)?.[2] ?? '');

    items.push({
      title,
      description: cleanText(remainder, 1400),
      source: sourceFromLinks(links, url),
      publishedAt,
      url,
      descriptionOrigin,
    });
  }

  return items;
}

export function parseHistoricalPair({ date, politicaText, techText, now = new Date() }) {
  const moment = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const sections = dedupeSections({
    politica: parseMarkdownItems(politicaText, date),
    tecnologia: parseMarkdownItems(techText, date),
  });

  return {
    kind: 'historical',
    date,
    collectedAt: moment.toISOString(),
    status: HISTORICAL_STATUS,
    sections,
  };
}

async function findPairs(roots) {
  const found = new Map();

  for (const root of roots) {
    for (const directory of [root, path.join(root, 'arquivados')]) {
      let names;
      try {
        names = await fs.readdir(directory);
      } catch {
        continue;
      }
      for (const name of names) {
        const match = FILE_PATTERN.exec(name);
        if (!match) continue;
        const section = match[1] === 'politicas' ? 'politica' : 'tecnologia';
        const entry = found.get(match[2]) ?? {};
        if (!entry[section]) entry[section] = path.join(directory, name);
        found.set(match[2], entry);
      }
    }
  }

  return [...found.entries()]
    .filter(([, entry]) => entry.politica && entry.tecnologia)
    .sort(([left], [right]) => right.localeCompare(left));
}

export async function loadHistoricalEdition({ roots = DEFAULT_HISTORICAL_ROOTS, now = new Date() } = {}) {
  for (const [date, entry] of await findPairs(roots)) {
    try {
      const [politicaText, techText] = await Promise.all([
        fs.readFile(entry.politica, 'utf8'),
        fs.readFile(entry.tecnologia, 'utf8'),
      ]);
      return parseHistoricalPair({ date, politicaText, techText, now });
    } catch {
      continue;
    }
  }
  return null;
}
