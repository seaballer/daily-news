import test from 'node:test';
import assert from 'node:assert/strict';
import { CollectionError, SAFE_MESSAGES, redactSecrets, safeErrorMessage } from '../lib/errors.js';

const KEY = 'SEGREDO_SUPER_SECRETO_123';

test('remove a chave de mensagens e texto redigido', () => {
  const error = new Error(`Falha x-api-key: ${KEY} e apikey=${KEY}`);
  const safe = safeErrorMessage(error, KEY);
  const redacted = redactSecrets(error, KEY);

  assert.equal(safe.includes(KEY), false);
  assert.equal(safe, SAFE_MESSAGES.upstream);
  assert.equal(redacted.includes(KEY), false);
  assert.match(redacted, /\[REDACTED\]/);
});

test('classifica timeouts e erros conhecidos sem expor upstream', () => {
  assert.equal(safeErrorMessage({ name: 'TimeoutError', message: 'boom' }, KEY), SAFE_MESSAGES.timeout);
  assert.equal(safeErrorMessage(new CollectionError('unauthorized'), KEY), SAFE_MESSAGES.unauthorized);
  assert.equal(safeErrorMessage(new CollectionError('rateLimited'), KEY), SAFE_MESSAGES.rateLimited);
  assert.equal(
    safeErrorMessage(new Error('body={"articles":[{"title":"segredo"}]}'), KEY),
    SAFE_MESSAGES.upstream,
  );
});
