<script setup lang="ts">
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
      <a-tag color="blue">Gateway: {{ gatewayUrl }}</a-tag>
    </a-layout-header>
    <a-layout>
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
          <a-alert type="info" show-icon message="当前为基础骨架与可运行原型壳，业务页面将在 VS-01 原型评审后逐步实现。" />
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
