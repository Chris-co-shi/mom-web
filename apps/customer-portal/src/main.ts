import { createPinia } from 'pinia';
import { createApp } from 'vue';
import 'ant-design-vue/dist/reset.css';

import '@mom/common-ui/styles.css';
import '@mom/design-tokens/styles.css';

import RootApp from './root.vue';
import { bootstrapRuntime } from './runtime';
import './styles.css';

async function start(): Promise<void> {
  await bootstrapRuntime();
  createApp(RootApp).use(createPinia()).mount('#app');
}

void start();
