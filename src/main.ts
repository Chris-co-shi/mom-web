import './style.css';
import './shared/ui/ui.css';
import { createMomApp } from './app/create-app';
import { emergencyMessages } from './shared/i18n/emergency-messages';

void createMomApp().then((app) => app.mount('#app')).catch(() => {
  const target = document.getElementById('app');
  if (!target) return;
  const english = navigator.language.toLowerCase().startsWith('en');
  const messages = english ? emergencyMessages['en-US'] : emergencyMessages['zh-CN'];
  target.replaceChildren();
  const panel = document.createElement('main');
  panel.className = 'mom-i18n-emergency';
  const message = document.createElement('p');
  message.textContent = messages.unavailable;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = messages.retry;
  retry.addEventListener('click', () => window.location.reload());
  panel.append(message, retry);
  target.append(panel);
});
