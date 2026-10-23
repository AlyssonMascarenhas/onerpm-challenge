import { readFileSync, writeFileSync } from 'node:fs';
const edit = (file, pairs) => {
  let s = readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    if (!s.includes(from)) throw new Error(`${file}: missing ${from.slice(0, 60)}`);
    s = s.split(from).join(to);
  }
  writeFileSync(file, s);
};
edit('.github/workflows/ci.yml', [
  ['timeout 180 npx playwright install chromium', 'timeout --kill-after=10 120 npx playwright install chromium'],
  ['timeout 180 npx playwright install-deps chromium', 'timeout --kill-after=10 120 npx playwright install-deps chromium'],
  ['        timeout-minutes: 10\n        run: |\n          for attempt in 1 2 3; do\n            timeout --kill-after=10 120 npx playwright install chromium', '        timeout-minutes: 8\n        run: |\n          for attempt in 1 2 3; do\n            timeout --kill-after=10 120 npx playwright install chromium'],
  ['        timeout-minutes: 10\n        run: |\n          if node -e', '        timeout-minutes: 8\n        run: |\n          if node -e'],
  ['    runs-on: ubuntu-24.04\n    timeout-minutes: 20\n    steps:\n      - name: Check out\n        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1\n        with:\n          persist-credentials: false\n\n      - name: Set up project\n        uses: ./.github/actions/setup-project\n\n      #', '    runs-on: ubuntu-24.04\n    timeout-minutes: 30\n    steps:\n      - name: Check out\n        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1\n        with:\n          persist-credentials: false\n\n      - name: Set up project\n        uses: ./.github/actions/setup-project\n\n      #'],
  ['        run: echo "version=$(npx playwright --version | awk \'{print $NF}\')" >> "$GITHUB_OUTPUT"', '        run: |\n          version="$(npx playwright --version | awk \'{print $NF}\')"\n          test -n "$version"\n          echo "version=$version" >> "$GITHUB_OUTPUT"'],
]);
edit('docs/adr/0009-ci-com-github-actions.md', [[
  `próprio, e o \`apt\` só é usado se o Chromium não abrir sem ele (a imagem \`ubuntu-24.04\` já traz quase tudo). \`npm run
  e2e:install\` continua valendo para a máquina local.`,
  `próprio, e o \`apt\` só é usado se o Chromium não abrir sem ele (a imagem \`ubuntu-24.04\` já traz quase tudo). O comando
  local \`npm run e2e:install\` não mudou. Limites: como o CI só roda em PRs, o _cache_ vale para novas execuções do mesmo
  PR (não para outros); e sem o \`--with-deps\` as fontes extras deixam de ser instaladas (a imagem fixa e a fonte Inter
  empacotada mantêm o layout estável; se aparecer variação visual, voltar a instalá-las).`,
]]);
