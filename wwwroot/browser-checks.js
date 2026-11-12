function renderBrowserResults(checks = []) {
  return checks.filter(check => check.type === 'browser').map(check => {
    const neutral = check.isAvailable == null || ['AuthenticationRequired', 'NotEvaluated', 'BrowserUnavailable', 'NavigationBlocked', 'UnexpectedDestination', 'SessionLimit'].includes(check.status);
    const color = check.isAvailable ? 'success' : neutral ? 'secondary' : 'danger';
    const label = check.status === 'AuthenticationRequired' ? 'Sign-in required' : check.status || 'Not evaluated';
    return NetWatchI18n.html`<div class="http-check-result mt-1"><span class="badge text-bg-${color}"><i class="fa-solid fa-${check.isAvailable ? 'check' : check.status === 'AuthenticationRequired' ? 'key' : neutral ? 'circle-question' : 'xmark'} me-1"></i>Browser: ${escapeHtml(NetWatchI18n.text(label))}</span>
      <div class="small text-secondary text-break">${escapeHtml(check.url || '')}</div>
      ${check.message && !check.isAvailable ? NetWatchI18n.html`<div class="small text-secondary">${escapeHtml(NetWatchI18n.text(check.message))}</div>` : ''}</div>`;
  }).join('');
}

function renderBrowserSessionControls(index) {
  const device = configState.devices[index];
  if (!device || device.enabled === false) return '';
  return (device.checks ?? []).map((check, checkIndex) => check.type === 'browser' ? NetWatchI18n.html`
    <div class="browser-session-actions mt-2" data-browser-session="${index}:${checkIndex}">
      <div class="d-flex gap-1 flex-wrap" role="group" aria-label="Browser session">
        <button type="button" class="btn btn-sm btn-outline-primary" data-browser-action="open" data-browser-index="${index}" data-browser-check="${checkIndex}" title="Sign in on the NetWatch host"><i class="fa-solid fa-arrow-right-to-bracket me-1"></i>Sign in</button>
        <button type="button" class="btn btn-sm btn-outline-success" data-browser-action="ready" data-browser-index="${index}" data-browser-check="${checkIndex}" title="Confirm completed sign-in"><i class="fa-solid fa-check me-1"></i>Finish sign-in</button>
        <button type="button" class="btn btn-sm btn-outline-secondary icon-button" data-browser-action="close" data-browser-index="${index}" data-browser-check="${checkIndex}" aria-label="Close browser session" title="Close browser session"><i class="fa-solid fa-right-from-bracket"></i></button>
      </div><div class="small text-secondary text-break" role="status" data-browser-message></div>
    </div>` : '').join('');
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-browser-action]');
  if (!button) return;
  const panel = button.closest('[data-browser-session]');
  const message = panel.querySelector('[data-browser-message]');
  if (activeMonitorStream || monitorPlanning || configurationBusy || !monitorInventorySnapshot) {
    message.textContent = NetWatchI18n.text('Finish the current operation and reload the inventory before signing in.');
    return;
  }
  const index = Number(button.dataset.browserIndex);
  const key = monitorInventorySnapshot.keys[index];
  const buttons = [...panel.querySelectorAll('button')];
  if (buttons.some(item => item.disabled)) return;
  buttons.forEach(item => { item.disabled = true; });
  message.textContent = NetWatchI18n.text('Waiting for the dedicated browser...');
  try {
    const response = await fetch('/api/browser-sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-NetWatch-Browser': '1' },
      body: JSON.stringify({ profileId: monitorInventorySnapshot.profileId, revision: monitorInventorySnapshot.revision,
        key, checkIndex: Number(button.dataset.browserCheck), action: button.dataset.browserAction })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || 'Browser session action failed.');
    message.textContent = NetWatchI18n.text(payload.message || ({ SigningIn: 'Complete sign-in in the dedicated Edge window, then choose Finish sign-in.',
      Ready: 'Session ready. Run this item to record its result.', AuthenticationRequired: 'Sign-in required',
      Success: 'Session ready. Run this item to record its result.', SessionLimit: 'Close another browser session before opening a new one.' }[payload.state] || 'Not evaluated'));
  } catch (error) { message.textContent = NetWatchI18n.error(error.message || 'Browser session action failed.'); }
  finally { buttons.forEach(item => { item.disabled = false; }); }
});
