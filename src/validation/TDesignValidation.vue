<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import type { Directive } from 'vue';
import Button from 'tdesign-vue-next/es/button';
import Dialog from 'tdesign-vue-next/es/dialog';
import { Form, FormItem } from 'tdesign-vue-next/es/form';
import Input from 'tdesign-vue-next/es/input';
import { Option, Select } from 'tdesign-vue-next/es/select';
import { PrimaryTable } from 'tdesign-vue-next/es/table';
import Tag from 'tdesign-vue-next/es/tag';
import Tree from 'tdesign-vue-next/es/tree';
import type { PrimaryTableCol } from 'tdesign-vue-next/es/table';
import PageContainer from '../shared/components/PageContainer.vue';
import LocaleSwitcher from '../shared/i18n/LocaleSwitcher.vue';
import { useLocale } from '../shared/i18n/locale';
import ThemeSwitcher from '../shared/theme/ThemeSwitcher.vue';
import './validation.css';

interface CapabilityRow {
  id: string;
  capability: string;
  scene: string;
  status: string;
  evidence: string;
}

interface NativeInputLabelBinding {
  id: string;
  label: string;
}

const dialogVisible = ref(false);
const { t } = useLocale();

/**
 * TDesign 1.20.9 的 Input 未把 id/aria-label 透传到原生 input。
 * 验证页显式补齐关联，用于确认后续基础组件适配层必须承担该无障碍职责。
 */
function applyNativeInputLabel(element: HTMLElement, binding: NativeInputLabelBinding): void {
  const input = element.querySelector('input');
  input?.setAttribute('id', binding.id);
  input?.setAttribute('aria-label', binding.label);
}

const vNativeInputLabel: Directive<HTMLElement, NativeInputLabelBinding> = {
  mounted: (element, binding) => applyNativeInputLabel(element, binding.value),
  updated: (element, binding) => applyNativeInputLabel(element, binding.value),
};

const formData = reactive({
  name: '',
  scenario: 'management',
});

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'capability', title: t('validation.table.capability'), width: 150 },
  { colKey: 'scene', title: t('validation.table.scene'), minWidth: 260 },
  { colKey: 'status', title: t('validation.table.status'), width: 120 },
  { colKey: 'evidence', title: t('validation.table.evidence'), minWidth: 260 },
]);

const capabilityRows = computed<CapabilityRow[]>(() => [
  {
    id: 'table',
    capability: 'Table',
    scene: t('validation.capability.table.scene'),
    status: t('validation.capability.status'),
    evidence: t('validation.capability.table.evidence'),
  },
  {
    id: 'form',
    capability: 'Form',
    scene: t('validation.capability.form.scene'),
    status: t('validation.capability.status'),
    evidence: t('validation.capability.form.evidence'),
  },
  {
    id: 'tree',
    capability: 'Tree',
    scene: t('validation.capability.tree.scene'),
    status: t('validation.capability.status'),
    evidence: t('validation.capability.tree.evidence'),
  },
  {
    id: 'dialog',
    capability: 'Dialog',
    scene: t('validation.capability.dialog.scene'),
    status: t('validation.capability.status'),
    evidence: t('validation.capability.dialog.evidence'),
  },
  {
    id: 'theme',
    capability: 'Theme',
    scene: t('validation.capability.theme.scene'),
    status: t('validation.capability.status'),
    evidence: t('validation.capability.theme.evidence'),
  },
]);

const treeData = computed(() => [
  {
    label: t('validation.tree.platform'),
    value: 'platform',
    children: [
      { label: 'IAM', value: 'iam' },
      { label: 'System', value: 'system' },
      { label: 'MDM', value: 'mdm' },
    ],
  },
  {
    label: t('validation.tree.operations'),
    value: 'operations',
    children: [
      { label: 'WMS', value: 'wms' },
      { label: 'QMS', value: 'qms' },
      { label: 'MES', value: 'mes' },
    ],
  },
]);

function getDialogFocusTargets(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '.t-dialog__ctx button:not([disabled]), .t-dialog__ctx [tabindex="0"]',
    ),
  );
}

function handleDialogOpened(): void {
  getDialogFocusTargets()[0]?.focus();
}

async function openDialog(): Promise<void> {
  dialogVisible.value = true;
  await nextTick();
  window.requestAnimationFrame(handleDialogOpened);
}

function handleDialogClosed(): void {
  document.getElementById('open-validation-dialog')?.focus();
}

function handleDialogKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }

  const targets = getDialogFocusTargets();
  const first = targets[0];
  const last = targets.at(-1);
  if (!first || !last) {
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

</script>

<template>
  <PageContainer class="validation-shell">
      <section class="validation-toolbar" :aria-label="t('validation.toolbarAria')">
        <div>
          <span>VALIDATION CONTROLS</span>
          <strong>{{ t('validation.controls') }}</strong>
        </div>

        <div class="header-controls" :aria-label="t('validation.preferencesAria')">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </section>

      <section class="validation-hero" aria-labelledby="validation-title">
        <div>
          <div class="eyebrow">
            <span class="live-dot" aria-hidden="true"></span>
            WEB-P1-S01 · COMPONENT LIBRARY VALIDATION
          </div>
          <h1 id="validation-title">{{ t('validation.title') }}</h1>
          <p>{{ t('validation.description') }}</p>
        </div>

        <div class="hero-status" :aria-label="t('validation.statusAria')">
          <span>LIBRARY</span>
          <strong>TDesign 1.20.9</strong>
          <Tag theme="primary" variant="light">{{ t('validation.status') }}</Tag>
        </div>
      </section>

      <section class="validation-grid" :aria-label="t('validation.regionAria')">
        <article class="surface surface-wide">
          <div class="surface-heading">
            <div>
              <span class="section-index">01 / DATA</span>
              <h2>{{ t('validation.table.title') }}</h2>
            </div>
            <div class="status-legend" :aria-label="t('validation.table.semanticAria')">
              <Tag theme="success" variant="light">{{ t('validation.table.pass') }}</Tag>
              <Tag theme="warning" variant="light">{{ t('validation.table.attention') }}</Tag>
              <Tag theme="danger" variant="light">{{ t('validation.table.blocked') }}</Tag>
            </div>
          </div>

          <PrimaryTable
            row-key="id"
            :columns="columns"
            :data="capabilityRows"
            :pagination="{ defaultPageSize: 5, total: capabilityRows.length }"
            hover
            stripe
          />
        </article>

        <article class="surface">
          <div class="surface-heading">
            <div>
              <span class="section-index">02 / HIERARCHY</span>
              <h2>{{ t('validation.tree.title') }}</h2>
            </div>
          </div>
          <p class="surface-description">{{ t('validation.tree.description') }}</p>
          <Tree :data="treeData" :expand-all="true" activable hover />
        </article>

        <article class="surface">
          <div class="surface-heading">
            <div>
              <span class="section-index">03 / INPUT</span>
              <h2>{{ t('validation.form.title') }}</h2>
            </div>
          </div>
          <Form :data="formData" label-align="top">
            <FormItem for="validation-name" :label="t('validation.form.name')" name="name">
              <Input
                v-native-input-label="{ id: 'validation-name', label: t('validation.form.name') }"
                v-model="formData.name"
                :placeholder="t('validation.form.namePlaceholder')"
                clearable
              />
            </FormItem>
            <FormItem for="validation-scenario" :label="t('validation.form.scenario')" name="scenario">
              <Select
                v-native-input-label="{ id: 'validation-scenario', label: t('validation.form.scenario') }"
                v-model="formData.scenario"
              >
                <Option :label="t('validation.tree.platform')" value="management" />
                <Option :label="t('validation.tree.operations')" value="operations" />
                <Option :label="t('validation.form.recovery')" value="recovery" />
              </Select>
            </FormItem>
            <div class="form-actions">
              <Button id="open-validation-dialog" theme="primary" @click="openDialog">
                {{ t('validation.form.openDialog') }}
              </Button>
              <Button variant="outline" @click="formData.name = ''">{{ t('validation.form.reset') }}</Button>
            </div>
          </Form>
        </article>
      </section>

      <footer class="validation-footer">
        <span>{{ t('validation.footer.localOnly') }}</span>
        <span>{{ t('validation.footer.viewport') }}</span>
      </footer>

      <Dialog
        v-model:visible="dialogVisible"
        :aria-label="t('validation.dialog.title')"
        aria-modal="true"
        :header="t('validation.dialog.title')"
        :confirm-btn="t('validation.dialog.confirm')"
        :cancel-btn="t('validation.dialog.cancel')"
        role="dialog"
        @closed="handleDialogClosed"
        @confirm="dialogVisible = false"
        @keydown="handleDialogKeydown"
        @opened="handleDialogOpened"
      >
        <p class="dialog-copy">
          {{ t('validation.dialog.description') }}
        </p>
      </Dialog>
  </PageContainer>
</template>
