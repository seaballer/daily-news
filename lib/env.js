import fs from 'node:fs';
import { ENV_FILE } from './config.js';

const KEY_NAME = 'GNEWS_API_KEY';
let cachedKey = null;

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && /^(["']).*\1$/.test(trimmed)) return trimmed.slice(1, -1).trim();
  return trimmed;
}

function readEnvFile() {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (match?.[1] === KEY_NAME) return unquote(match[2]);
    }
  } catch {
    return '';
  }
  return '';
}

export function loadApiKey() {
  if (cachedKey !== null) return cachedKey;
  const fromProcess = typeof process.env[KEY_NAME] === 'string' ? process.env[KEY_NAME].trim() : '';
  cachedKey = fromProcess || readEnvFile();
  return cachedKey;
}
