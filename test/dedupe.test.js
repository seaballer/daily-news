import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeItems } from '../lib/dedupe.js';

test('dedupe por URL normalizada e título normalizado preservando ordem', () => {
  const items = [
    { title: 'Política hoje', url: 'https://example.com/a?utm_source=1' },
    { title: 'Politica hoje!', url: 'https://example.com/a' },
    { title: 'Outra notícia', url: 'https://example.org/b' },
    { title: '', url: 'https://example.org/c' },
  ];
  const original = structuredClone(items);

  const result = dedupeItems(items, 8);

  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'Política hoje');
  assert.equal(result[1].title, 'Outra notícia');
  assert.deepEqual(items, original);
  assert.notEqual(result[0], items[0]);
});

test('respeita o limite de oito itens', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    title: `Notícia ${index + 1}`,
    url: `https://example.com/${index + 1}`,
  }));
  assert.equal(dedupeItems(items, 8).length, 8);
});
