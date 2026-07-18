# Module boundaries

```text
apps
├── mom-admin
├── supplier-portal
└── customer-portal

packages
├── api-client
├── access
├── design-tokens
├── domain-components
├── shared
└── traceability-graph
```

Rules:

1. Applications may depend on shared packages.
2. Shared packages must not depend on applications.
3. Domain components receive view models, not persistence entities.
4. API DTOs are generated or mapped at the API boundary.
5. Authentication and tokens are handled through a dedicated access layer.
6. No application stores authorization truth locally.
