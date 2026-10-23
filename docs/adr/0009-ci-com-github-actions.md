# 0009 — CI com GitHub Actions em PRs para `main`

- **Status:** Aceito
- **Data:** 2026-10-23

## Contexto

Os critérios de avaliação incluem boas práticas de versionamento e testes. Os hooks locais (husky) podem ser
pulados (`--no-verify`) ou nem estar instalados, então a verificação precisa existir também no servidor, antes
de qualquer código chegar à `main`.

## Decisão

Um workflow (`.github/workflows/ci.yml`) roda em **pull requests para `main`** (e manualmente via
`workflow_dispatch`). PRs em rascunho não gastam CI; ao ficarem prontos (`ready_for_review`) os jobs rodam.

| Job       | O que garante                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `commits` | todas as mensagens do PR e o **título** (vira o commit do squash) seguem o commitlint                   |
| `quality` | ESLint (inclui as regras do ADR 0008), Prettier e `tsc` do app e dos specs                              |
| `test`    | testes unitários e de integração com **cobertura mínima** (90% linhas/instruções/funções, 85% branches) |
| `build`   | build de produção (browser + servidor SSR)                                                              |
| `audit`   | `npm audit` das dependências de produção — **informativo** (`continue-on-error`)                        |
| `ci-ok`   | agrega os obrigatórios; é o **único check** a exigir na proteção da branch                              |

Detalhes que importam:

- **Mesmos comandos do dia a dia:** os jobs chamam `npm run lint`, `format:check`, `typecheck`, `test:ci` e `build`.
  O que passa localmente passa no CI.
- **Setup em uma _composite action_** (`.github/actions/setup-project`): Node a partir do `.nvmrc`, **npm fixado na
  versão do `packageManager`** (o npm 11.4 falha na resolução de peers — ADR 0002) e `npm ci` com cache.
- **Cobertura:** `@vitest/coverage-v8` via builder do Angular; limites em `angular.json` (`coverageThresholds`).
  Specs, helpers de teste, tipos/interfaces/enums e _glue_ de bootstrap ficam fora do cálculo. O relatório sobe como artefato.
- **Segurança da cadeia de suprimentos:** actions fixadas por **SHA de commit** (com a versão em comentário),
  `permissions: contents: read`, `persist-credentials: false` e entradas do PR (`title`, SHAs) passadas por `env`,
  nunca interpoladas no script. O Dependabot (`.github/dependabot.yml`) atualiza npm (agrupado, com majors do
  Angular/PrimeNG ignorados — ADR 0002) e as próprias actions, com commits no formato `chore(deps)`/`ci(deps)`.
- **Concorrência:** um novo push cancela a execução anterior do mesmo PR.

## Alternativas consideradas

- **Rodar também em `push` na `main`** — com squash merge o resultado já foi validado no PR; evitamos execução duplicada.
- **Um job único sequencial** — mais simples, mas falha tardia e sem paralelismo; separar dá feedback claro por área.
- **Exigir cada job na proteção da branch** — frágil a renomeações; o `ci-ok` concentra a regra.
- **`npm audit` bloqueante** — novas vulnerabilidades surgem sem mudança no repositório e travariam PRs não relacionados.
- **Actions por tag (`@v4`)** — tags são mutáveis; SHA evita que uma tag comprometida execute código novo.

## Consequências

- Positivas: `main` só recebe código que passou em lint, tipos, testes com cobertura e build; histórico padronizado.
- Negativas: manter os SHAs (o Dependabot ajuda); a cobertura mínima exige testar o código novo; o CI só vale a
  partir da primeira vez que o workflow existir na `main`.
- Próximos passos: e2e (Playwright) e CD (imagem Docker + deploy) entram em PRs próprios; ativar a proteção da
  `main` exigindo o check `CI OK`.
