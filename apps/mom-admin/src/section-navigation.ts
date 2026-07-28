const SECTION_DEFINITIONS = [
  { key: 'users', permission: 'iam:user:read' },
  { key: 'roles', permission: 'iam:role:read' },
  { key: 'permissions', permission: 'iam:permission:read' },
  { key: 'sessions', permission: 'iam:session:read' },
  { key: 'audit', permission: 'iam:audit:read' },
  { key: 'clients', permission: 'iam:client:read' },
] as const;

type SectionDefinition = (typeof SECTION_DEFINITIONS)[number];
type Section = SectionDefinition['key'];

function sectionFromRoute(value: unknown): Section {
  return SECTION_DEFINITIONS.some((item) => item.key === value)
    ? (value as Section)
    : 'users';
}

export { SECTION_DEFINITIONS, sectionFromRoute };
export type { Section, SectionDefinition };
