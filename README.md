# MOM Web

`mom-web` contains the browser applications, shared front-end packages, interaction specifications, and prototype artifacts for the Industrial MOM project.

## Applications

- `apps/mom-admin`: internal MOM workstation.
- `apps/supplier-portal`: supplier delivery and collaboration portal.
- `apps/customer-portal`: order, shipment, quality, and complaint portal.

## Shared packages

- `@mom/api-client`: Gateway-oriented HTTP client and correlation headers.
- `@mom/access`: route, role, permission, and data-scope contracts.
- `@mom/design-tokens`: industrial UI design tokens.
- `@mom/domain-components`: domain component contracts.
- `@mom/shared`: shared types and utilities.
- `@mom/traceability-graph`: batch genealogy visualization boundary.

## Technology baseline

- Vue Vben Admin reference baseline: `v5.7.0`
- Node.js: `22.18+` or `24`
- pnpm: `11.7.0`
- Vue 3, Vite, TypeScript, Pinia
- Ant Design Vue

The initial commit establishes MOM-owned boundaries and a runnable three-application monorepo. It does not copy Vben's complete demonstration project. Vben-derived code must be introduced through a dedicated, reviewable migration slice with source provenance and license notices.

## Start

```bash
corepack enable
pnpm install
pnpm dev:admin
```

Other applications:

```bash
pnpm dev:supplier
pnpm dev:customer
```

## Quality checks

```bash
pnpm validate
pnpm check:type
pnpm build
```

## Design rule

No business page starts from database tables or API fields. Each vertical slice must first provide its user flow, Web prototype, state matrix, component mapping, and API/permission mapping.
