import fs from 'node:fs/promises';
import path from 'node:path';
import { EDITIONS_DIR, STATE_FILE } from './config.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_STATE = Object.freeze({
  activeDate: null,
  lastSuccessfulDate: null,
  lastAttemptAt: null,
  lastErrorSeguro: null,
  lastStatus: null,
  updatedAt: null,
});

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeState(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    activeDate: stringOrNull(source.activeDate),
    lastSuccessfulDate: stringOrNull(source.lastSuccessfulDate),
    lastAttemptAt: stringOrNull(source.lastAttemptAt),
    lastErrorSeguro: stringOrNull(source.lastErrorSeguro),
    lastStatus: stringOrNull(source.lastStatus),
    updatedAt: stringOrNull(source.updatedAt),
  };
}

async function readJson(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function readState() {
  return normalizeState(await readJson(STATE_FILE));
}

export async function writeState(state) {
  await writeJsonAtomic(STATE_FILE, normalizeState(state));
}

export function isValidEdition(edition) {
  return Boolean(
    edition &&
      typeof edition === 'object' &&
      edition.kind === 'gnews' &&
      DATE_PATTERN.test(edition.date ?? '') &&
      edition.sections &&
      Array.isArray(edition.sections.politica) &&
      Array.isArray(edition.sections.tecnologia),
  );
}

export async function readEdition(date, editionsDir = EDITIONS_DIR) {
  if (!DATE_PATTERN.test(String(date ?? ''))) return null;
  const edition = await readJson(path.join(editionsDir, `${date}.json`));
  return isValidEdition(edition) ? edition : null;
}

export async function writeEdition(edition) {
  if (!isValidEdition(edition)) throw new Error('edition-invalida');
  await writeJsonAtomic(path.join(EDITIONS_DIR, `${edition.date}.json`), edition);
}

export async function listEditionDates() {
  try {
    const names = await fs.readdir(EDITIONS_DIR);
    return names
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .map((name) => name.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
