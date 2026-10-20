<script setup lang="ts">
import { computed } from 'vue';
import { useLocale } from '../i18n/locale';

/** 数量始终按 Decimal String 传递；单位合法性与换算由业务层决定。 */
export interface QuantityUnit { value: string; label: string }
const props = withDefaults(defineProps<{
  modelValue: string; unitValue: string; units: readonly QuantityUnit[]; label: string;
  unitLabel?: string; disabled?: boolean; unitDisabled?: boolean; readonly?: boolean;
  required?: boolean; precision?: number; min?: string; max?: string; error?: string;
}>(), {});
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:unitValue': [value: string] }>();
const { tForOwner } = useLocale();
const unitName = computed(() => props.unitLabel ?? tForOwner('system', 'system.common.unit'));
const invalidUnit = computed(() => !!props.unitValue && !props.units.some(item => item.value === props.unitValue));
function decimalParts(value: string): { integer: bigint; scale: number } | undefined {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return undefined;
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  return { integer: BigInt(`${negative ? '-' : ''}${whole}${fraction}`), scale: fraction.length };
}
function compareDecimal(left: string, right: string): number | undefined {
  const a = decimalParts(left), b = decimalParts(right);
  if (!a || !b) return undefined;
  const scale = Math.max(a.scale, b.scale);
  const value = a.integer * 10n ** BigInt(scale - a.scale) - b.integer * 10n ** BigInt(scale - b.scale);
  return value < 0n ? -1 : value > 0n ? 1 : 0;
}
const invalidQuantity = computed(() => {
  if (!props.modelValue) return !!props.required;
  const parsed = decimalParts(props.modelValue);
  return !parsed || (props.precision !== undefined && parsed.scale > props.precision)
    || (props.min !== undefined && (compareDecimal(props.modelValue, props.min) ?? -1) < 0)
    || (props.max !== undefined && (compareDecimal(props.modelValue, props.max) ?? 1) > 0);
});
function updateQuantity(event: Event): void { emit('update:modelValue', (event.target as HTMLInputElement).value); }
function updateUnit(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (!props.disabled && !props.unitDisabled && props.units.some(item => item.value === value)) emit('update:unitValue', value);
}
</script>

<template>
  <div class="mom-quantity-input" :class="{ 'mom-quantity-input--invalid': !!error || invalidUnit || invalidQuantity,
    'mom-quantity-input--disabled': disabled }">
    <input class="mom-quantity-input__number" type="text" inputmode="decimal" :aria-label="label"
      :aria-invalid="!!error || invalidUnit || invalidQuantity" :value="modelValue" :disabled="disabled" :readonly="readonly"
      :required="required" :data-precision="precision" :data-min="min" :data-max="max" @input="updateQuantity" />
    <select class="mom-quantity-input__unit" :aria-label="unitName" :value="unitValue"
      :disabled="disabled || unitDisabled || readonly" :aria-invalid="invalidUnit" @change="updateUnit">
      <option v-for="unit in units" :key="unit.value" :value="unit.value">{{ unit.label }}</option>
    </select>
    <p v-if="error || invalidUnit || invalidQuantity" class="mom-quantity-input__error" role="alert">{{ error || tForOwner('system', 'system.common.invalidQuantity') }}</p>
  </div>
</template>
