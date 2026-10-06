/** 仅在国际化服务不可用或尚未加载时显示，不与数据库业务译文构成第二份权威。 */
export const emergencyMessages = {
  'zh-CN': {
    unavailable: '语言服务暂时不可用，请稍后重试。',
    retry: '重试',
    switchingFailed: '语言切换失败，请稍后重试。',
  },
  'en-US': {
    unavailable: 'The language service is unavailable. Please try again later.',
    retry: 'Retry',
    switchingFailed: 'Could not switch languages. Please try again.',
  },
} as const;
