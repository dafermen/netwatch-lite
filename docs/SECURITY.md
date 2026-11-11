# NetWatch Lite Security

## Supported Security Scope

NetWatch Lite is an internal tool without authentication or role-based access.
Deploy it only behind trusted network and host controls.

Microsoft Entra ID, SSO, verified operator identity, external inventory import,
and outbound report delivery are planned capabilities, not current controls.

## Sensitive Data

Do not commit:

- Real device IP addresses, hostnames, or support-group inventories.
- Peripheral catalog/assignment data, asset IDs/serial numbers and operator notes.
- Custom device-type definitions and their operational usage counts.
- Device command text and any sensitive arguments; do not put credentials in commands.
- Device Notes, including physical locations and names of people using equipment.
- Device Location (floor, office or desk) and its association with operational inventory.
- Credentials, tokens, certificates, or private endpoint details.
- Runtime configuration, history, error, theme, region, or integration files.

Use `Data/config.sample.json` for generic examples.

SQLite databases, journal/sidecar files, content-root leases and private
storage-backups/storage-exports follow the same boundary as operational JSON.
They are excluded from Git and publishing. SQLite is not encrypted: protect the
deployment folder with OS permissions. SQL uses bound parameters and offline
migration validates/contains source paths; it is not a public file import API.
See [storage](STORAGE.md) for non-destructive recovery and operating limits.

Device Notes is private plain inventory text, rendered with HTML escaping and
bounded server-side. It is retained in configuration/exports/backups, not added
to monitoring results/history. A named user is not authenticated identity.
Do not store secrets in this field or include real notes in public documentation,
screenshots or portable sample data.
Location follows the same privacy/rendering boundary, with separate bounded
single-line validation. It is not geolocation and does not enter results/history.

## Clipboard Commands

The optional device command is inert configuration text. The backend validates
only single-line/size/control-character structure; it does not certify shell
safety or execute it. The browser copies plain text only after an explicit
button click and reports permission failures. No shell/process/launch endpoint
was introduced, and command text is not added to monitor results/history.
Review it before pasting/executing, especially with elevated privileges.
Trusted operators, access controls and OS clipboard policies remain required.

## HTTP Probe Boundary

HTTP checks make outbound GETs to configured internal/external URLs. This is
not an SSRF-safe public URL checker: restrict the unauthenticated app to trusted
operators and approved outbound destinations. Only use authorized, read-only
targets. TLS validation is never bypassed; URL credentials/fragments and
non-HTTP schemes are rejected. Redirects and cookie sharing are disabled.
Deadlines and a 1 MiB decompressed body limit bound response reading.

Query strings are removed from monitoring results/history and named-client URL
logging is disabled. Full URLs and expected text still exist in private config,
backups and config exports. Avoid query tokens and secrets in paths. Response
bodies and raw transport exception details are not stored in check results.
See [HTTP_CHECKS.md](HTTP_CHECKS.md) for limits and failure semantics.

## Private Report Exports

Report CSV/JSON contains operational history and must not enter source control
or public portables. CSV quotes every field, escapes double quotes and prefixes
formula-like/leading-control text, including full-width formula characters.
JSON retains the recorded text. Tests inspect inert downloads; no spreadsheet
formula is executed and no operator clipboard is read.

These are import-time mitigations, not a universal guarantee across spreadsheet
programs or after saving/reopening a CSV. Review the environment and keep JSON
for exact data transfers. See [OWASP CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection)
and the [report guide](REPORTS.md). Existing internal-only access controls remain
necessary; report navigation does not add authentication.

## Required Checks

Before deployment:

1. Review the Git diff and staged files.
2. Search for secrets and operational data.
3. Review dependency vulnerabilities.
4. Validate malformed and oversized input handling.
5. Confirm the application is not directly reachable from an untrusted network.
6. Complete the security gate in [DEPLOYMENT.md](DEPLOYMENT.md).

## Vulnerability Reporting

Do not disclose exploitable details in a public issue. Follow the repository
security policy at [../SECURITY.md](../SECURITY.md).

## Future Integration Requirements

Real external integrations require authentication, secrets outside Git,
allowlisted destinations, timeouts, bounded retries, correlation identifiers,
failure logging, data minimization, and contract/security tests.

## SQLite Maintenance Privacy

Schema-2 audit changes can contain old/new Notes, Commands and other private
configuration. They have no authenticated actor and are not tamper-proof.
Managed backups, schema-upgrade snapshots, retention archives, restored databases
and global storage policy are private and excluded from publishing. Protect their
Windows directory permissions and monitor disk usage. Query parameters are bound
and sort fields allowlisted; no HTTP arbitrary SQL or restore endpoint is exposed.
Backup/policy/audit endpoints do not add authentication or make public hosting safe.

