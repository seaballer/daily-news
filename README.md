# Daily News (MVP local)

Página editorial local em pt-BR com duas seções fixas — Política e Tecnologia — e uma API JSON mínima. Requer Node.js 18.19.1 ou superior.

A arquitetura permanece simples e portátil: `server.js` inicializa o servidor, `public/` contém a interface estática e `lib/` concentra cache, coleta, agendamento e regras de edição. Não há frameworks, build, instalação global, dependências de terceiros nem chamadas externas no navegador; a GNews é consultada apenas pelo backend.

## Inicialização

Na raiz do projeto, execute:

```sh
npm start
# ou, diretamente:
node server.js
```

Acesse `http://127.0.0.1:8787`. O servidor escuta apenas loopback. Para trocar host/porta:

```sh
HOST=127.0.0.1 PORT=8899 node server.js
```

Hosts que não sejam `127.0.0.1`, `localhost` ou `::1` são forçados para `127.0.0.1`.

## Ativar a chave GNews

1. Copie `.env.example` para `.env` e descomente `GNEWS_API_KEY=...`, **ou** exporte no shell: `export GNEWS_API_KEY=sua_chave` (a variável de ambiente tem precedência).
2. Reinicie o servidor. A chave fica apenas em memória; nunca é exibida na API, em logs ou em mensagens de erro.
3. Na primeira inicialização com chave, há uma tentativa automática de coleta. Com o servidor ativo, a virada do dia editorial das 08:00 (São Paulo) também dispara a coleta automaticamente; o botão **Atualizar** continua disponível conforme o cooldown.

Sem chave, a página mostra a edição histórica disponível mais recente — desde que um diretório de relatórios tenha sido configurado — ou, se não houver nenhuma, a mensagem “Sem chave GNews e sem edição disponível” com orientação para configurar `.env`.

## Edição, cache e cooldown

- A data da edição segue `America/Sao_Paulo`: antes das 08:00, usa o dia anterior; a partir das 08:00, usa o dia atual.
- Edições são gravadas em `data/editions/YYYY-MM-DD.json` (escrita atômica) e o estado em `data/state.json`. Ambos são ignorados pelo Git.
- `GET /api/edition` apenas lê o cache e o estado; nunca consulta a GNews.
- Um timer interno verifica a cada 1 minuto e chama diretamente o mesmo fluxo de `POST /api/refresh`, sem GET HTTP e sem nova consulta à GNews enquanto a edição do dia já estiver válida. Na virada das 08:00, a edição anterior permite coleta imediata mesmo dentro do cooldown; após falha, a edição vigente é mantida e o retry volta a respeitar os 15 minutos desde a última tentativa.
- `POST /api/refresh` respeita esse mesmo cooldown. Durante o cooldown responde `429` com `retryAfterMs`, e o botão mostra a contagem. Em falha, a última edição válida é mantida.
- Cada seção tem no máximo 8 notícias deduplicadas por URL e título; o primeiro item é o destaque.

## Relatórios históricos (opcional)

Defina a variável de ambiente `DAILY_NEWS_HISTORY_DIR` no shell antes de iniciar o servidor, apontando para o diretório onde você guarda seus relatórios. Caminhos relativos são resolvidos a partir do diretório de trabalho atual. A variável não é lida de `.env`.

Quando não há chave ou a coleta falha sem edição válida, o servidor procura, nesse diretório e em `arquivados/`, o par mais recente `noticias-politicas-YYYY-MM-DD.md` + `noticias-tech-YYYY-MM-DD.md`. Outros padrões de arquivo são ignorados. A página exibe o selo **EDIÇÃO HISTÓRICA** e deixa claro que não se trata de atualização GNews; o texto editorial e as atribuições são preservados.

Se `DAILY_NEWS_HISTORY_DIR` não estiver definida, não há diretório histórico configurado: sem chave e sem cache, a página mostra a mensagem de edição indisponível. Nenhum caminho de usuário é assumido pelo projeto.

## Verificação

`npm test` (ou `node --test`) roda os testes com `node:test`, sem rede. `npm start` inicia o servidor.

## Limitações

- MVP local: agendamento apenas enquanto o processo Node está ativo (sem coleta em segundo plano se o servidor estiver parado na virada das 08:00), sem interface de administração e sem deduplicação semântica (apenas URL/título normalizados).
- A GNews é consultada somente no backend e com no máximo 10 resultados por seção; descrições são da própria fonte, sem verificação independente.
- Não há persistência além dos arquivos JSON locais; a chave precisa ser reconfigurada se o processo reiniciar sem `.env` ou variável de ambiente.
