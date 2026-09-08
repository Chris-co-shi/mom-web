<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ApiError } from '../api/http';
import { listUsers, type User } from '../api/user';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const records = ref<User[]>([]);
const pageNo = ref(1);
const pageSize = 20;
const total = ref(0);
const totalPages = ref(0);
const loading = ref(false);
const errorMessage = ref('');

const canGoPrevious = computed(() => pageNo.value > 1 && !loading.value);
const canGoNext = computed(() => pageNo.value < totalPages.value && !loading.value);

async function loadUsers() {
  const token = auth.accessToken;

  if (!token) {
    await router.replace('/login');
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const page = await listUsers({
      token,
      pageNo: pageNo.value,
      pageSize,
    });

    records.value = page.records;
    pageNo.value = page.pageNo;
    total.value = page.total;
    totalPages.value = page.totalPages;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      auth.clearSession();
      await router.replace('/login');
      return;
    }

    errorMessage.value = error instanceof ApiError
      ? error.message
      : '用户数据加载失败，请确认 Gateway 与 Auth 服务状态';
  } finally {
    loading.value = false;
  }
}

async function goPrevious() {
  if (!canGoPrevious.value) return;
  pageNo.value -= 1;
  await loadUsers();
}

async function goNext() {
  if (!canGoNext.value) return;
  pageNo.value += 1;
  await loadUsers();
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

onMounted(loadUsers);
</script>

<template>
  <section class="page-section">
    <div class="page-header">
      <div>
        <p class="eyebrow">Mini Auth</p>
        <h1>用户管理</h1>
        <p>当前页面直接读取 mom-platform 的真实用户分页接口。</p>
      </div>

      <button class="button button-secondary" type="button" :disabled="loading" @click="loadUsers">
        刷新
      </button>
    </div>

    <p v-if="errorMessage" class="page-error">{{ errorMessage }}</p>

    <div class="table-card">
      <div v-if="loading" class="table-state">正在加载用户…</div>

      <div v-else class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>显示名称</th>
              <th>状态</th>
              <th>版本</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in records" :key="user.id">
              <td class="cell-strong">{{ user.username }}</td>
              <td>{{ user.displayName || '-' }}</td>
              <td>
                <span class="status-badge" :class="user.enabled ? 'status-enabled' : 'status-disabled'">
                  {{ user.enabled ? '启用' : '停用' }}
                </span>
              </td>
              <td>{{ user.version }}</td>
              <td>{{ formatTime(user.updatedAt) }}</td>
            </tr>
            <tr v-if="records.length === 0">
              <td class="empty-cell" colspan="5">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination-bar">
        <span>共 {{ total }} 条，第 {{ pageNo }} / {{ Math.max(totalPages, 1) }} 页</span>
        <div class="pagination-actions">
          <button class="button button-secondary" type="button" :disabled="!canGoPrevious" @click="goPrevious">
            上一页
          </button>
          <button class="button button-secondary" type="button" :disabled="!canGoNext" @click="goNext">
            下一页
          </button>
        </div>
      </footer>
    </div>
  </section>
</template>
