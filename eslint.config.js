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

const restrictDeclarations = (...allowed) => [
  'error',
  ...Object.entries(DECLARATION_BANS)
    .filter(([kind]) => !allowed.includes(kind))
    .flatMap(([, bans]) => bans),
];

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
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
