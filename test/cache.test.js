import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isValidEdition, readEdition } from '../lib/cache.js';

const EDITION = Object.freeze({
  kind: 'gnews',
  date: '2026-11-25',
  collectedAt: '2026-11-25T12:00:00.000Z',
  status: 'Edição GNews',
  sections: { politica: [], tecnologia: [] },
});

test('aceita edição da API com as duas seções', () => {
  assert.equal(isValidEdition(EDITION), true);
});

test('rejeita edição histórica de relatórios locais', () => {
  assert.equal(isValidEdition({ ...EDITION, kind: 'historical' }), false);
});

test('rejeita edição sem data válida ou com seção ausente', () => {
  assert.equal(isValidEdition({ ...EDITION, date: '25/11/2026' }), false);
  assert.equal(isValidEdition({ ...EDITION, sections: { politica: [] } }), false);
  assert.equal(isValidEdition(null), false);
});

test('readEdition ignora JSON histórico e aceita JSON da API', async () => {
  const root = await fs.mkdtemp(path.join('/tmp/opencode', 'daily-news-cache-fixture-'));
  try {
    const file = path.join(root, `${EDITION.date}.json`);
    await fs.writeFile(file, JSON.stringify({ ...EDITION, kind: 'historical' }), 'utf8');
    assert.equal(await readEdition(EDITION.date, root), null);

    await fs.writeFile(file, JSON.stringify(EDITION), 'utf8');
    assert.deepEqual(await readEdition(EDITION.date, root), EDITION);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
