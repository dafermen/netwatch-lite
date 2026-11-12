window.NetWatchDiagnostics = (() => {
  const byId = id => document.getElementById(id);
  configureManagementModalFocus(byId('diagnostics-detail-modal'), '[data-bs-dismiss="modal"]');
  let source = 'application', page = 1, loaded = null, version = 0, busy = false, exporting = false, controller, timer;
  function parameters(size = Number(byId('diagnostics-size').value)) {
    const query = new URLSearchParams({ source, page, size });
    const search = byId('diagnostics-search').value.trim();
    if (search) query.set('search', search);
    const from = byId('diagnostics-from').value, to = byId('diagnostics-to').value;
    if (from && to && from > to) throw new Error('From must be on or before To.');
    if (from) query.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) query.set('to', new Date(`${to}T23:59:59.999`).toISOString());
    return query;
  }
  async function fetchPage(query, signal) {
    const response = await fetch(`/api/diagnostics?${query}`, { signal });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to load diagnostics.');
    if (!Array.isArray(payload.entries) || !Number.isFinite(Number(payload.total))) throw new Error('Invalid diagnostic response.');
    return payload;
  }
  function render() {
    byId('diagnostics-export').disabled = busy || exporting || !loaded?.total;
    byId('diagnostics-prev').disabled = busy || exporting || !loaded || page <= 1;
    byId('diagnostics-next').disabled = busy || exporting || !loaded || page * loaded.size >= loaded.total;
    byId('diagnostics-page-summary').textContent = NetWatchI18n.text(loaded ? `${loaded.total} records, page ${page} of ${Math.max(1, Math.ceil(loaded.total / loaded.size))}` : '');
    const entries = loaded?.entries ?? [];
    byId('diagnostics-body').innerHTML = entries.length ? entries.map((entry, index) => NetWatchI18n.html`<tr>
      <td data-label="Timestamp">${escapeHtml(entry.timestamp ? formatDate(entry.timestamp) : NetWatchI18n.text('Not recorded'))}</td>
      <td data-label="Source">${entry.result ? NetWatchI18n.html`<strong>${escapeHtml(entry.result.name || '')}</strong><div class="small text-secondary">${escapeHtml(entry.result.facility || '')}</div>` : escapeHtml(entry.source || '')}</td>
      <td data-label="Summary">${entry.result ? failureSummary(entry.result) : NetWatchI18n.html`<span class="badge text-bg-danger">${NetWatchI18n.text(entry.source === 'browser' ? 'Browser error' : 'Application error')}</span>${entry.statusCode ? NetWatchI18n.html`<div class="small">HTTP ${Number(entry.statusCode)}</div>` : ''}`}</td>
      <td data-label="Reference"><code class="text-break">${escapeHtml(entry.traceId || entry.errorId)}</code></td>
      <td data-label="Details" class="text-end"><button class="btn btn-outline-secondary btn-sm icon-button" type="button" data-diagnostic-detail="${index}" title="View diagnostic" aria-label="View diagnostic"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button></td>
    </tr>`).join('') : NetWatchI18n.html`<tr><td colspan="5" class="text-secondary text-center py-4">${NetWatchI18n.text(busy ? 'Loading diagnostics...' : loaded ? 'No matching diagnostics.' : 'Diagnostics unavailable.')}</td></tr>`;
  }
  function failureSummary(result) {
    const failures = (result.checks ?? []).filter(check => check.isAvailable === false);
    return failures.map(check => check.type === 'browser' ? renderBrowserResults([check]) : check.type === 'http' ? renderHttpChecks([check])
      : NetWatchI18n.html`<span class="badge text-bg-danger me-1">${escapeHtml(check.label || check.type)}: ${escapeHtml(check.status || 'Failed')}</span>`).join('') || renderDeviceStatus(result.status);
  }
  async function load() {
    clearTimeout(timer);
    controller?.abort();
    const current = ++version;
    controller = new AbortController();
    busy = true; loaded = null; render();
    try {
      const response = await fetchPage(parameters(), controller.signal);
      if (current !== version || currentRoute !== '/diagnostics') return;
      loaded = response; page = response.page;
      clearPageAlert(byId('diagnostics-alert'));
    } catch (error) {
      if (current !== version || error.name === 'AbortError') return;
      showPageAlert(byId('diagnostics-alert'), 'danger', error.message || 'Unable to load diagnostics.');
    } finally { if (current === version) { busy = false; render(); } }
  }
  function schedule() {
    page = 1; ++version; controller?.abort(); loaded = null; busy = true; render();
    clearTimeout(timer); timer = setTimeout(load, 150);
  }
  function leave() { clearTimeout(timer); ++version; controller?.abort(); busy = false; hideManagementModal(byId('diagnostics-detail-modal')); }
  function details(index) {
    const entry = loaded?.entries[index];
    if (!entry) return;
    byId('diagnostics-detail-body').innerHTML = entry.result
      ? NetWatchI18n.html`<dl class="report-detail-meta"><dt>Name</dt><dd>${escapeHtml(entry.result.name)}</dd><dt>Facility</dt><dd>${escapeHtml(entry.result.facility)}</dd><dt>Execution</dt><dd><code>${escapeHtml(entry.runId || '')}</code></dd></dl>${failureSummary(entry.result)}`
      : NetWatchI18n.html`<dl class="report-detail-meta"><dt>Reference</dt><dd><code>${escapeHtml(entry.traceId || entry.errorId)}</code></dd><dt>Source</dt><dd>${escapeHtml(entry.source)}</dd><dt>Request</dt><dd><code>${escapeHtml(entry.httpMethod || '')} ${escapeHtml(entry.path || '')}</code></dd><dt>Exception type</dt><dd><code>${escapeHtml(entry.exceptionType)}</code></dd></dl>
        <h3 class="h6">Original technical detail</h3><pre class="diagnostic-original">${escapeHtml(entry.message || '')}</pre>${entry.stackTrace ? NetWatchI18n.html`<pre class="diagnostic-original">${escapeHtml(entry.stackTrace)}</pre>` : ''}`;
    bootstrap.Modal.getOrCreateInstance(byId('diagnostics-detail-modal')).show();
  }
  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text.trimStart())) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  }
  async function exportAll(format) {
    if (busy || exporting || !loaded) return;
    bootstrap.Dropdown.getInstance(byId('diagnostics-export'))?.hide();
    const current = version;
    const entries = [];
    exporting = true; render();
    try {
      const query = parameters(100);
      for (let index = 1; ; index++) {
        query.set('page', index);
        const response = await fetchPage(query);
        if (current !== version || currentRoute !== '/diagnostics') return;
        entries.push(...response.entries);
        query.set('revision', response.revision);
        if (entries.length >= response.total) break;
        if (entries.length >= 100000) throw new Error('Export exceeds 100000 records. Select a shorter period.');
      }
      const content = format === 'json' ? JSON.stringify({ source, entries }, null, 2)
        : '\ufeff' + [['Timestamp', 'Source', 'Reference', 'Name', 'Facility', 'Diagnostic'], ...entries.map(entry => [entry.timestamp,
          entry.source, entry.traceId || entry.errorId, entry.result?.name || '', entry.result?.facility || '', entry.result
            ? (entry.result.checks ?? []).filter(check => check.isAvailable === false).map(check => `${check.type}: ${check.diagnosticCode || check.status || 'Unknown'}`).join('; ') : entry.message])]
          .map(row => row.map(csvCell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `netwatch-${source}-diagnostics.${format}`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { if (current === version) showPageAlert(byId('diagnostics-alert'), 'danger', error.message); }
    finally { exporting = false; render(); }
  }
  document.querySelectorAll('[data-diagnostics-source]').forEach(button => button.addEventListener('click', () => {
    source = button.dataset.diagnosticsSource; page = 1;
    document.querySelectorAll('[data-diagnostics-source]').forEach(element => {
      element.classList.toggle('active', element === button); element.setAttribute('aria-selected', String(element === button));
    });
    void load();
  }));
  for (const id of ['diagnostics-search', 'diagnostics-from', 'diagnostics-to']) byId(id).addEventListener('input', schedule);
  byId('diagnostics-size').addEventListener('change', schedule);
  byId('diagnostics-refresh').addEventListener('click', () => { void load(); });
  byId('diagnostics-clear').addEventListener('click', () => { for (const id of ['diagnostics-search', 'diagnostics-from', 'diagnostics-to']) byId(id).value = ''; page = 1; void load(); });
  byId('diagnostics-prev').addEventListener('click', () => { page--; void load(); });
  byId('diagnostics-next').addEventListener('click', () => { page++; void load(); });
  byId('diagnostics-body').addEventListener('click', event => { const button = event.target.closest('[data-diagnostic-detail]'); if (button) details(Number(button.dataset.diagnosticDetail)); });
  document.querySelectorAll('[data-diagnostics-export]').forEach(button => button.addEventListener('click', () => { void exportAll(button.dataset.diagnosticsExport); }));

  let reporting = false, reported = 0, windowStart = Date.now();
  const seen = new Set();
  function reportBrowser(kind, message, script, line, column) {
    if (Date.now() - windowStart > 60000) { windowStart = Date.now(); reported = 0; seen.clear(); }
    if (reporting || reported >= 20) return;
    let path = '';
    try { const value = new URL(script || location.href, location.href); path = value.origin + value.pathname; } catch { /* Do not collect invalid resource URLs. */ }
    message = String(message || 'Browser operation failed.').slice(0, 4096).replace(/https?:\/\/[^\s<>"']+/gi, value => {
      try { const url = new URL(value); return url.origin + url.pathname; } catch { return '[redacted URL]'; }
    });
    const key = JSON.stringify([kind, message, path, line, column]);
    if (seen.has(key)) return;
    seen.add(key); reported++; reporting = true;
    fetch('/api/diagnostics/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ kind, message, script: path, line, column }) }).catch(() => {}).finally(() => { reporting = false; });
  }
  window.addEventListener('error', event => {
    if (event instanceof ErrorEvent) reportBrowser('error', event.message, event.filename, event.lineno, event.colno);
    else if (event.target?.src || event.target?.href) reportBrowser('resource-error', 'Unable to load a browser resource.', event.target.src || event.target.href);
  }, true);
  window.addEventListener('unhandledrejection', event => reportBrowser('unhandledrejection', event.reason?.message || 'Unhandled browser promise rejection.', location.href));
  return Object.freeze({ load, leave });
})();
