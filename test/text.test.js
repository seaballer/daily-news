import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, normalizeText } from '../lib/text.js';

test('remove tags, markdown residual, controles e quebras', () => {
  const raw = '  <script>alert(1)</script> **Atribuição:** [Fonte](https://example.com/a)\n\u0007 nova   linha ';
  const cleaned = cleanText(raw, 300);

  assert.equal(cleaned.includes('<script>'), false);
  assert.equal(cleaned.includes('**'), false);
  assert.equal(cleaned.includes('https://'), false);
  assert.equal(cleaned.includes('\n'), false);
  assert.equal(cleaned.includes('\u0007'), false);
  assert.match(cleaned, /Atribuição: Fonte nova linha/);
});

test('limita o tamanho sem estourar o limite', () => {
  const cleaned = cleanText('a'.repeat(500), 40);
  assert.ok(cleaned.length <= 40);
  assert.ok(cleaned.endsWith('…'));
});

test('normaliza acentos e pontuação para deduplicação', () => {
  assert.equal(normalizeText('Política, Congresso!'), 'politica congresso');
  assert.equal(normalizeText('Politica  congresso'), 'politica congresso');
});
