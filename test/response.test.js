import assert from 'node:assert/strict';
import test from 'node:test';
import { editionView } from '../lib/response.js';

test('a view da edição não expõe a origem da descrição', () => {
  const view = editionView({
    kind: 'gnews',
    date: '2026-11-25',
    collectedAt: '2026-11-25T14:55:28.828Z',
    status: 'Edição GNews',
    sections: {
      politica: [{
        title: 'Notícia',
        description: 'Descrição',
        source: 'Fonte',
        publishedAt: '2026-11-25',
        url: 'https://example.com/noticia',
        descriptionOrigin: 'Texto editorial do relatório histórico (25/11/2026)',
      }],
      tecnologia: [],
    },
  });

  assert.equal(view.dateLabel, '25/11/2026');
  assert.match(view.collectedAtLabel, /America\/Sao_Paulo/);
  assert.deepEqual(Object.keys(view.sections.politica[0]), [
    'title',
    'description',
    'source',
    'publishedAt',
    'publishedAtLabel',
    'url',
  ]);
  assert.equal(JSON.stringify(view).includes('Texto editorial do relatório histórico'), false);
});
