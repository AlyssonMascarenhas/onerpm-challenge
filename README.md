# Consulta de faixas por ISRC — versão SPA

Branch **`main-spa`**: uma nova versão do desafio da ONErpm, como **aplicação Angular 21 (LTS) estática**, sem SSR e
sem servidor, com um design novo pensado para produtores musicais. A versão SSR entregue para avaliação continua na
branch [`main`](https://github.com/AlyssonMascarenhas/onerpm-challenge/tree/main), sem alterações.

A página consulta na **Spotify Web API**, direto do navegador, os **10 ISRCs** do contrato e mostra cada faixa com capa,
data de lançamento, título, artistas, duração `mm:ss`, prévia do áudio, link no Spotify e se está disponível no Brasil,
**ordenadas por título**, sem guardar nada. Se o Spotify não puder ser usado, o visitante vê um alerta.

> O enunciado original está no fim deste arquivo, [intacto](#enunciado-original).

## O design

Escolhido no Claude Design entre duas direções ("Estúdio/DAW" e "Catálogo"). O **Catálogo** mostra de uma vez quantos
ISRCs chegaram, quantos o Spotify tem, quantos tocam no Brasil, quanto dura o conjunto e de quando são os lançamentos;
abaixo, a tabela filtrável e o detalhe da faixa com a prévia.

- **Desktop:** cartões de resumo, tabela (faixa, ISRC, lançamento, duração, Brasil) e painel de detalhe ao lado.
- **Celular:** cartões em duas colunas, chips de situação roláveis, tabela enxuta e o detalhe numa _bottom sheet_.
- **Claro e escuro**, seis idiomas, WCAG AA verificado pelo axe.

## Como funciona

```text
Navegador (Angular)
  ├─ POST accounts.spotify.com/api/token   (credenciais do environment → token de app)
  ├─ GET  api.spotify.com/v1/search?q=isrc:…   (token posto pelo spotifyAuthInterceptor)
  └─ player do Spotify (iframe), carregado só ao clicar em "Ouvir uma prévia"
```

```text
src/
  app/
    api/          quem faz requisição para fora: spotify-accounts/, spotify-web/, spotify-player/
    services/     nossos serviços sobre a api/: spotify-auth/ (token + interceptor), track-lookup/, spotify-player/
    models/       o modelo do app (Track, TrackLookupResult)
    core/         i18n, tema, storage
    layout/       header, footer, language-menu, theme-toggle
    shared/       components/icon, components/copy-button
    features/tracks/  domain, store, components, pages
  environments/   environment.ts (produção, sem credenciais), .development, .e2e, .local.example
  testing/        utilitários dos testes
e2e/              Playwright + axe
docs/adr/         registros das decisões desta branch
```

Convenção clássica do Angular: `xxx.component.ts|html|scss|spec.ts`, `xxx.service.ts`, `xxx.interceptor.ts`
([ADR 0004](docs/adr/0004-convencoes-angular-e-camadas.md)).

## Decisões

- **SPA estática, Spotify chamado do navegador** ([0002](docs/adr/0002-spa-estatica-com-spotify-chamado-do-navegador.md)):
  qualquer hospedagem estática serve. Em troca, **o Client Secret vai no bundle publicado**: use um app Spotify só para
  esta página e troque o segredo se vazar.
- **Componentes próprios + Angular CDK** ([0003](docs/adr/0003-design-catalogo-com-componentes-proprios-e-cdk.md)).
- **Convenções do Angular e camadas `api` / `services`** ([0004](docs/adr/0004-convencoes-angular-e-camadas.md)).
- **Testes** ([0005](docs/adr/0005-testes-unitarios-e2e-e-acessibilidade.md)): Vitest com cobertura mínima, Playwright
  (desktop e celular) e axe nos dois temas.

## Rodando localmente

**Pré-requisitos:** Node `^22.12 || >=24` (o `.nvmrc` usa 24), npm ≥ 11.6 e um app no
[dashboard do Spotify](https://developer.spotify.com/dashboard) (Client ID e Client Secret).

```bash
npm ci
cp src/environments/environment.local.example.ts src/environments/environment.local.ts
# preencha clientId e clientSecret em environment.local.ts (o arquivo é ignorado pelo Git)
npm start              # http://localhost:4200
```

### Credenciais do Spotify

| Arquivo                         | Usado por                            | Credenciais                       |
| ------------------------------- | ------------------------------------ | --------------------------------- |
| `environment.local.ts`          | `npm start` (`ng serve`)             | as suas (ignorado pelo Git)       |
| `environment.development.ts`    | testes e build de desenvolvimento    | vazias                            |
| `environment.e2e.ts`            | `npm run e2e`                        | falsas (o Spotify é simulado)     |
| `environment.ts`                | `npm run build` (produção)           | vazias no Git; o deploy as escreve |

Sem credenciais a página abre do mesmo jeito e mostra o alerta de dados indisponíveis.

## Garantindo que está tudo certo

```bash
npm run lint && npm run format:check && npm run typecheck
npm run test:ci        # Vitest com cobertura mínima
npm run e2e            # Playwright (desktop e Pixel 7) + axe; navegador: npm run e2e:install
```

O CI (`.github/workflows/ci.yml`) roda tudo isso em PRs para `main-spa`.

## Limitações conhecidas

- O Client Secret fica visível no JavaScript publicado (ver ADR 0002).
- Sem cache entre visitantes: cada visita faz suas buscas, então um limite do Spotify (429) aparece mais cedo.
- A prévia depende do player oficial do Spotify (iframe); o volume não existe na API do embed.
- A hospedagem desta versão ainda não foi escolhida.

---

<a id="enunciado-original"></a>

<details>
<summary><strong>Enunciado original</strong> (preservado sem alterações)</summary>

## Início

Bem vindo ao mundo da música!

Atualmente temos a necessidade de consumir os dados de faixas musicais através do código ISRC, que é uma das coisas mais importantes na indústria fonográfica.

Segundo [Abramus](https://www.abramus.org.br/musica/isrc/), ISRC (International Standard Recording Code ou Código de Gravação Padrão Internacional) é um padrão internacional de código para identificar de forma única as gravações (faixas).

Ele funciona como um código de barras da faixa.


## Problema

Durante o fechamento de contrato com um produtor, foram informados 10 ISRC's que não constam em nossas bases de dados, que seguem abaixo:

* NO1R42509310
* NO1R42511410
* BRC310600002
* BR1SP1200071
* BR1SP1200070
* BR1SP1500002
* BXKZM1900338
* BXKZM1900345
* QZNJX2081700
* QZNJX2078148

Precisamos obter e exibir os seguintes dados:

* Thumb do álbum
* Data de lançamento
* Título da faixa
* Lista dos artistas da faixa
* Duração da faixa em minutos e segundos (mm:ss)
* Player com prévia do áudio
* Link para a página da faixa no Spotify
* Sinalização dizendo se a faixa está ou não disponível no Brasil (BR)

Por decisão técnica, precisamos exibí-los através de uma webpage pública, ordenados por título da faixa de forma alfabética, sem necessidade de armazenamento para consulta posterior.

Caso a integração com o fornecedor dos dados não esteja disponível, um alerta deve ser dado ao usuário.


## Requisitos

* Faça um fork deste repositório e abra um PR quando estiver finalizado.
* O frontend deve ser no  deve ser feito em Angular versão LTS.
* A página deve ser responsiva para atender todos os tipos de dispositivos.
* Use a API do Spotify: [https://developer.spotify.com/](https://developer.spotify.com/) para coletar os dados das faixas.


## Diferencial

* Desenvolver testes unitários e de integração.


## O que será avaliado

* Fidelidade às instruções.
* Padrões de projeto.
* Clean Code e boas práticas.
* Boas práticas de versionamento.


## Perfil que buscamos

* Comunicativo
* Autodidata
* Automotivado
* Curioso
* Gostar de trabalhar em equipe
* Compromissado

</details>
