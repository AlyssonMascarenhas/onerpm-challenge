# 0005 — Regras de consulta ao Spotify em 2026

- **Status:** Aceito
- **Data:** 2026-10-23

## Contexto

A Spotify Web API mudou em fev/2026 ([migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)):
`available_markets` foi removido, `/search` aceita `limit` até 10 e os endpoints batch deixaram de existir.
Fizemos um **spike** (Client Credentials, os 10 ISRCs do enunciado, 2026-10-23) para validar o comportamento real.

Resultados do spike:

- `GET /search?q=isrc:{ISRC}&type=track&market=BR&limit=10` encontrou **todos** os 10 ISRCs, com `external_ids.isrc`.
- Com `market=BR` a resposta traz `is_playable`; todos vieram `true`, sem `restrictions`.
- O campo **`preview_url` não existe** na resposta (nem como `null`).
- 4 ISRCs retornaram **duas faixas** (álbum + single, ou dois singles).
- `album.images` vem em 640/300/64 px; `release_date_precision` foi `day` em todos.

## Decisão

1. **Disponibilidade no Brasil** = existe resultado com `market=BR` e `is_playable === true`. Se só houver resultado
   sem `market`, a faixa é marcada como **indisponível no BR**; sem resultado nenhum, `not_found`.
2. **Várias faixas por ISRC:** entre as tocáveis, escolher a de **menor `release_date`** (lançamento original);
   empate resolvido pela ordem retornada pelo Spotify. Determinístico e testável.
3. **Player de prévia:** usar o **embed oficial** do Spotify (`open.spotify.com/embed/track/{id}`), já que
   `preview_url` não é fornecido. Sem fontes de áudio de terceiros.
4. **Thumb:** imagem de ~300 px. **Data de lançamento** formatada conforme a precisão (ano, mês ou dia) e o idioma.
5. **Resiliência:** concorrência limitada, respeito a `Retry-After` (429), um retry com novo token em 401.
   Falha geral do Spotify vira erro estável (502/503) que o front exibe como alerta.

## Alternativas consideradas

- **Deezer por ISRC para a prévia** — dá `<audio>`, mas introduz fonte de dados fora do enunciado.
- **`GET /tracks/{id}?market=BR`** por faixa — uma chamada extra por ISRC sem ganho, pois o search já retorna `is_playable`.
- **Escolher a primeira faixa retornada** — não determinístico quando há duplicatas.

## Consequências

- Positivas: regras verificadas com dados reais; os JSONs do spike viram fixtures dos testes de integração.
- Negativas: o embed é um iframe de terceiro (peso e requisitos de CSP); a prévia depende do Spotify.
- Risco: Spotify pode alterar os campos de novo — o mapper (anti-corruption layer) concentra esse impacto.
