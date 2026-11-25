import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR } from './config.js';

const HTML = 'text/html; charset=utf-8';
const CSS = 'text/css; charset=utf-8';
const JS = 'text/javascript; charset=utf-8';
const JSON_TYPE = 'application/json; charset=utf-8';
const TEXT = 'text/plain; charset=utf-8';

const FILES = Object.freeze({
  '/': { name: 'index.html', type: HTML },
  '/index.html': { name: 'index.html', type: HTML },
  '/styles.css': { name: 'styles.css', type: CSS },
  '/app.js': { name: 'app.js', type: JS },
});

const HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'",
});

function send(res, statusCode, type, body) {
  res.writeHead(statusCode, { ...HEADERS, 'Content-Type': type });
  res.end(body ?? '');
}

function sendJson(res, statusCode, payload) {
  try {
    send(res, statusCode, JSON_TYPE, JSON.stringify(payload));
  } catch {
    send(res, 500, JSON_TYPE, JSON.stringify({ error: 'Resposta indisponível.' }));
  }
}

function pathOf(requestUrl) {
  try {
    return new URL(requestUrl ?? '/', 'http://127.0.0.1').pathname;
  } catch {
    return '/';
  }
}

export function createHttpServer(service) {
  return http.createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const pathname = pathOf(req.url);

    try {
      if (pathname === '/api/edition' || pathname === '/api/refresh') {
        if (pathname === '/api/edition' && method === 'GET') {
          const result = service.getEdition();
          return sendJson(res, result.statusCode, result.body);
        }
        if (pathname === '/api/refresh' && method === 'POST') {
          const result = await service.refresh();
          return sendJson(res, result.statusCode, result.body);
        }
        return sendJson(res, 405, { error: 'Método não permitido.' });
      }

      if (method !== 'GET' && method !== 'HEAD') {
        return send(res, 405, TEXT, 'Método não permitido.');
      }

      const file = FILES[pathname];
      if (!file) return send(res, 404, TEXT, 'Não encontrado.');

      const content = await fs.readFile(path.join(PUBLIC_DIR, file.name));
      return send(res, 200, file.type, method === 'HEAD' ? '' : content);
    } catch {
      if (!res.headersSent) return send(res, 500, TEXT, 'Erro interno.');
      return res.end();
    }
  });
}
