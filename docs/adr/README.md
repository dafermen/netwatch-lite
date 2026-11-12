# Architecture Decision Records

Use an ADR when a decision materially changes architecture, persistence,
security, external contracts, deployment, or testing strategy.

## Naming

Use sequential files:

```text
0001-short-decision-title.md
0002-next-decision.md
```

## Required Sections

- Status
- Context
- Decision
- Consequences
- Alternatives considered

Accepted ADRs are immutable. Supersede an older decision with a new ADR and
link both records.

## Records

- [0008 - Supported .NET 10 LTS runtime](0008-dotnet10-lts.md)

- [0001 - Local JSON persistence](0001-local-json-persistence.md)
- [0002 - Profile-scoped peripheral inventory](0002-profile-scoped-peripherals.md)
- [0003 - Bounded HTTP application checks](0003-bounded-http-checks.md)
- [0004 - Profile-scoped device types](0004-profile-device-types.md)
- [0005 - Consistent management lists](0005-consistent-management-lists.md)
- [0006 - Transactional SQLite document persistence](0006-sqlite-document-persistence.md)

- [0007 - SQLite projections and managed retention](0007-sqlite-relational-projections.md)

