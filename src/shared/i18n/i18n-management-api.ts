import { apiPath } from '../api/config';
import { httpClient } from '../api/http-client';
import type { SystemMessage, SystemTranslation } from '../../modules/system/api/system-api';
import { i18nOwner } from './i18n-owner-registry';
import type { I18nOwner } from './runtime-api';

function path(owner: I18nOwner, suffix = ''): string {
  return apiPath(owner, `${i18nOwner(owner).managementPath}${suffix}`);
}

/** 管理端按 Owner 定位 API；写入由目标服务权限和 namespace 策略双重约束。 */
export const i18nManagementApi = {
  listMessages: (owner: I18nOwner, namespace: string, signal?: AbortSignal) =>
    httpClient.result<SystemMessage[]>({ path: path(owner), query: { namespace }, signal }),
  createMessage: (owner: I18nOwner, body: { namespace: string; messageKey: string; description: string | null; enabled: boolean }) =>
    httpClient.result<SystemMessage>({ path: path(owner), method: 'POST', body }),
  updateMessage: (owner: I18nOwner, row: SystemMessage, body: { description: string | null; enabled: boolean; version: number }) =>
    httpClient.result<SystemMessage>({ path: path(owner, `/${encodeURIComponent(row.id)}`), method: 'PUT', body }),
  listTranslations: (owner: I18nOwner, messageId: string, signal?: AbortSignal) =>
    httpClient.result<SystemTranslation[]>({ path: path(owner, `/${encodeURIComponent(messageId)}/translations`), signal }),
  saveTranslation: (owner: I18nOwner, messageId: string, localeCode: string, messageText: string, version: number | null) =>
    httpClient.result<SystemTranslation>({ path: path(owner, `/${encodeURIComponent(messageId)}/translations/${encodeURIComponent(localeCode)}`), method: 'PUT', body: { messageText, version } }),
};
