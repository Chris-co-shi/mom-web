<script setup lang="ts">
const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const statistics = [
  { label: '今日送货', value: 3 },
  { label: '待确认预约', value: 2 },
  { label: '检验中批次', value: 5 },
  { label: '质量协同', value: 1 },
];
const workQueue = [
  '送货计划 DN-20260718-011 等待工厂确认',
  '原料批次 RM-260718-08 正在检验',
  'SCAR-202607-02 等待原因分析',
];
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div><strong>供应商协同门户</strong><span class="app-subtitle">Industrial MOM · V1</span></div>
      <a-tag color="blue">Gateway: {{ gatewayUrl }}</a-tag>
    </a-layout-header>
    <a-layout-content class="app-content">
      <a-space direction="vertical" :size="20" style="width: 100%">
        <div>
          <a-typography-title :level="2">供应商协同门户</a-typography-title>
          <a-typography-paragraph type="secondary">提交送货计划、跟踪来料检验、处理退货与质量协同。</a-typography-paragraph>
        </div>
        <a-alert type="info" show-icon message="当前为独立部署的门户骨架，正式页面将在 VS-01 原型评审后实现。" />
        <a-row :gutter="[16, 16]">
          <a-col v-for="item in statistics" :key="item.label" :xs="24" :sm="12" :xl="6">
            <a-card><a-statistic :title="item.label" :value="item.value" /></a-card>
          </a-col>
        </a-row>
        <a-card title="供应商待办">
          <a-list :data-source="workQueue">
            <template #renderItem="{ item }"><a-list-item><a-tag color="processing">待处理</a-tag>{{ item }}</a-list-item></template>
          </a-list>
        </a-card>
      </a-space>
    </a-layout-content>
  </a-layout>
</template>
