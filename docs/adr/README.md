# Architecture Decision Records (ADRs)

Cada decisão técnica relevante tem um registro curto aqui: **contexto, decisão, alternativas e consequências**.
Formato inspirado no [MADR](https://adr.github.io/madr/). Idioma: português.

## Como usar

1. Copie [`0000-template.md`](0000-template.md) para `NNNN-titulo-em-kebab-case.md` (próximo número livre).
2. Escreva no **mesmo PR** que introduz a decisão — o código e o "porquê" andam juntos.
3. Não reescreva história: se a decisão mudar, crie um novo ADR e marque o antigo como `Substituído por NNNN`.
4. Adicione a linha no índice abaixo.

## Índice

| #    | Decisão                                                                       | Status   |
| ---- | ----------------------------------------------------------------------------- | -------- |
| 0001 | [Registrar decisões de arquitetura](0001-registrar-decisoes-de-arquitetura.md) | Aceito   |
| 0002 | [Angular 21 (LTS) em vez do 22](0002-angular-21-lts.md)                       | Aceito   |
| 0003 | [BFF no próprio Angular SSR + Express](0003-bff-no-angular-ssr.md)             | Aceito   |
| 0004 | [Commits semânticos, commitlint e fluxo de PRs](0004-commits-semanticos-e-fluxo-de-prs.md) | Aceito |
| 0005 | [Regras de consulta ao Spotify em 2026](0005-regras-de-consulta-ao-spotify.md) | Aceito   |
| 0006 | [PrimeNG como biblioteca de UI e MCP em vez de plugin](0006-primeng-e-mcp.md)  | Aceito   |
| 0007 | [Estrutura do BFF e estratégia de testes do servidor](0007-estrutura-do-bff-e-testes.md) | Aceito |
| 0008 | [Convenções de organização e estilo de código](0008-convencoes-de-organizacao-de-codigo.md) | Aceito |
| 0009 | [CI com GitHub Actions em PRs para `main`](0009-ci-com-github-actions.md) | Aceito |
