/** Framework I18n Management API 的前端稳定模型，不归属于 System/Auth/MDM 任一业务模块。 */
export interface I18nMessage {
  id: string;
  namespace: string;
  messageKey: string;
  description: string | null;
  enabled: boolean;
  version: number;
  updatedAt: string;
}

/** 单 Message、单 Locale 的动态译文。 */
export interface I18nTranslation {
  id: string;
  messageId: string;
  localeCode: string;
  messageText: string;
  version: number;
  updatedAt: string;
}
