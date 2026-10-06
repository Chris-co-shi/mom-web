import { apiPath } from '../../../shared/api/config';
import { httpClient } from '../../../shared/api/http-client';

export interface DictionaryType {
  id: string; code: string; name: string; enabled: boolean; description: string | null; version: number; updatedAt: string;
}
export interface DictionaryItem {
  id: string; typeId: string; key: string; value: string; sortOrder: number; enabled: boolean;
  description: string | null; version: number; updatedAt: string;
}
export interface SupportedLocale {
  id: string; localeCode: string; displayName: string; nativeName: string; enabled: boolean;
  defaultLocale: boolean; sortOrder: number; version: number; updatedAt: string;
}
export interface SystemMessage {
  id: string; namespace: string; messageKey: string; description: string | null;
  enabled: boolean; version: number; updatedAt: string;
}
export interface SystemTranslation {
  id: string; messageId: string; localeCode: string; messageText: string; version: number; updatedAt: string;
}

const dictionaryPath = '/admin/dictionaries';
const localePath = '/i18n/locales/admin';
const messagePath = '/admin/i18n/messages';
const resource = (base: string, id: string) => apiPath('system', `${base}/${encodeURIComponent(id)}`);
const dictionaryItemsPath = (typeId: string) => `${dictionaryPath}/${encodeURIComponent(typeId)}/items`;
const translationPath = (messageId: string, localeCode: string) => `${messagePath}/${encodeURIComponent(messageId)}/translations/${encodeURIComponent(localeCode)}`;

/** System 管理接口返回完整列表；搜索与分页只能在已加载数据上进行。写请求不自动重试。 */
export const systemApi = {
  listDictionaryTypes: (signal?: AbortSignal) => httpClient.result<DictionaryType[]>({ path: apiPath('system', dictionaryPath), signal }),
  createDictionaryType: (body: { code: string; name: string; enabled: boolean; description: string | null }) =>
    httpClient.result<DictionaryType>({ path: apiPath('system', dictionaryPath), method: 'POST', body }),
  updateDictionaryType: (id: string, body: { name: string; description: string | null; version: number }) =>
    httpClient.result<DictionaryType>({ path: resource(dictionaryPath, id), method: 'PUT', body }),
  setDictionaryTypeStatus: (row: DictionaryType, enabled: boolean) =>
    httpClient.result<DictionaryType>({ path: `${resource(dictionaryPath, row.id)}/status`, method: 'PATCH', body: { enabled, version: row.version } }),
  listDictionaryItems: (typeId: string, signal?: AbortSignal) =>
    httpClient.result<DictionaryItem[]>({ path: apiPath('system', dictionaryItemsPath(typeId)), signal }),
  createDictionaryItem: (typeId: string, body: { key: string; value: string; sortOrder: number; enabled: boolean; description: string | null }) =>
    httpClient.result<DictionaryItem>({ path: apiPath('system', dictionaryItemsPath(typeId)), method: 'POST', body }),
  updateDictionaryItem: (typeId: string, id: string, body: { value: string; sortOrder: number; description: string | null; version: number }) =>
    httpClient.result<DictionaryItem>({ path: resource(dictionaryItemsPath(typeId), id), method: 'PUT', body }),
  setDictionaryItemStatus: (typeId: string, row: DictionaryItem, enabled: boolean) =>
    httpClient.result<DictionaryItem>({ path: `${resource(dictionaryItemsPath(typeId), row.id)}/status`, method: 'PATCH', body: { enabled, version: row.version } }),

  listLocales: (signal?: AbortSignal) => httpClient.result<SupportedLocale[]>({ path: apiPath('system', localePath), signal }),
  createLocale: (body: { localeCode: string; displayName: string; nativeName: string; enabled: boolean; sortOrder: number }) =>
    httpClient.result<SupportedLocale>({ path: apiPath('system', localePath), method: 'POST', body }),
  updateLocale: (id: string, body: { displayName: string; nativeName: string; sortOrder: number; version: number }) =>
    httpClient.result<SupportedLocale>({ path: resource(localePath, id), method: 'PUT', body }),
  setLocaleStatus: (row: SupportedLocale, enabled: boolean) =>
    httpClient.result<SupportedLocale>({ path: `${resource(localePath, row.id)}/status`, method: 'PATCH', body: { enabled, version: row.version } }),
  makeDefaultLocale: (row: SupportedLocale) =>
    httpClient.result<SupportedLocale>({ path: `${resource(localePath, row.id)}/default`, method: 'POST', body: { version: row.version } }),

  listMessages: (namespace: string, signal?: AbortSignal) =>
    httpClient.result<SystemMessage[]>({ path: apiPath('system', messagePath), query: { namespace }, signal }),
  createMessage: (body: { namespace: string; messageKey: string; description: string | null; enabled: boolean }) =>
    httpClient.result<SystemMessage>({ path: apiPath('system', messagePath), method: 'POST', body }),
  updateMessage: (row: SystemMessage, body: { description: string | null; enabled: boolean; version: number }) =>
    httpClient.result<SystemMessage>({ path: resource(messagePath, row.id), method: 'PUT', body }),
  listTranslations: (messageId: string, signal?: AbortSignal) =>
    httpClient.result<SystemTranslation[]>({ path: apiPath('system', `${messagePath}/${encodeURIComponent(messageId)}/translations`), signal }),
  saveTranslation: (messageId: string, localeCode: string, messageText: string, version: number | null) =>
    httpClient.result<SystemTranslation>({ path: apiPath('system', translationPath(messageId, localeCode)), method: 'PUT', body: { messageText, version } }),
};
