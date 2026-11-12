# Interface Languages

Use the top-bar selector: English or Espanol. English is the default regardless
of browser/Windows language. The explicit choice is stored as `netwatch.language`
in that browser, not SQLite. `?lang=en` / `?lang=es` is a per-navigation override
and fallback when browser storage is unavailable. Dates/numbers use that locale.

Switching reloads the current route. Active operations/open editors block it;
unsaved bulk/settings/theme changes require confirmation. Cancelling keeps the
language and draft. Switching neither saves inventory nor runs monitoring. No
external translation service is contacted.

## Boundaries

Navigation, views, forms, confirmations, help, monitoring explanations and the
in-app User Manual follow one language. English source strings are paired with
`wwwroot/i18n-es.js`; `wwwroot/i18n.js` handles owned text, literal templates,
accessibility descriptions and native field-validity messages.

Operator names, categories, facilities, models, notes, commands, URLs, profile/theme
names, stored keys, catalog IDs and historical payloads are never translated.
Protected device-type display names are localized without changing stored IDs/names.
Technical codes, URLs and the original escaped error record are data, not mixed
product copy. Machine-oriented CSV/JSON exports retain canonical keys/codes.

Canonical engineering Markdown and the separate `/docs/` reading portal retain
their existing documentation languages. The bilingual in-app `/manual` is the
operator guide; translating historical engineering receipts is outside this delivery.

## Maintenance

Use `NetWatchI18n.text` for owned messages and `NetWatchI18n.html` for literal
templates. Never translate inventory/HTML after interpolation. Escape user text
as before. The compiler preserves table slots, boolean attributes and original
`pre`/`code` content, replacing slots only once. Do not translate dynamic IDs,
class names, field values or arbitrary operator data.

Keep the catalog complete; inspect `NetWatchI18n.missing()` during synthetic QA.
These sets remain local memory. Browser tests cover both viewports, persistence,
literal inventory, safe interpolation and cancellation of draft loss. Unknown
backend errors use a localized generic explanation and correlation reference;
consult [Diagnostics](DIAGNOSTICS.md) for original technical detail.
