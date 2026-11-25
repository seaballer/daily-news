const SAO_PAULO = 'America/Sao_Paulo';
const CUTOFF_HOUR = 8;

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function safeDate(now) {
  return now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
}

export function editionDateFor(now = new Date()) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(safeDate(now))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;
  const localMidnight = Date.UTC(year, month - 1, day);
  const editionStamp = hour < CUTOFF_HOUR ? localMidnight - 86_400_000 : localMidnight;

  return new Date(editionStamp).toISOString().slice(0, 10);
}
