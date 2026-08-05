import {
  ADMIN_TASK_CONTRACTS,
  type IamSection,
} from './router/task-contract.js';

const SECTION_DEFINITIONS = ADMIN_TASK_CONTRACTS.map((task) => ({
  key: task.section,
  permission: task.requiredPermission,
}));

type SectionDefinition = (typeof SECTION_DEFINITIONS)[number];
type Section = IamSection;

function sectionFromRoute(value: unknown): Section {
  return SECTION_DEFINITIONS.some((item) => item.key === value)
    ? (value as Section)
    : 'users';
}

export { SECTION_DEFINITIONS, sectionFromRoute };
export type { Section, SectionDefinition };
