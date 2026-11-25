import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const EDITIONS_DIR = path.join(DATA_DIR, 'editions');
export const STATE_FILE = path.join(DATA_DIR, 'state.json');
export const ENV_FILE = path.join(PROJECT_ROOT, '.env');

// Diretório opcional de relatórios históricos, definido pelo usuário.
const configuredHistoryDir = String(process.env.DAILY_NEWS_HISTORY_DIR ?? '').trim();

export const DAILY_NEWS_HISTORY_DIR = configuredHistoryDir
  ? path.resolve(configuredHistoryDir)
  : '';

export const DEFAULT_HISTORICAL_ROOTS = DAILY_NEWS_HISTORY_DIR
  ? [DAILY_NEWS_HISTORY_DIR]
  : [];

export const COOLDOWN_MS = 15 * 60 * 1000;
export const TIMEOUT_MS = 8000;
export const MAX_ITEMS_PER_SECTION = 8;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function resolveHost(rawHost) {
  const value = String(rawHost ?? '').trim().toLowerCase();
  return LOOPBACK_HOSTS.has(value) ? value : '127.0.0.1';
}

export function resolvePort(rawPort) {
  const value = Number(rawPort);
  return Number.isInteger(value) && value > 0 && value <= 65535 ? value : 8787;
}
