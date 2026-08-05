<script setup lang="ts">
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Empty,
  Row,
  Select,
  SelectOption,
  Space,
  Tag,
} from 'ant-design-vue';

import { ActionBar, Page, PortalShell } from '@mom/common-ui';
import { portalFeatures } from '@mom/portal-access';

import { login, logout, refreshAccess, runtimeState, selectFactory } from './runtime';

const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const entries = portalFeatures('supplier');

function restartLogin(): void {
  void login();
}

function handleFactoryChange(value: unknown): void {
  if (typeof value === 'string') selectFactory(value);
}
</script>

<template>
  <PortalShell subtitle="Phase 02 Ready" title="供应商协同门户">
    <template #identity>
      <Space wrap>
        <Tag color="blue">Gateway: {{ gatewayUrl }}</Tag>
        <template v-if="runtimeState.user">
          <Tag color="green">{{ runtimeState.user.displayName }}</Tag>
          <Tag color="purple">固定 Supplier · {{ runtimeState.user.partyId }}</Tag>
          <Button @click="logout">退出</Button>
        </template>
      </Space>
    </template>

    <Alert
      v-if="runtimeState.phase === 'error' && runtimeState.error"
      :message="runtimeState.error.title"
      show-icon
      type="error"
    >
      <template #description>
        {{ runtimeState.error.message }}
        <span v-if="runtimeState.error.correlationId">
          Correlation ID：{{ runtimeState.error.correlationId }}
        </span>
      </template>
      <template #action>
        <Space>
          <Button v-if="runtimeState.error.retryable" @click="refreshAccess">重新读取</Button>
          <Button danger @click="restartLogin">重新登录</Button>
        </Space>
      </template>
    </Alert>

    <Page
      v-else-if="runtimeState.user"
      description="当前主体由 IAM 固定绑定；页面不提供 Supplier ID 输入、选择或切换。"
      title="供应商协同门户"
    >
      <template #context>
        <Tag color="purple">SUPPLIER PORTAL</Tag>
      </template>

      <ActionBar label="供应商门户上下文操作">
        <template #context>
          <span class="section-copy">业务能力由 Feature Registry 管理；未启用项不会发起请求。</span>
        </template>
        <template #primary>
          <Button @click="refreshAccess">刷新授权上下文</Button>
        </template>
      </ActionBar>

      <Alert
        message="业务能力由 Feature Registry 管理；未启用项不会发起请求或显示可操作入口。"
        show-icon
        type="info"
      />

      <Card class="boundary-card" title="身份与数据范围">
        <Descriptions bordered :column="2">
          <DescriptionsItem label="Client">{{ runtimeState.user.clientId }}</DescriptionsItem>
          <DescriptionsItem label="User Type">{{ runtimeState.user.userType }}</DescriptionsItem>
          <DescriptionsItem label="固定 Party">
            {{ runtimeState.user.partyType }} · {{ runtimeState.user.partyId }}
          </DescriptionsItem>
          <DescriptionsItem label="当前 Factory">
            {{ runtimeState.user.currentFactoryId ?? '未选择' }}
          </DescriptionsItem>
        </Descriptions>
        <div class="factory-control">
          <div>
            <strong>Factory Scope</strong>
            <p>只能从 `/api/iam/me` 返回的范围选择；刷新后失效的偏好会被清除。</p>
          </div>
          <Select
            v-if="runtimeState.user.factoryIds.length"
            class="factory-select"
            placeholder="选择当前工厂"
            :value="runtimeState.user.currentFactoryId ?? undefined"
            @change="handleFactoryChange"
          >
            <SelectOption
              v-for="factoryId in runtimeState.user.factoryIds"
              :key="factoryId"
              :value="factoryId"
            >
              {{ factoryId }}
            </SelectOption>
          </Select>
          <Tag v-else color="orange">无 Factory Scope</Tag>
        </div>
      </Card>

      <div>
        <h2>业务能力</h2>
        <p class="section-copy">
          当前仅展示规划能力；切换为 enabled 后仍必须同时满足固定 Client、user_type、Party 和 Permission。
        </p>
      </div>
      <Row :gutter="[16, 16]">
        <Col v-for="entry in entries" :key="entry.key" :lg="8" :xs="24">
          <Card class="entry-card">
            <Tag color="default">规划中</Tag>
            <h3>{{ entry.title }}</h3>
            <p>{{ entry.description }}</p>
          </Card>
        </Col>
      </Row>

      <Card title="当前 Permission（只读）">
        <Space wrap>
          <Tag
            v-for="permission in runtimeState.user.permissions"
            :key="permission"
            color="blue"
          >
            {{ permission }}
          </Tag>
          <Empty
            v-if="runtimeState.user.permissions.length === 0"
            description="当前没有业务 Permission"
          />
        </Space>
      </Card>

      <Card title="明确错误语义">
        <div class="error-grid">
          <div><strong>403</strong><span>不刷新 Token，不伪装空数据</span></div>
          <div><strong>404</strong><span>不推断其他 Party/Factory 是否存在</span></div>
          <div><strong>409</strong><span>重新读取，不自动重放命令</span></div>
          <div><strong>网络/5xx</strong><span>显示 Correlation ID，结果未知先查询</span></div>
        </div>
      </Card>
    </Page>
  </PortalShell>
</template>
