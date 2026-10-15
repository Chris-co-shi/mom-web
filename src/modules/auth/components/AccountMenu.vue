<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown, KeyRound, LogOut, Settings } from '@lucide/vue';
import { RouterLink } from 'vue-router';
import MomButton from '../../../shared/ui/MomButton.vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../shared/ui/dropdown-menu';
import { ROUTE_NAMES } from '../../../router/route-names';

const props = defineProps<{
  accountName: string;
  accountLabel: string;
  passwordLabel: string;
  logoutLabel: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ logout: [] }>();

const initials = computed(() => {
  const name = props.accountName.trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}`.toUpperCase();
  return [...name].slice(0, 2).join('').toUpperCase() || 'ME';
});
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child :disabled="disabled">
      <MomButton class="app-account-menu__trigger" variant="ghost" :aria-label="accountLabel" :disabled="disabled">
        <span class="app-account-menu__avatar" aria-hidden="true">{{ initials }}</span>
        <span class="app-account-menu__name">{{ accountName }}</span>
        <ChevronDown class="app-account-menu__chevron" :size="15" aria-hidden="true" />
      </MomButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="app-account-menu__content" align="end" :side-offset="8">
      <DropdownMenuLabel class="app-account-menu__label">
        <small>{{ accountLabel }}</small>
        <strong :title="accountName">{{ accountName }}</strong>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <RouterLink class="app-account-menu__item" :to="{ name: ROUTE_NAMES.account }">
          <Settings aria-hidden="true" />{{ accountLabel }}
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <RouterLink class="app-account-menu__item" :to="{ name: ROUTE_NAMES.account, hash: '#account-password-title' }">
          <KeyRound aria-hidden="true" />{{ passwordLabel }}
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" :disabled="disabled" @select="emit('logout')">
        <LogOut aria-hidden="true" />{{ logoutLabel }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
