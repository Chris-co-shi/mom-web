<script setup lang="ts">
import { login, logout, runtimeState, selectFactory } from './runtime';

const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const statistics = [
  { label: '待确认订单', value: 4 },
  { label: '生产中批次', value: 7 },
  { label: '待发货', value: 2 },
  { label: '质量反馈', value: 1 },
];
const workQueue = [
  '订单 SO-20260718-021 等待交期确认',
  '批次 FG-260718-03 正在质量放行',
  '发运计划 SH-20260719-002 等待装车',
];
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div><strong>客户协同门户</strong><span class="app-subtitle">Industrial MOM · V1</span></div>
      <a-space>
        <a-tag color="blue">Gateway: {{ gatewayUrl }}</a-tag>
        <template v-if="runtimeState.user">
          <a-tag color="green">{{ runtimeState.user.displayName }}</a-tag>
          <a-tag color="purple">Customer: {{ runtimeState.user.partyId }}</a-tag>
          <a-select v-if="runtimeState.user.factoryIds.length > 1" :value="runtimeState.user.currentFactoryId ?? undefined" placeholder="选择当前工厂" style="width: 180px" @change="selectFactory">
            <a-select-option v-for="factoryId in runtimeState.user.factoryIds" :key="factoryId" :value="factoryId">{{ factoryId }}</a-select-option>
          </a-select>
          <a-button @click="logout">退出</a-button>
        </template>
      </a-space>
    </a-layout-header>
    <a-layout-content class="app-content">
      <a-alert v-if="runtimeState.phase === 'error'" type="error" show-icon :message="runtimeState.error">
        <template #action><a-button danger @click="login">重新登录</a-button></template>
      </a-alert>
      <a-space v-else direction="vertical" :size="20" style="width: 100%">
        <div>
          <a-typography-title :level="2">客户协同门户</a-typography-title>
          <a-typography-paragraph type="secondary">跟踪订单、生产、质量和发运状态。</a-typography-paragraph>
        </div>
        <a-alert type="info" show-icon message="当前主体由 IAM 固定绑定，门户不提供 Customer 身份切换。" />
        <a-row :gutter="[16, 16]">
          <a-col v-for="item in statistics" :key="item.label" :xs="24" :sm="12" :xl="6">
            <a-card><a-statistic :title="item.label" :value="item.value" /></a-card>
          </a-col>
        </a-row>
        <a-card title="客户待办">
          <a-list :data-source="workQueue">
            <template #renderItem="{ item }"><a-list-item><a-tag color="processing">待处理</a-tag>{{ item }}</a-list-item></template>
          </a-list>
        </a-card>
      </a-space>
    </a-layout-content>
  </a-layout>
</template>
