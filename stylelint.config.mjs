export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-vue',
  ],
  ignoreFiles: [
    '**/dist/**',
    '**/node_modules/**',
    'internal/**',
    'packages/@core/**',
    'packages/design-tokens/src/generated/**',
    'packages/effects/**',
  ],
  rules: {
    'custom-property-pattern': null,
    'declaration-block-single-line-max-declarations': null,
    'import-notation': 'string',
    'selector-class-pattern': null,
  },
};
