import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-vue 源码组件唯一的 Tailwind 类名合并入口。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
