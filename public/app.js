'use strict';

const elements = {
  status: document.getElementById('status'),
  refresh: document.getElementById('refresh'),
  badge: document.getElementById('badge'),
  notice: document.getElementById('edicao'),
  editionTitle: document.getElementById('edicao-titulo'),
  collectedAt: document.getElementById('coleta-data'),
  politica: document.getElementById('politica-lista'),
  tecnologia: document.getElementById('tecnologia-lista'),
};

let countdownTimer = null;
let buttonVisible = false;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}

function safeUrl(value) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || raw.length > 2048 || /[\u0000-\u001F\u007F-\u009F]/.test(raw)) return '';
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  if (parsed.username || parsed.password || !parsed.hostname) return '';
  return parsed.toString();
}

function externalLink(url, text, className) {
  const link = element('a', className, text);
  link.href = url;
  link.target = '_blank';
  link.setAttribute('rel', 'noopener noreferrer');
  return link;
}

function renderItem(item, featured) {
  const article = element('article', featured ? 'card destaque' : 'card');
  if (featured) article.append(element('p', 'destaque-label', 'Destaque'));
  article.append(element('p', 'origem', item.source ? `Fonte: ${item.source}` : 'Fonte não informada'));

  const heading = element('h3');
  const title = item.title || 'Sem título';
  const url = safeUrl(item.url);
  heading.append(url ? externalLink(url, title) : document.createTextNode(title));
  article.append(heading);

  if (item.description) article.append(element('p', 'descricao', item.description));
  if (item.descriptionOrigin) article.append(element('p', 'descriptorigem', item.descriptionOrigin));

  const foot = element('footer', 'card-foot');
  const time = element('time', '', item.publishedAtLabel || 'Data não informada');
  if (item.publishedAt) time.dateTime = item.publishedAt;
  foot.append(time);
  foot.append(
    url
      ? externalLink(url, 'Ler na fonte original')
      : element('span', '', 'Link original indisponível'),
  );
  article.append(foot);
  return article;
}

function renderSection(container, items) {
  const list = Array.isArray(items) ? items : [];
  container.setAttribute('aria-busy', 'false');
  if (!list.length) {
    container.replaceChildren(element('p', 'empty', 'Sem notícias disponíveis nesta seção.'));
    return;
  }
  container.replaceChildren(...list.map((item, index) => renderItem(item, index === 0)));
}

function syncButton(status) {
  const show = Boolean(status.canRefresh || (buttonVisible && status.retryAfterMs > 0));
  elements.refresh.hidden = !show;
  if (!show) return;
  elements.refresh.disabled = !status.canRefresh;
  elements.refresh.textContent = status.canRefresh
    ? 'Atualizar'
    : `Atualizar (${Math.ceil(status.retryAfterMs / 1000)} s)`;
}

function render(payload) {
  const edition = payload && payload.edition;
  const status = (payload && payload.status) || {};

  let message = status.message || 'Sem informações de status.';
  if (edition) {
    message = edition.dateLabel || edition.date || message;
  } else if (status.lastError) {
    message = `${message} Última falha: ${status.lastError}`;
  }
  elements.status.textContent = message;

  elements.notice.hidden = !edition;
  elements.badge.hidden = !edition || edition.kind !== 'historical';
  if (edition) {
    elements.editionTitle.textContent = edition.dateLabel || edition.date || '';
    elements.collectedAt.textContent = edition.collectedAtLabel || 'Data de coleta não informada';
  }

  const sections = edition && edition.sections ? edition.sections : {};
  renderSection(elements.politica, sections.politica);
  renderSection(elements.tecnologia, sections.tecnologia);
  syncButton(status);
}

function stopCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown(ms) {
  stopCountdown();
  const deadline = Date.now() + Math.max(0, ms);
  elements.refresh.hidden = false;
  elements.refresh.disabled = true;
  elements.refresh.textContent = `Atualizar (${Math.ceil(Math.max(0, ms) / 1000)} s)`;

  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, deadline - Date.now());
    if (remaining === 0) {
      stopCountdown();
      load();
      return;
    }
    elements.refresh.textContent = `Atualizar (${Math.ceil(remaining / 1000)} s)`;
  }, 1000);
}

async function load() {
  try {
    const response = await fetch('/api/edition', { cache: 'no-store' });
    if (!response.ok) throw new Error('edition-unavailable');
    render(await response.json());
  } catch {
    elements.status.textContent = 'Não foi possível carregar a edição local.';
    elements.politica.replaceChildren(element('p', 'empty', 'Notícias indisponíveis.'));
    elements.tecnologia.replaceChildren(element('p', 'empty', 'Notícias indisponíveis.'));
  }
}

async function refresh() {
  stopCountdown();
  buttonVisible = true;
  elements.refresh.hidden = false;
  elements.refresh.disabled = true;
  elements.refresh.textContent = 'Atualizando…';
  elements.status.textContent = 'Atualizando edição…';

  try {
    const response = await fetch('/api/refresh', { method: 'POST', cache: 'no-store' });
    const payload = await response.json();
    render(payload);
    if (response.status === 429 && payload.status && payload.status.retryAfterMs > 0) {
      startCountdown(payload.status.retryAfterMs);
    }
  } catch {
    elements.status.textContent = 'Não foi possível atualizar. Tente novamente mais tarde.';
    syncButton({ canRefresh: false, retryAfterMs: 60000 });
    startCountdown(60000);
  }
}

elements.refresh.addEventListener('click', refresh);
load();
