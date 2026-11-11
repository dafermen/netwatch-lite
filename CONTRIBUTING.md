# Contributing To NetWatch Lite

## Before Starting

1. Read `AGENTS.md` and `CURRENT_STATUS.md`.
2. Review the relevant canonical document under `docs/`.
3. Keep changes scoped to the current internal NetWatch Lite product.
4. Do not include operational JSON, real inventories, credentials, or private
   planning material.

## Development

```powershell
dotnet restore netwatch.sln
dotnet build netwatch.sln
dotnet test netwatch.sln
node --check wwwroot/app.js
```

Run the application locally:

```powershell
dotnet run --urls http://localhost:5000
```

## Documentation

Update:

- `README.md` for user-facing behavior.
- The relevant canonical file under `docs/`.
- `CHANGELOG.md` for notable changes.
- `CURRENT_STATUS.md` for completed work, validation, and next steps.
- An ADR when changing architecture, persistence, security, contracts, or
  deployment strategy.

## Pull Requests

Pull requests should:

1. Explain the change and its impact.
2. Link the related issue when available.
3. Include commands and results used for validation.
4. Identify unexecuted quality gates and approved exceptions.
5. Avoid mixing unrelated refactors with behavioral changes.

## Release And Deployment

Do not deploy until every gate in `docs/DEPLOYMENT.md` has evidence or an
approved, documented exception.

