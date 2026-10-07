/** 仅在国际化服务不可用或尚未加载时显示，不与数据库业务译文构成第二份权威。 */
export const emergencyMessages = {
  'zh-CN': {
    unavailable: '语言服务暂时不可用，请稍后重试。',
    eyebrow: 'MOM · 连接状态',
    bootTitle: '页面暂时无法启动',
    bootDescription: '应用初始化未能完成，可能是连接或服务暂时异常。请检查网络后重试。',
    routeTitle: '暂时无法打开此页面',
    routeDescription: '所需服务暂时不可用。你要访问的页面已保留，重新连接后会再次打开。',
    retry: '重新连接',
    reference: '状态编号',
    switchingFailed: '语言切换失败，请稍后重试。',
  },
  'en-US': {
    unavailable: 'The language service is unavailable. Please try again later.',
    eyebrow: 'MOM · Connection status',
    bootTitle: 'This page could not start',
    bootDescription: 'The app could not finish starting. A connection or service may be temporarily unavailable. Check your network and try again.',
    routeTitle: 'This page is temporarily unavailable',
    routeDescription: 'A required service is unavailable. Your destination is preserved for the next attempt.',
    retry: 'Reconnect',
    reference: 'Reference',
    switchingFailed: 'Could not switch languages. Please try again.',
  },
} as const;

/** 故障页不能依赖远端 Bundle；已挂载路由优先沿用当前语言，启动时采用本机偏好。 */
export function emergencyLocale(routeReady = false): keyof typeof emergencyMessages {
  const active = document.documentElement.lang.toLowerCase();
  if (routeReady && (active === 'en-us' || active === 'zh-cn')) {
    return active === 'en-us' ? 'en-US' : 'zh-CN';
  }
  let stored: string | null = null;
  try { stored = window.localStorage.getItem('mom.locale.preference'); } catch { /* 存储不可用时退回浏览器语言。 */ }
  const preferred = stored ?? navigator.language;
  return preferred.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}
