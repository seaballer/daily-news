import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadHistoricalEdition } from '../lib/historical.js';

const FIXED_NOW = new Date('2026-11-25T12:00:00Z');

test('importa o par histórico mais recente e ignora outros padrões', async () => {
  const root = await fs.mkdtemp(path.join('/tmp/opencode', 'daily-news-fixture-'));
  try {
    await fs.mkdir(path.join(root, 'arquivados'));
    await fs.writeFile(
      path.join(root, 'noticias-politicas-2026-11-24.md'),
      '# Política\n\n1. **Título A.** Texto com **Atribuição oficial.** [AP](https://apnews.com/a) · [Outra](https://example.com/b)\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(root, 'arquivados', 'noticias-tech-2026-11-24.md'),
      '# Tecnologia\n\n1. **Título B.** Resultado reportado pela empresa. [Fonte](https://example.com/c)\n',
      'utf8',
    );
    await fs.writeFile(path.join(root, 'vagas-2026-11-25.md'), '1. **IGNORAR.** [x](https://example.com/x)\n', 'utf8');
    await fs.writeFile(
      path.join(root, 'noticias-politicas-e-internacionais-2026-11-25.md'),
      '1. **IGNORAR.** [x](https://example.com/y)\n',
      'utf8',
    );

    const edition = await loadHistoricalEdition({ roots: [root], now: FIXED_NOW });

    assert.equal(edition.kind, 'historical');
    assert.equal(edition.date, '2026-11-24');
    assert.equal(edition.collectedAt, FIXED_NOW.toISOString());
    assert.match(edition.status, /NÃO é atualização GNews/);
    assert.equal(edition.sections.politica.length, 1);
    assert.equal(edition.sections.tecnologia.length, 1);
    assert.match(edition.sections.politica[0].description, /Atribuição oficial\./);
    assert.equal(edition.sections.politica[0].description.includes('**'), false);
    assert.equal(edition.sections.politica[0].source, 'AP');
    assert.equal(edition.sections.politica[0].url, 'https://apnews.com/a');
    assert.equal(edition.sections.politica[0].publishedAt, '2026-11-24');
    assert.equal(
      edition.sections.politica[0].descriptionOrigin,
      'Texto editorial do relatório histórico (24/11/2026)',
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
