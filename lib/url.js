const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;
const TRACKING_PARAM = /^(utm_|fbclid$|gclid$)/i;

export function safeUrl(value) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || raw.length > 2048 || CONTROL_CHARS.test(raw)) return '';

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  if (parsed.username || parsed.password || !parsed.hostname) return '';
  return parsed.toString();
}

export function urlKey(value) {
  const safe = safeUrl(value);
  if (!safe) return '';

  const parsed = new URL(safe);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '');
  const query = [...parsed.searchParams.entries()]
    .filter(([name]) => !TRACKING_PARAM.test(name))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, content]) => `${name}=${content}`)
    .join('&');
  return `${host}${path}${query ? `?${query}` : ''}`;
}
