import { apiPath } from "../api/config";
import { httpClient } from "../api/http-client";
import type { I18nMessage, I18nTranslation } from "./models";
import { i18nOwner } from "./i18n-owner-registry";
import type { I18nOwner } from "./runtime-api";

function path(owner: I18nOwner, suffix = ""): string {
  return apiPath(owner, `${i18nOwner(owner).managementPath}${suffix}`);
}

/** 管理端按 Owner 定位 API；写入由目标服务权限和本地 Key 唯一约束。 */
export const i18nManagementApi = {
  listMessages: (owner: I18nOwner, signal?: AbortSignal) =>
    httpClient.result<I18nMessage[]>({
      path: path(owner),
      signal,
    }),
  createMessage: (
    owner: I18nOwner,
    body: {
      messageKey: string;
      description: string | null;
      enabled: boolean;
    },
  ) =>
    httpClient.result<I18nMessage>({ path: path(owner), method: "POST", body }),
  updateMessage: (
    owner: I18nOwner,
    row: I18nMessage,
    body: { description: string | null; enabled: boolean; version: number },
  ) =>
    httpClient.result<I18nMessage>({
      path: path(owner, `/${encodeURIComponent(row.id)}`),
      method: "PUT",
      body,
    }),
  listTranslations: (
    owner: I18nOwner,
    messageId: string,
    signal?: AbortSignal,
  ) =>
    httpClient.result<I18nTranslation[]>({
      path: path(owner, `/${encodeURIComponent(messageId)}/translations`),
      signal,
    }),
  saveTranslation: (
    owner: I18nOwner,
    messageId: string,
    localeCode: string,
    messageText: string,
    version: number | null,
  ) =>
    httpClient.result<I18nTranslation>({
      path: path(
        owner,
        `/${encodeURIComponent(messageId)}/translations/${encodeURIComponent(localeCode)}`,
      ),
      method: "PUT",
      body: { messageText, version },
    }),
  duplicateMessageKeys: (owner: I18nOwner, messageId: string, localeCode: string, messageText: string) =>
    httpClient.result<string[]>({
      path: path(owner, `/duplicate-check/${encodeURIComponent(messageId)}/${encodeURIComponent(localeCode)}`),
      method: 'POST',
      body: { messageText },
    }),
};
