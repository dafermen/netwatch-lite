# NetWatch Lite Tests

## Current Suites

The current baseline is 85 .NET tests and 24 browser workflows, including
Workstations filters/reverse lookup, paging/history navigation, profile isolation
and read-only/error behavior. Tests also cover model reference validation, legacy compatibility,
profile copying and preservation through row/bulk updates and import/export.

- `NetWatch.UnitTests`: pure behavior and model defaults.
- `NetWatch.IntegrationTests`: repositories with isolated file persistence.
- `NetWatch.ContractTests`: in-memory ASP.NET Core HTTP contracts with
  temporary runtime data, including the application shell and `/docs/` assets.
- `e2e/`: real-browser desktop/mobile workflows with one isolated server and
  content/data root per test.

Run all .NET suites:

```powershell
dotnet test netwatch.sln
```

Run browser workflows from the repository root:

```powershell
npm ci --ignore-scripts
npx playwright install chromium
npm run test:e2e
```

The npm command publishes to ignored `tests/.app/` before running Playwright.
Stop the shared service first if Windows has locked the Release DLL. Browser
servers use temporary roots/OS-assigned ports and never port 5000. See
[testing details](../docs/TESTING.md) for runtime selection, artifacts and limits.

Generate coverage evidence:

```powershell
dotnet test netwatch.sln --collect "XPlat Code Coverage" --results-directory TestResults
```

## Isolation Rules

- Never read or write operational repository JSON during tests.
- Use unique temporary directories for file-backed tests.
- Do not run network checks against real inventory.
- Keep fixtures generic and free of credentials, private IP inventories, and
  internal hostnames.
- Dispose HTTP clients, test hosts, and temporary directories.

## Naming

Use `{Subject}_{ExpectedBehavior}_{Condition}` or another equally explicit
behavior-oriented name. Test projects use the `NetWatch.*Tests` convention.

## Remaining Suites

The deployment policy also requires property/invariant, mutation, fuzz,
end-to-end, regression, security, concurrency/resilience,
performance/resource, and compatibility/deployment evidence. Add dedicated
projects only when they contain executable tests rather than empty placeholders.

Initial end-to-end/regression and concurrency/recovery scenarios now run as
part of the suites above; further coverage is still required for release gates.
