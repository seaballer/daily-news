export function warnSafe(message) {
  console.warn(`[daily-news] ${String(message).slice(0, 200)}`);
}

export function infoSafe(message) {
  console.log(`[daily-news] ${String(message).slice(0, 200)}`);
}
