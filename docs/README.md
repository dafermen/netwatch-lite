# netwatch-lite documentation

## DOC-STD-20261002 — Canonical sources

Documentation standard v1.0 · reviewed 2026-10-02. Primary language: English.

Internal .NET network monitoring application.

The wallboard is a separate repository. Operational JSON and logs are private. Do not infer active monitoring from a public landing page. SSO, verified operator identity and external inventory integrations remain future capabilities unless separately verified. Do not expose the internal monitor directly to untrusted networks.

| Need | Authoritative source |
| --- | --- |
| Presentation | [README.md](../README.md) |
| Current state | [CURRENT_STATUS.md](../CURRENT_STATUS.md) |
| Development | DEVELOPMENT.md — local document awaiting publication |
| Architecture | ARCHITECTURE.md — local document awaiting publication |
| API / contracts | API.md — local document awaiting publication |
| Testing | TESTING.md — local document awaiting publication |
| Security | SECURITY.md — local document awaiting publication |
| Deployment | DEPLOYMENT.md — local document awaiting publication |
| Operations | OPERATIONS.md — local document awaiting publication |
| Troubleshooting | TROUBLESHOOTING.md — local document awaiting publication |
| History | [CHANGELOG.md](../CHANGELOG.md) |
| Decisions | adr/README.md — local document awaiting publication |

Start with the presentation and current state, then read the user guide to try the product, development/architecture to contribute, or deployment/operations to maintain it. The existing detailed index remains valid.

### Evidence and updates

Keep current state, change history and decisions separate. Existing dated test results remain historical evidence. Adding this map does not rerun every documented command or complete pending product acceptance. Record actual checks, their environment and unresolved limits before publication.

Update the source guide whenever commands, configuration, behavior, permissions or deployment change. Keep existing links and portal routes stable. Use real screenshots with synthetic data; never publish env values, access keys, user data or operational logs. A local commit, a remote commit and a deployed artifact are separate states.
