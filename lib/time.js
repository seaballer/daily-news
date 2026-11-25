const ZONE = 'America/Sao_Paulo';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parsed(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return formatEditionDate(value);
  const date = parsed(value);
  return date ? `${dateTimeFormatter.format(date)} (${ZONE})` : 'Data de coleta não informada';
}

export function formatEditionDate(value) {
  const date = parsed(`${value}T12:00:00-03:00`);
  return date ? dateFormatter.format(date) : 'Data da edição não informada';
}

export function formatDateBR(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
