import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, urlKey } from '../lib/url.js';

test('aceita apenas URLs http(s) válidas', () => {
  assert.equal(safeUrl('https://example.com/noticia?a=1'), 'https://example.com/noticia?a=1');
  assert.equal(safeUrl('http://example.com/'), 'http://example.com/');
});

test('rejeita credenciais, esquemas perigosos e entradas inválidas', () => {
  assert.equal(safeUrl('http://user:pass@example.com/'), '');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('ftp://example.com/'), '');
  assert.equal(safeUrl('não é uma url'), '');
  assert.equal(safeUrl('https://example.com/\u0007'), '');
});

test('normaliza chave de URL removendo tracking e fragmento', () => {
  assert.equal(urlKey('https://www.example.com/a/?utm_source=x#top'), 'example.com/a');
  assert.equal(urlKey('https://example.com/a?b=2'), 'example.com/a?b=2');
  assert.equal(urlKey('javascript:alert(1)'), '');
});
