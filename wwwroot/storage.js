(() => {
  const find = id => document.getElementById(id);
  const details = find('storage-tools');
  const fields = find('storage-policy-fields');
  const alert = find('storage-alert');
  const form = find('storage-policy-form');
  let busy = false;
  let page = 1;
  let total = 0;
  let sqlite = false;
  let savedPolicy = null;
  const message = (text, danger = false) => { alert.textContent = text; alert.className = danger ? 'text-danger mb-2' : 'text-success mb-2'; };
  const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  async function request(path, options) {
    const response = await fetch(path, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || body.detail || 'Storage operation failed.');
    return body;
  }
  function controls() {
    find('storage-audit-prev').disabled = busy || page <= 1 || !sqlite;
    find('storage-audit-next').disabled = busy || page * 25 >= total || !sqlite;
    find('storage-backup-now').disabled = busy || !sqlite;
    find('storage-audit-refresh').disabled = busy;
  }
  async function load() {
    if (busy) return;
    busy = true; fields.disabled = true; controls();
    try {
      const provider = await request('/api/storage');
      sqlite = provider.provider === 'sqlite';
      find('storage-provider').textContent = sqlite ? `SQLite ${provider.schemaVersion}` : 'JSON';
      const policy = await request('/api/storage/policy');
      savedPolicy = policy;
      for (const [id, key] of [['history-max-runs', 'historyMaxRuns'], ['history-max-days', 'historyMaxAgeDays'], ['backup-hours', 'backupIntervalHours'], ['backup-copies', 'backupCopies']]) find(id).value = policy[key];
      find('history-export-first').checked = policy.exportBeforePrune;
      find('backup-automatic').checked = policy.automaticBackups;
      const backups = sqlite ? await request('/api/storage/backups') : [];
      find('storage-backups-body').innerHTML = backups.length ? backups.map(value => `<tr><td data-label="Created">${escape(new Date(value.createdUtc).toLocaleString())}</td><td data-label="File" class="text-break">${escape(value.name)}</td><td data-label="Size" class="text-end">${escape((value.bytes / 1048576).toFixed(2))} MB</td></tr>`).join('') : '<tr><td colspan="3" class="text-secondary">No managed backups.</td></tr>';
      const audit = sqlite ? await request(`/api/storage/audit?page=${page}&size=25`) : { records: [], total: 0 };
      total = audit.total;
      find('storage-audit-body').innerHTML = audit.records.length ? audit.records.map(value => {
        const changes = JSON.parse(value.changes);
        return `<tr><td data-label="Changed">${escape(new Date(value.changed_utc).toLocaleString())}</td><td data-label="Document" class="text-break">${escape(value.document)}</td><td data-label="Action">${escape(value.action)}</td><td data-label="Fields"><details><summary>${escape(Object.keys(changes).join(', ') || 'Document')}</summary><pre class="small text-break mb-0">${escape(JSON.stringify(changes, null, 2))}</pre></details></td></tr>`;
      }).join('') : '<tr><td colspan="4" class="text-secondary">No recorded changes.</td></tr>';
      find('storage-audit-page').textContent = `${total ? (page - 1) * 25 + 1 : 0}-${Math.min(total, page * 25)} / ${total}`;
      fields.disabled = false;
    } catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    const policy = { historyMaxRuns: Number(find('history-max-runs').value), historyMaxAgeDays: Number(find('history-max-days').value),
      exportBeforePrune: find('history-export-first').checked, automaticBackups: find('backup-automatic').checked,
      backupIntervalHours: Number(find('backup-hours').value), backupCopies: Number(find('backup-copies').value) };
    const tighter = savedPolicy && (policy.historyMaxRuns < savedPolicy.historyMaxRuns || (policy.historyMaxAgeDays > 0 && (!savedPolicy.historyMaxAgeDays || policy.historyMaxAgeDays < savedPolicy.historyMaxAgeDays)));
    if ((tighter || !policy.exportBeforePrune) && !await confirmManagementAction({ title: 'Update retention policy', message: 'New limits apply on the next completed run. Older executions can be removed. Save this policy?', confirmLabel: 'Save policy' })) return;
    busy = true; fields.disabled = true; controls();
    try { await request('/api/storage/policy', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policy) }); savedPolicy = policy; message('Data policy saved. Retention applies on the next completed run.'); }
    catch (error) { message(error.message, true); }
    finally { busy = false; fields.disabled = false; controls(); }
  });
  find('storage-backup-now').addEventListener('click', async () => {
    if (busy || !sqlite) return;
    busy = true; controls();
    try { await request('/api/storage/backups', { method: 'POST' }); message('Backup created and integrity verified.'); }
    catch (error) { message(error.message, true); }
    finally { busy = false; await load(); }
  });
  find('storage-audit-refresh').addEventListener('click', load);
  find('storage-audit-prev').addEventListener('click', () => { page = Math.max(1, page - 1); load(); });
  find('storage-audit-next').addEventListener('click', () => { page++; load(); });
  details.addEventListener('toggle', () => { if (details.open) load(); });
})();
