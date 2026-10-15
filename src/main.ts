import './style.css';
import './shared/ui/ui.css';
import { createApp } from 'vue';
import { createMomApp } from './app/create-app';
import MomUnavailableState from './shared/components/MomUnavailableState.vue';
import { emergencyLocale, emergencyMessages } from './shared/i18n/emergency-messages';

void createMomApp().then((app) => app.mount('#app')).catch(() => {
  const target = document.getElementById('app');
  if (!target) return;
  const locale = emergencyLocale();
  document.documentElement.lang = locale;
  document.title = `${emergencyMessages[locale].bootTitle} · MOM`;
  target.replaceChildren();
  createApp(MomUnavailableState, { mode: 'boot' }).mount(target);
});
