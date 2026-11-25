import { DEFAULT_HISTORICAL_ROOTS } from './config.js';
import * as cache from './cache.js';
import { editionDateFor } from './edition-date.js';
import { loadApiKey } from './env.js';
import { safeErrorMessage } from './errors.js';
import { collectGNews } from './gnews.js';
import { loadHistoricalEdition } from './historical.js';
import { warnSafe } from './log.js';
import { responseBody } from './response.js';

function currentDate(now) {
  const moment = now();
  return moment instanceof Date && !Number.isNaN(moment.getTime()) ? moment : new Date();
}

function changed(state, changes) {
  return { ...state, ...changes };
}

export async function createService({
  now = () => new Date(),
  fetchImpl = fetch,
  roots = DEFAULT_HISTORICAL_ROOTS,
} = {}) {
  const key = loadApiKey();
  const hasKey = Boolean(key);
  let state = await cache.readState();
  let edition = null;
  let refreshing = null;

  async function persistState(next) {
    state = next;
    try {
      await cache.writeState(state);
    } catch {
      warnSafe('Não foi possível gravar o estado local.');
    }
  }

  async function collectInto(date) {
    const collected = await collectGNews({ key, date, now: currentDate(now), fetchImpl });
    try {
      await cache.writeEdition(collected);
    } catch {
      warnSafe('Não foi possível gravar a edição local.');
    }
    return collected;
  }

  async function latestCachedEdition() {
    for (const date of await cache.listEditionDates()) {
      const candidate = await cache.readEdition(date);
      if (candidate) return candidate;
    }
    return null;
  }

  async function fallbackEdition() {
    return (await latestCachedEdition()) ?? (await loadHistoricalEdition({ roots, now: currentDate(now) }));
  }

  async function persistFallbackEdition(candidate) {
    if (candidate?.kind !== 'historical' || (await cache.readEdition(candidate.date))) return;
    try {
      await cache.writeEdition(candidate);
    } catch {
      warnSafe('Não foi possível gravar a edição histórica local.');
    }
  }

  function respond(statusCode, moment, message) {
    let body = responseBody({ edition, state, hasKey, now: moment });
    if (message) body = { ...body, status: { ...body.status, message } };
    return { statusCode, body };
  }

  const today = editionDateFor(currentDate(now));
  const cachedToday = await cache.readEdition(today);

  if (cachedToday?.kind === 'gnews') {
    edition = cachedToday;
    await persistState(changed(state, {
      activeDate: today,
      lastStatus: 'gnews em cache',
      lastErrorSeguro: null,
      updatedAt: currentDate(now).toISOString(),
    }));
  } else if (hasKey) {
    await persistState(changed(state, {
      lastAttemptAt: currentDate(now).toISOString(),
      lastStatus: 'coletando',
      updatedAt: currentDate(now).toISOString(),
    }));
    try {
      const collected = await collectInto(today);
      edition = collected;
      await persistState(changed(state, {
        activeDate: collected.date,
        lastSuccessfulDate: collected.date,
        lastErrorSeguro: null,
        lastStatus: 'gnews',
        updatedAt: currentDate(now).toISOString(),
      }));
    } catch (error) {
      const message = safeErrorMessage(error, key);
      await persistState(changed(state, {
        lastErrorSeguro: message,
        lastStatus: 'falha',
        updatedAt: currentDate(now).toISOString(),
      }));
      edition = await fallbackEdition();
      await persistFallbackEdition(edition);
      await persistState(changed(state, {
        activeDate: edition?.date ?? null,
        lastStatus: edition?.kind ?? 'none',
      }));
    }
  } else {
    edition = (await loadHistoricalEdition({ roots, now: currentDate(now) })) ?? (await latestCachedEdition());
    await persistFallbackEdition(edition);
    await persistState(changed(state, {
      activeDate: edition?.date ?? null,
      lastStatus: edition?.kind ?? 'none',
      updatedAt: currentDate(now).toISOString(),
    }));
  }

  function getEdition() {
    return respond(200, currentDate(now));
  }

  async function refresh() {
    const moment = currentDate(now);
    const current = responseBody({ edition, state, hasKey, now: moment }).status;

    if (!hasKey) return respond(403, moment, 'Sem chave GNews configurada. Crie .env a partir de .env.example e reinicie.');
    if (refreshing) return respond(429, moment, 'Atualização já em andamento.');
    if (!current.canRefresh) {
      if (current.retryAfterMs > 0) {
        return respond(429, moment, `Aguarde ${Math.ceil(current.retryAfterMs / 1000)} s antes de tentar novamente.`);
      }
      return respond(200, moment);
    }

    const task = (async () => {
      await persistState(changed(state, {
        lastAttemptAt: currentDate(now).toISOString(),
        lastStatus: 'coletando',
        updatedAt: currentDate(now).toISOString(),
      }));
      try {
        const collected = await collectInto(editionDateFor(currentDate(now)));
        edition = collected;
        await persistState(changed(state, {
          activeDate: collected.date,
          lastSuccessfulDate: collected.date,
          lastErrorSeguro: null,
          lastStatus: 'gnews',
          updatedAt: currentDate(now).toISOString(),
        }));
      } catch (error) {
        await persistState(changed(state, {
          lastErrorSeguro: safeErrorMessage(error, key),
          lastStatus: 'falha',
          updatedAt: currentDate(now).toISOString(),
        }));
        if (!edition) {
          edition = await fallbackEdition();
          await persistFallbackEdition(edition);
          await persistState(changed(state, {
            activeDate: edition?.date ?? null,
            lastStatus: edition?.kind ?? 'none',
          }));
        }
      }
    })();

    refreshing = task.finally(() => {
      refreshing = null;
    });
    await refreshing;
    return respond(200, currentDate(now));
  }

  return { getEdition, refresh };
}
