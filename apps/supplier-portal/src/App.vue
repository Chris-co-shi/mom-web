<script setup lang="ts">
import { portalFeatures } from '@mom/portal-access';

import { login, logout, refreshAccess, runtimeState, selectFactory } from './runtime';

const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const entries = portalFeatures('supplier');
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div><strong>供应商协同门户</strong><span class="app-subtitle">Phase 02 Ready</span></div>
      <a-space>
        <a-tag color="blue">Gateway: {{ gatewayUrl }}</a-tag>
        <template v-if="runtimeState.user">
          <a-tag color="green">{{ runtimeState.user.displayName }}</a-tag>
          <a-tag color="purple">固定 Supplier · {{ runtimeState.user.partyId }}</a-tag>
          <a-button @click="logout">退出</a-button>
        </template>
      </a-space>
    </a-layout-header>

    <a-layout-content class="app-content">
      <a-alert v-if="runtimeState.phase === 'error' && runtimeState.error" type="error" show-icon :message="runtimeState.error.title">
        <template #description>{{ runtimeState.error.message }}<span v-if="runtimeState.error.correlationId"> Correlation ID：{{ runtimeState.error.correlationId }}</span></template>
        <template #action><a-space><a-button v-if="runtimeState.error.retryable" @click="refreshAccess">重新读取</a-button><a-button danger @click="login">重新登录</a-button></a-space></template>
      </a-alert>

      <a-spin v-else-if="runtimeState.phase === 'starting'" tip="正在重新校验身份、Party 与 Factory Scope"><div class="loading-space" /></a-spin>

      <div v-else-if="runtimeState.user" class="portal-page">
        <div class="hero"><div><a-tag color="purple">SUPPLIER PORTAL</a-tag><h1>供应商协同门户</h1><p>当前主体由 IAM 固定绑定；页面不提供 Supplier ID 输入、选择或切换。</p></div><a-button @click="refreshAccess">刷新授权上下文</a-button></div>

        <a-alert type="info" show-icon message="业务能力由 Feature Registry 管理；未启用项不会发起请求或显示可操作入口。" />

        <a-card title="身份与数据范围" class="boundary-card">
          <a-descriptions bordered :column="2">
            <a-descriptions-item label="Client">{{ runtimeState.user.clientId }}</a-descriptions-item>
            <a-descriptions-item label="User Type">{{ runtimeState.user.userType }}</a-descriptions-item>
            <a-descriptions-item label="固定 Party">{{ runtimeState.user.partyType }} · {{ runtimeState.user.partyId }}</a-descriptions-item>
            <a-descriptions-item label="当前 Factory">{{ runtimeState.user.currentFactoryId ?? '未选择' }}</a-descriptions-item>
          </a-descriptions>
          <div class="factory-control"><div><strong>Factory Scope</strong><p>只能从 `/api/iam/me` 返回的范围选择；刷新后失效的偏好会被清除。</p></div><a-select v-if="runtimeState.user.factoryIds.length" :value="runtimeState.user.currentFactoryId ?? undefined" placeholder="选择当前工厂" style="width: 240px" @change="selectFactory"><a-select-option v-for="factoryId in runtimeState.user.factoryIds" :key="factoryId" :value="factoryId">{{ factoryId }}</a-select-option></a-select><a-tag v-else color="orange">无 Factory Scope</a-tag></div>
        </a-card>

        <div><h2>业务能力</h2><p class="section-copy">当前仅展示规划能力；切换为 enabled 后仍必须同时满足固定 Client、user_type、Party 和 Permission。</p></div>
        <a-row :gutter="[16, 16]"><a-col v-for="entry in entries" :key="entry.key" :xs="24" :lg="8"><a-card class="entry-card"><a-tag color="default">规划中</a-tag><h3>{{ entry.title }}</h3><p>{{ entry.description }}</p></a-card></a-col></a-row>

        <a-card title="当前 Permission（只读）"><a-space wrap><a-tag v-for="permission in runtimeState.user.permissions" :key="permission" color="blue">{{ permission }}</a-tag><a-empty v-if="runtimeState.user.permissions.length === 0" description="当前没有业务 Permission" /></a-space></a-card>

        <a-card title="明确错误语义"><div class="error-grid"><div><strong>403</strong><span>不刷新 Token，不伪装空数据</span></div><div><strong>404</strong><span>不推断其他 Party/Factory 是否存在</span></div><div><strong>409</strong><span>重新读取，不自动重放命令</span></div><div><strong>网络/5xx</strong><span>显示 Correlation ID，结果未知先查询</span></div></div></a-card>
      </div>
    </a-layout-content>
  </a-layout>
</template>
