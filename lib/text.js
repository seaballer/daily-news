const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const ENTITIES = [
  [/[&]nbsp;/gi, ' '],
  [/[&]amp;/gi, '&'],
  [/[&]lt;/gi, '<'],
  [/[&]gt;/gi, '>'],
  [/[&]quot;/gi, '"'],
  [/&#39;/g, "'"],
];

function decodeEntities(value) {
  return ENTITIES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function stripTags(value) {
  let result = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = result.replace(/<[^>]*>/g, ' ');
    if (next === result) break;
    result = next;
  }
  return result;
}

function stripMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-+]\s+/gm, '');
}

export function cleanText(value, maxLength = 300) {
  const source = typeof value === 'string' ? value : value == null ? '' : String(value);
  const oneLine = source.replace(CONTROL_CHARS, ' ');
  const cleaned = stripMarkdown(stripTags(decodeEntities(oneLine)))
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

export function normalizeText(value) {
  return cleanText(value, 5000)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
