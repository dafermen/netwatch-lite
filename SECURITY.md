# Security Policy

## Supported Scope

Security fixes are applied to the current `main` branch. Older portable
artifacts should be upgraded to the latest maintained version.

## Reporting A Vulnerability

Do not open a public issue with exploitable details, secrets, real inventory,
or private endpoints.

Use GitHub's private vulnerability reporting or a private repository security
advisory when available. Include:

- Affected version or commit.
- Reproduction steps.
- Expected and actual behavior.
- Security impact.
- Suggested mitigation when known.

The maintainer will assess scope, coordinate a fix, add regression coverage,
and publish an appropriate security note without exposing private operational
data.

## Deployment Boundary

NetWatch Lite currently has no authentication or role-based access. It is an
internal application and must not be exposed directly to untrusted networks.

See [docs/SECURITY.md](docs/SECURITY.md) for engineering controls.

