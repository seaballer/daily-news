import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime, formatEditionDate } from '../lib/time.js';

test('data sem horário não ganha hora inventada', () => {
  const label = formatDateTime('2026-11-24');
  assert.match(label, /24\/11\/2026/);
  assert.doesNotMatch(label, /\d{2}:\d{2}/);
});

test('data com horário é exibida em America/Sao_Paulo', () => {
  const label = formatDateTime('2026-11-25T12:00:00Z');
  assert.match(label, /25\/11\/2026/);
  assert.match(label, /09:00/);
  assert.match(label, /America\/Sao_Paulo/);
});

test('data da edição usa apenas dia, mês e ano', () => {
  assert.equal(formatEditionDate('2026-11-24'), '24/11/2026');
});
