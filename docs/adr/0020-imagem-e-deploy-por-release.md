# 0020 — Imagem de contêiner e deploy a partir da release (tag)

- **Status:** Aceito
- **Data:** 2026-10-24

## Contexto

A página precisa estar no ar para ser avaliada, e o Client Secret do Spotify só pode existir no servidor (ADR 0003). Também
queremos que o que está no ar seja sempre uma versão **numerada e rastreável**, e não "o que estava na `main` naquela hora".

## Decisão

- **Uma imagem de contêiner** (`Dockerfile`, dois estágios): o primeiro compila o app (navegador + servidor SSR) com a
  ferramenta completa; o segundo leva **só o resultado** do _build_ (o _bundle_ do servidor já carrega suas dependências, então
  o app na imagem não tem `node_modules` nem código-fonte; o `npm` da imagem-base do Node continua lá, fora de `/app`), roda como o usuário `node` (sem _root_) e tem `HEALTHCHECK`. As credenciais e o
  `NG_ALLOWED_HOSTS` vêm do ambiente em que ela roda: nada de segredo na imagem (`.dockerignore` barra `.env`).
- **`GET /api/health`**: responde 200 com o servidor de pé, sem chamar o Spotify, para o `HEALTHCHECK` e para a plataforma de
  hospedagem; uma queda do Spotify não faz a plataforma reiniciar um servidor que funciona.
- **No CI** (job `Docker image`, exigido pelo `CI OK`): constrói a imagem, sobe o contêiner e confere que está saudável, que a
  página e a API respondem, que os cabeçalhos de segurança e a compressão estão ativos, que `X-Powered-By` não é enviado, que o
  processo não é _root_ e que `node_modules`/`src` não estão na imagem. Um `Dockerfile` quebrado reprova o PR.
- **Versões e releases com release-please**: a cada merge na `main` ele mantém um PR de release (versão pelo
  Conventional Commits, `CHANGELOG.md`). **Integrar esse PR cria a tag `vX.Y.Z` e a release no GitHub.**
  Dois ajustes de configuração são necessários e testados (`src/release-config.spec.ts`): `include-component-in-tag: false`
  (no modo _manifest_ o padrão seria `onerpm-tracks-v0.1.0`, que o workflow recusaria) e `group-pull-request-title-pattern`
  (o título por pacote é ignorado no PR agrupado, que sairia como `chore: release main`, em vez de `chore(release): X.Y.Z`).
- **O deploy só acontece quando há release, a partir da tag.** O workflow `Release` só constrói a imagem quando o
  release-please acabou de criar uma release (ou quando alguém dispara o workflow à mão informando uma tag existente, para
  reimplantar). Ele valida que a tag é `vX.Y.Z`, faz _checkout_ **da tag**, publica no GitHub Container Registry
  (`ghcr.io/<dono>/<repo>`) com as etiquetas `X.Y.Z`, `X.Y` e `latest`. (A hospedagem escolhida acabou sendo a Vercel, que não
  usa a imagem: ver o ADR 0021. A imagem continua publicada como artefato portátil, para qualquer hospedagem que rode imagens.) **Um merge comum na `main` não publica nem implanta nada.**
- **Dependabot** também acompanha a imagem-base do `Dockerfile`.

## Como colocar no ar

O site vai para a Vercel (ADR 0021). Para rodar a **imagem** em outra hospedagem (Render, Railway, Fly.io…): crie o serviço a
partir de `ghcr.io/<dono>/<repo>:latest`, com as variáveis `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` e `NG_ALLOWED_HOSTS` (o
domínio público), caminho de saúde `/api/health` e porta `4000`. O pacote publicado no GHCR **nasce privado**: torne-o público
(Configurações do pacote no GitHub) ou dê à hospedagem uma credencial de leitura (um _token_ com `read:packages`).

Em qualquer caso:

1. Segredo `RELEASE_PLEASE_TOKEN` (**necessário** com a `main` protegida): sem ele, o PR de release é aberto com o token padrão
   do GitHub e **não dispara o CI**, então os _checks_ obrigatórios (`CI OK`, `PR title`) nunca aparecem nele e a proteção
   bloqueia o merge. Com um token que escreve conteúdo e PRs, aparecem. O `CHANGELOG.md` gerado fica fora do Prettier
   (`.prettierignore`), para o PR de release não reprovar a checagem de formato.

## Alternativas consideradas

- **Implantar a cada merge na `main`** — o que está no ar não teria versão nem changelog, e qualquer merge intermediário
  seria publicado; o pedido foi implantar só quando houver release.
- **Disparar por `on: push: tags`** — tags criadas com o token padrão do GitHub não disparam outros workflows; por isso a
  publicação fica no mesmo workflow do release-please, ligada à saída dele.
- **Vercel** — exigiria adaptar o servidor Express/SSR a funções _serverless_; a imagem roda em qualquer lugar.

## Consequências

- Positivas: versões numeradas, changelog automático, imagem verificada no CI, deploy reproduzível a partir da tag, e como
  reimplantar uma versão antiga (disparo manual com a tag).
- Negativas: depende de o PR de release ser integrado para algo ir ao ar; o PR de release com o token padrão não roda o CI
  (documentado acima); a imagem não foi executada localmente no ambiente de desenvolvimento (o Docker Desktop da máquina não
  iniciou), então a primeira verificação real do `Dockerfile` é o job `Docker image` do CI.
