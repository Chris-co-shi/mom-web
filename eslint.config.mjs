import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.tmp/**',
      'internal/**',
      'packages/@core/**',
      'packages/effects/**',
      'packages/constants/**',
      'packages/icons/**',
      'packages/locales/**',
      'packages/preferences/**',
      'packages/stores/**',
      'packages/styles/**',
      'packages/types/**',
      'packages/utils/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['error', 'info', 'warn'] }],
      'prefer-const': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
);
