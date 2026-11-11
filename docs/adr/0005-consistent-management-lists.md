# 0005 - Consistent Management Lists

## Status

Accepted - 2026-11-07.

## Context

Support Groups and Themes duplicated selection in dropdown/sidebar panels and
had actions distant from their target rows. The global monitoring-table minimum
width caused unnecessary scrolling. Theme edits mutated the active client
configuration before persistence, obscuring preview versus confirmed state.

## Decision

Use full-width searchable management lists with independent active/selected
states and accessible per-row actions. Scope responsive width/stacking rules
to master lists. Reuse Bootstrap/Font Awesome and existing routes, IDs, backend
operations, JSON schemas and protected-record rules.

Move Support Groups/Themes controllers into `wwwroot/management.js`, loaded
after Bootstrap and before catalog scripts/app.js. Share action-menu rendering,
confirmation dialogs and transition-safe entry-modal focus. Keep direct action
icons for simple two-action catalogs rather than adding unnecessary menus.

Keep the saved theme library separate from a selected color draft. Persist
naming operations immediately; apply activation/colors globally only after
successful persistence. Preserve drafts on errors and confirm discard across
selection, reload and navigation. Failed reads must not create an editable
fallback library/profile.

## Consequences

Existing datasets require no migration. Simple catalog workflows retain their
guards, while monitoring/Configuration/Bulk Edit/Reports keep specialized layouts.
Frontend script order is a contract. Whole-document backend writes retain their
existing single-writer/multi-editor limitations; this does not introduce generic
optimistic concurrency. Browser state and responsive regression coverage must
grow with workflow changes.

## Alternatives Considered

- Restyling the old split panels would retain duplicated selection/action state.
- A new frontend framework/design system would broaden scope without requiring
  different domain behavior.
- Mutating active theme state before POST makes failed writes look successful.
- One global minimum table width is unsuitable for both small catalogs and
  wide monitoring/report tables.
