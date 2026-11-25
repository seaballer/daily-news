import { resolveHost, resolvePort } from './lib/config.js';
import { createHttpServer } from './lib/http.js';
import { infoSafe, warnSafe } from './lib/log.js';
import { createService } from './lib/service.js';

const host = resolveHost(process.env.HOST);
const port = resolvePort(process.env.PORT);

const service = await createService();
const server = createHttpServer(service);

const AUTO_REFRESH_MS = 60_000;
const autoRefreshTimer = setInterval(() => {
  void service.refresh().catch(() => {
    warnSafe('Atualização automática não concluída; nova tentativa no próximo ciclo permitido.');
  });
}, AUTO_REFRESH_MS);

server.on('error', () => {
  warnSafe('Falha ao iniciar o servidor. Verifique host e porta.');
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const label = host === '::1' ? '[::1]' : host;
  infoSafe(`servindo em http://${label}:${port}`);
});

function shutdown() {
  clearInterval(autoRefreshTimer);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
