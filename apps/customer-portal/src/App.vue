<script setup lang="ts">
const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const statistics = [
  { label: '待发运订单', value: 4 },
  { label: '运输中', value: 2 },
  { label: '可下载 COA', value: 8 },
  { label: '处理中客诉', value: 1 },
];
const workQueue = [
  '订单 SO-202607-118 计划今日发运',
  '发运 SH-202607-086 已离厂',
  '投诉 CC-202607-003 正在进行批次影响分析',
];
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div><strong>客户协同门户</strong><span class="app-subtitle">Industrial MOM · V1</span></div>
      <a-tag color="blue">Gateway: {{ gatewayUrl }}</a-tag>
    </a-layout-header>
    <a-layout-content class="app-content">
      <a-space direction="vertical" :size="20" style="width: 100%">
        <div>
          <a-typography-title :level="2">客户协同门户</a-typography-title>
          <a-typography-paragraph type="secondary">查询订单与发运、下载质量文件、提交客诉并跟踪批次影响。</a-typography-paragraph>
        </div>
        <a-alert type="info" show-icon message="当前为独立部署的门户骨架，正式页面将在 VS-01 原型评审后实现。" />
        <a-row :gutter="[16, 16]">
          <a-col v-for="item in statistics" :key="item.label" :xs="24" :sm="12" :xl="6">
            <a-card><a-statistic :title="item.label" :value="item.value" /></a-card>
          </a-col>
        </a-row>
        <a-card title="客户待办">
          <a-list :data-source="workQueue">
            <template #renderItem="{ item }"><a-list-item><a-tag color="processing">进展</a-tag>{{ item }}</a-list-item></template>
          </a-list>
        </a-card>
      </a-space>
    </a-layout-content>
  </a-layout>
</template>
