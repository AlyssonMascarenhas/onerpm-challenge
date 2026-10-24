// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Code organization rules (ADR 0008): each kind of declaration lives in a dedicated file of its domain.
 * `restrictDeclarations('interface')` bans everything except interfaces, for `*.interfaces.ts` files.
 */
const CONSTANT_MESSAGE =
  'Declare UPPER_SNAKE_CASE constants in the domain "*.constants.ts" file (ADR 0008).';
const CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/.source;

const DECLARATION_BANS = {
  interface: [
    {
      selector: 'TSInterfaceDeclaration',
      message: 'Declare interfaces in the domain "*.interfaces.ts" file (ADR 0008).',
    },
  ],
  type: [
    {
      selector: 'TSTypeAliasDeclaration',
      message: 'Declare type aliases in the domain "*.types.ts" file (ADR 0008).',
    },
  ],
  enum: [
    {
      selector: 'TSEnumDeclaration',
      message: 'Declare enums in the domain "*.enums.ts" file (ADR 0008).',
    },
  ],
  constant: [
    {
      selector: `Program > VariableDeclaration[kind='const'] > VariableDeclarator[id.name=/${CONSTANT_NAME}/]`,
      message: CONSTANT_MESSAGE,
    },
    {
      selector: `Program > ExportNamedDeclaration > VariableDeclaration[kind='const'] > VariableDeclarator[id.name=/${CONSTANT_NAME}/]`,
      message: CONSTANT_MESSAGE,
    },
  ],
};

/**
 * @param {...string} allowed declaration kinds a file may contain
 * @returns {['error', ...unknown[]]}
 */
const restrictDeclarations = (...allowed) => [
  'error',
  ...Object.entries(DECLARATION_BANS)
    .filter(([kind]) => !allowed.includes(kind))
    .flatMap(([, bans]) => bans),
];

/**
 * Layer rules (ADR 0022): a folder only depends on the folders below it, never upwards.
 * `forbid('store', 'pages')` bans importing from any folder with those names.
 */
/**
 * @param {...string} layers
 * @returns {['error', ...unknown[]]}
 */
const forbid = (...layers) => [
  'error',
  {
    patterns: [
      {
        group: layers.map((layer) => `**/${layer}/**`),
        message: `This layer must not depend on ${layers.join(', ')} (ADR 0022).`,
      },
    ],
  },
];

const TRACKS_FEATURE = 'src/app/features/tracks';
/**
 * @param {string[]} files
 * @param {...string} layers
 */
const layerRule = (files, ...layers) => ({
  files,
  ignores: ['**/*.spec.ts', '**/testing/**'],
  rules: { 'no-restricted-imports': forbid(...layers) },
});

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'orp',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'orp',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/testing/**'],
    rules: {
      // Visibility is always explicit; constructors are the only exception (`public` is noise there).
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      // Private properties (including constructor parameter properties) start with an underscore.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['classProperty', 'parameterProperty'],
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        // Enum members are UPPER_SNAKE_CASE (`LookupStatus.NOT_FOUND`), like the constants.
        { selector: 'enumMember', format: ['UPPER_CASE'] },
      ],
      'no-restricted-syntax': restrictDeclarations(),
    },
  },
  {
    files: ['src/**/*.interfaces.ts'],
    ignores: ['**/testing/**'],
    rules: { 'no-restricted-syntax': restrictDeclarations('interface') },
  },
  {
    files: ['src/**/*.types.ts'],
    ignores: ['**/testing/**'],
    rules: { 'no-restricted-syntax': restrictDeclarations('type') },
  },
  {
    files: ['src/**/*.enums.ts'],
    ignores: ['**/testing/**'],
    rules: { 'no-restricted-syntax': restrictDeclarations('enum') },
  },
  {
    files: ['src/**/*.constants.ts'],
    ignores: ['**/testing/**'],
    rules: { 'no-restricted-syntax': restrictDeclarations('constant') },
  },
  // Front: pages → components → store → api / domain; components → spotify.
  layerRule(
    [`${TRACKS_FEATURE}/domain/**/*.ts`, `${TRACKS_FEATURE}/spotify/**/*.ts`],
    'api',
    'store',
    'components',
    'pages',
  ),
  layerRule([`${TRACKS_FEATURE}/api/**/*.ts`], 'store', 'components', 'pages'),
  layerRule([`${TRACKS_FEATURE}/store/**/*.ts`], 'components', 'pages'),
  layerRule([`${TRACKS_FEATURE}/components/**/*.ts`], 'pages'),
  // BFF: api → tracks (mapping, finder) → spotify → shared.
  layerRule(['src/bff/shared/**/*.ts'], 'api', 'spotify', 'tracks'),
  layerRule(['src/bff/spotify/**/*.ts'], 'api', 'tracks'),
  layerRule(['src/bff/tracks/mapping/**/*.ts'], 'api', 'finder'),
  layerRule(['src/bff/tracks/*.ts', 'src/bff/tracks/finder/**/*.ts'], 'api'),
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
