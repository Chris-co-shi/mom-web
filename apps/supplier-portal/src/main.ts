import { createPinia } from 'pinia';
import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';

import App from './App.vue';
import { bootstrapRuntime } from './runtime';
import './styles.css';

async function start(): Promise<void> {
  const shouldMount = await bootstrapRuntime();
  if (!shouldMount) return;
  createApp(App).use(createPinia()).use(Antd).mount('#app');
}

void start();
