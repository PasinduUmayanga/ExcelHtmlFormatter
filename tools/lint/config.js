// Shared ESLint configuration for the whole repo (used by ../../eslint.config.mjs).
// Lives here so the plugins resolve from this package (see package.json for why).
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/** Imports a layer must never use, with the reason shown in the lint error. */
const forbid = (names, why) => names.map((name) => ({ name, message: why }))
const forbidPatterns = (group, why) => [{ group, message: why }]

const NOT_IN_CORE = 'packages/core is pure: no Electron, Node, React, format libraries or other @hf packages.'
const NOT_IN_UI =
  'The window (@hf/ui, app renderer) runs sandboxed: no Electron, Node or format libraries. Use window.api.'
const NOT_IN_ADAPTER = 'Format adapters run in the worker: no Electron, React or other app layers.'
const NOT_IN_DESKTOP = 'The desktop shell is format-independent: no React or format adapters (apps inject them).'
const BROWSER_SAFE_FORMAT = "'./format' is imported by the window: it must stay free of ExcelJS and Node."
const PRELOAD = 'A sandboxed preload may only import electron at runtime (type imports are fine).'

const restrict = (paths = [], patterns = []) => ({
  '@typescript-eslint/no-restricted-imports': [
    'error',
    { paths, patterns: patterns.map((p) => ({ ...p, allowTypeImports: true })) }
  ]
})

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/coverage/**', '**/.turbo/**', 'docs/history/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // @hf/ui uses `/// <reference path>` on purpose: it makes apps that type-check the UI source
      // also see window.api and the *.css declaration (a .d.ts file cannot be imported).
      '@typescript-eslint/triple-slash-reference': ['error', { path: 'always', types: 'prefer-import', lib: 'always' }]
    }
  },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  {
    files: ['packages/ui/**/*.{ts,tsx}', 'apps/*/src/renderer/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest']
  },

  /* ---------- Package boundaries (see docs/architecture/SAD.md) ---------- */
  {
    files: ['packages/core/src/**'],
    rules: restrict(forbid(['electron', 'exceljs', 'react', 'react-dom', 'zustand'], NOT_IN_CORE), [
      ...forbidPatterns(['node:*', '@hf/*', '@tanstack/*'], NOT_IN_CORE)
    ])
  },
  {
    files: ['packages/adapter-excel/src/**'],
    rules: restrict(
      forbid(['electron', 'react', 'react-dom', 'zustand'], NOT_IN_ADAPTER),
      forbidPatterns(['@hf/ui', '@hf/desktop', '@hf/desktop/*', '@tanstack/*'], NOT_IN_ADAPTER)
    )
  },
  {
    files: ['packages/adapter-excel/src/format.ts'],
    rules: restrict(
      forbid(['exceljs'], BROWSER_SAFE_FORMAT),
      forbidPatterns(['node:*', './excel*'], BROWSER_SAFE_FORMAT)
    )
  },
  {
    files: ['packages/desktop/src/**'],
    rules: restrict(
      forbid(['exceljs', 'react', 'react-dom', 'zustand'], NOT_IN_DESKTOP),
      forbidPatterns(['@hf/ui', '@hf/adapter-*', '@tanstack/*'], NOT_IN_DESKTOP)
    )
  },
  {
    files: ['packages/desktop/src/preload/**'],
    rules: restrict([], forbidPatterns(['node:*', '@hf/*', '../*'], PRELOAD))
  },
  {
    files: ['packages/ui/src/**', 'apps/*/src/renderer/**'],
    rules: restrict(
      forbid(['electron', 'exceljs', '@hf/adapter-excel'], NOT_IN_UI),
      forbidPatterns(['node:*', '@hf/desktop', '@hf/desktop/*'], NOT_IN_UI)
    )
  },

  prettier
)
