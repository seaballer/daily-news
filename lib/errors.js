export const SAFE_MESSAGES = Object.freeze({
  unauthorized: 'Chave inválida ou sem acesso à GNews.',
  rateLimited: 'Limite de requisições da GNews atingido.',
  timeout: 'Tempo limite ao consultar a GNews.',
  network: 'Não foi possível consultar a GNews.',
  upstream: 'Não foi possível consultar a GNews.',
  invalidResponse: 'Resposta da GNews inválida.',
  empty: 'Nenhuma notícia utilizável foi retornada pela GNews.',
});

export class CollectionError extends Error {
  constructor(code) {
    super(SAFE_MESSAGES[code] ? code : 'upstream');
    this.name = 'CollectionError';
    this.code = SAFE_MESSAGES[code] ? code : 'upstream';
  }
}

export function isTimeout(error) {
  const name = String(error?.name ?? '');
  const code = String(error?.code ?? '');
  return name === 'TimeoutError' || name === 'AbortError' || code === 'ABORT_ERR' || code === 'ETIMEDOUT';
}

export function redactSecrets(input, key) {
  let text = typeof input === 'string' ? input : typeof input?.message === 'string' ? input.message : '';
  text = text.replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ');
  if (typeof key === 'string' && key.trim()) text = text.split(key.trim()).join('[REDACTED]');
  text = text
    .replace(/(api[_-]?key|x-api-key|token|senha|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/([?&](?:apikey|key|token)=)[^&\s]+/gi, '$1[REDACTED]');
  return text.trim().slice(0, 300);
}

export function safeErrorMessage(error, key) {
  if (error instanceof CollectionError) return SAFE_MESSAGES[error.code] ?? SAFE_MESSAGES.upstream;
  if (isTimeout(error)) return SAFE_MESSAGES.timeout;

  const redacted = redactSecrets(error, key);
  if (!redacted) return SAFE_MESSAGES.upstream;
  if (/401|403|unauthoriz|forbidden|invalid api/i.test(redacted) && /key|api/i.test(redacted)) {
    return SAFE_MESSAGES.unauthorized;
  }
  if (/429|too many requests|rate limit/i.test(redacted)) return SAFE_MESSAGES.rateLimited;
  return SAFE_MESSAGES.upstream;
}
