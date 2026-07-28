import { createPinia } from 'pinia';
import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import '@mom/design-tokens/styles.css';
import '@mom/common-ui/styles.css';

import AuthGate from './AuthGate.vue';
import { bootstrapRuntime } from './runtime';
import './styles.css';

async function start(): Promise<void> {
  await bootstrapRuntime();
  createApp(AuthGate).use(createPinia()).use(Antd).mount('#app');
}

void start();
