import test from 'node:test';
import assert from 'node:assert/strict';
import { editionDateFor } from '../lib/edition-date.js';

test('às 07:59 em São Paulo usa o dia anterior', () => {
  assert.equal(editionDateFor(new Date('2026-11-24T10:59:00Z')), '2026-11-23');
});

test('às 08:00 em São Paulo usa o dia atual', () => {
  assert.equal(editionDateFor(new Date('2026-11-24T11:00:00Z')), '2026-11-24');
});

test('no meio do dia mantém a data atual', () => {
  assert.equal(editionDateFor(new Date('2026-11-24T15:00:00Z')), '2026-11-24');
});
