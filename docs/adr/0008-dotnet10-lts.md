# 0008 - Supported .NET 10 LTS Runtime

## Status

Accepted 2026-11-12 following explicit owner authorization for IMP-009.

## Context

.NET 8 ended support on 2026-11-10. Its final patch in rc.14 does not restore
support. The application needs a supported runtime without changing inventory,
SQLite schema 2, legacy API contracts or the immutable portable history.

## Decision

Target .NET 10 LTS for the app/tests/CI, SDK 10.0.404 and runtime 10.0.15.
Pin runtime centrally and enforce the patch in native packaging guards.
Update Microsoft.Data.Sqlite/Mvc.Testing to 10.0.15 and their required native
SQLitePCLRaw bundle to 2.1.13. Keep current physical static-file routing and
explicit JSON/HTTP/security behavior; no unrelated framework features are enabled.
Validate with a private official SHA-512-verified SDK, without replacing
machine-wide tools. Prove database copy/rollback and full regression before
backed-up local activation. Deliver rc.15 as a new neutral folder/ZIP/SHA.

## Consequences

Development needs the matching SDK and ASP.NET Core runtime, or the documented
process-scoped private toolchain. Portable operators still need no installed .NET.
Self-contained runtime servicing requires regenerating a new versioned portable.
Database schema/operational documents remain unchanged, with separate backups.
Other-PC/proxy/load acceptance and publication/stable approval remain separate.

## Alternatives Considered

- Stay on final .NET 8: rejected because it is out of support.
- .NET 11 STS: unnecessary larger migration; prefer the supported LTS baseline.
- Multi-target net8.0/net10.0: rejected to avoid presenting an unsupported runtime
  as an equally supported production option. Historical builds remain available.

Sources and exact servicing policy: [Runtime](../RUNTIME.md).
