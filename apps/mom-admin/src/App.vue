<script setup lang="ts">
import { login, logout, runtimeState, selectFactory } from './runtime';

const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const statistics = [
  { label: '待处理到货', value: 12 },
  { label: '执行中工单', value: 6 },
  { label: '待放行批次', value: 4 },
  { label: '设备异常', value: 1 },
];
const workQueue = [
  '原料到货 DR-20260718-001 等待抽样',
  '工单 WO-20260718-006 等待投料确认',
  '成品批次 FG-260718-03 等待质量放行',
];
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div><strong>工业 MOM 运营工作台</strong><span class="app-subtitle">Industrial MOM · V1</span></div>
      <a-space>
        <a-tag color="blue">Gateway: {{ gatewayUrl }}</a-tag>
        <template v-if="runtimeState.user">
          <a-tag color="green">{{ runtimeState.user.displayName }}</a-tag>
          <a-select
            v-if="runtimeState.user.factoryIds.length > 1"
            :value="runtimeState.user.currentFactoryId ?? undefined"
            placeholder="选择当前工厂"
            style="width: 180px"
            @change="selectFactory"
          >
            <a-select-option v-for="factoryId in runtimeState.user.factoryIds" :key="factoryId" :value="factoryId">{{ factoryId }}</a-select-option>
          </a-select>
          <a-button @click="logout">退出</a-button>
        </template>
      </a-space>
    </a-layout-header>
    <a-layout-content v-if="runtimeState.phase === 'error'" class="app-content">
      <a-alert type="error" show-icon :message="runtimeState.error" description="认证状态未持久化，请重新进入 IAM 登录流程。">
        <template #action><a-button danger @click="login">重新登录</a-button></template>
      </a-alert>
    </a-layout-content>
    <a-layout v-else>
      <a-layout-sider width="232" theme="light" class="app-sider">
        <a-menu mode="inline" :selected-keys="['overview']">
          <a-menu-item key="overview">运营总览</a-menu-item>
          <a-menu-item key="workbench">业务工作台</a-menu-item>
          <a-menu-item key="traceability">批次追溯</a-menu-item>
          <a-menu-item key="integration">集成监控</a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout-content class="app-content">
        <a-space direction="vertical" :size="20" style="width: 100%">
          <div>
            <a-typography-title :level="2">工业 MOM 运营工作台</a-typography-title>
            <a-typography-paragraph type="secondary">统一承载生产、库存、质量、设备协同与批次追溯。</a-typography-paragraph>
          </div>
          <a-alert type="info" show-icon message="S08 Web Auth Runtime 已接入；前端权限只改善体验，服务端继续执行最终授权。" />
          <a-row :gutter="[16, 16]">
            <a-col v-for="item in statistics" :key="item.label" :xs="24" :sm="12" :xl="6">
              <a-card><a-statistic :title="item.label" :value="item.value" /></a-card>
            </a-col>
          </a-row>
          <a-card title="当前工作队列">
            <a-list :data-source="workQueue">
              <template #renderItem="{ item }"><a-list-item><a-tag color="processing">待处理</a-tag>{{ item }}</a-list-item></template>
            </a-list>
          </a-card>
        </a-space>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
