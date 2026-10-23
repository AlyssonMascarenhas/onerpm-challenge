# OneRPM Challenge — consulta de faixas por ISRC

Página pública (Angular 21 LTS + SSR/Express) que consulta a Spotify Web API por ISRC e exibe as faixas
ordenadas por título. Sem persistência. O enunciado original está no `README.md`.

## Stack

- Angular 21 (standalone, zoneless, signals, OnPush) + SSR com Express; PrimeNG 21 para UI; Transloco para i18n.
- BFF em `src/bff/` (rotas `/api`, montadas em `src/server.ts`): o Client Secret do Spotify **nunca** vai ao browser.
- Testes com Vitest (`npm test`); lint com angular-eslint; Prettier.
- Node `^22.22.1 || >=24` (limitado por lint-staged 17 e ESLint 10; o Angular 21 aceita `>=22.12`); use npm >= 11.6 (o npm 11.4 falha com `edgesOut` ao resolver peers).

## Convenções

- **Commits**: Conventional Commits (`feat(bff): ...`). Escopos em `commitlint.config.js`. Husky roda commitlint + lint-staged.
- **Branches/PRs**: uma branch por etapa (`feat/...`, `chore/...`, `ci/...`), PR pequeno para `main`, squash merge.
- **ADRs**: toda decisão técnica relevante ganha um registro em `docs/adr/` (template em `0000-template.md`), no mesmo PR que a introduz, e entra no índice do `docs/adr/README.md`.
- Segredos só em `.env` (ignorado) e secrets do GitHub. Use `.env.example` como referência.
- Código: sem `any`; funções puras no domínio; mappers isolam o formato do Spotify (anti-corruption layer).
- **CI** (`.github/workflows/ci.yml` e `pr-title.yml`, ADR 0009): em PRs para `main` roda commitlint (commits e título), lint, Prettier, typecheck, testes com cobertura mínima e build. Antes de abrir PR, rode `npm run lint && npm run format:check && npm run typecheck && npm run test:ci && npm run build`.
- Siga `.claude/skills/angular-developer` e `.claude/skills/angular-new-app` (instaladas de https://github.com/angular/skills).

## Angular — regras do projeto

- Standalone (não setar `standalone: true`), `input()`/`output()`, `inject()`, `computed()`, `ChangeDetectionStrategy.OnPush`.
- `@if/@for/@switch`; sem `ngClass`/`ngStyle`; host bindings no objeto `host`.
- Acessibilidade: WCAG AA e AXE limpos.

## PrimeNG

- MCP configurado em `.mcp.json` (`@primeng/mcp@21`). Não instale também o plugin PrimeNG — duplicaria o servidor.
- Docs para LLM: https://primeng.dev/llms/llms.txt, https://primeng.dev/llms/llms-full.txt (adicione `.md` a uma página para obter Markdown).

## Spotify (2026) — pontos que mudaram

- `available_markets` removido: disponibilidade no Brasil via `market=BR` + `is_playable`/`restrictions`.
- `/search` aceita `limit` <= 10; endpoints batch removidos. `preview_url` é frequentemente `null` → fallback para embed oficial.
