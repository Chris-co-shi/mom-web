import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'no-restricted-imports': ['error', { patterns: [
        { group: ['tdesign-vue-next', 'tdesign-vue-next/**', 'vxe-table', 'vxe-table/**', 'vxe-pc-ui', 'vxe-pc-ui/**'], message: '旧 UI 依赖已退出生产基线，请复用 MOM 共享组件。' },
      ] }],
    },
  },
  {
    files: ['src/modules/**/*.{ts,vue}', 'src/layouts/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['tdesign-vue-next', 'tdesign-vue-next/**', 'vxe-table', 'vxe-table/**', 'vxe-pc-ui', 'vxe-pc-ui/**', 'reka-ui', 'reka-ui/**', '@tanstack/vue-table'], message: '业务页面先使用 MOM 共享层；底层组件原语只能封装在共享层。' },
      ] }],
    },
  },
  {
    files: ['src/modules/**/pages/*ManagementPage.vue', 'src/modules/**/components/*ActionDialog.vue'],
    rules: {
      'vue/no-restricted-html-elements': ['error',
        { element: ['button', 'input', 'select', 'textarea'], message: 'CRUD 管理页交互控件须复用 MOM 共享组件；参见 docs/frontend/standards/crud-management-page-standard.md。' },
      ],
    },
  },
);
