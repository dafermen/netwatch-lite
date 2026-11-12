const workstationsPage = document.querySelector('#workstations-page');
const workstationBody = document.querySelector('#workstations-body');
let workstationConfiguration = { devices: [], peripheralCatalog: [] };
let workstationFilters = {};
let workstationLoadVersion = 0;
let workstationsLoaded = false;

function restoreWorkstationFilters() {
  const query = new URLSearchParams(location.search);
  const inventory = query.get('inventory') || 'all';
  const size = Number(query.get('size'));
  const page = Number(query.get('page'));
  workstationFilters = {
    search: query.get('q') || '', facility: query.get('facility') || '',
    inventory: ['all', 'pending', 'printers', 'scanners', 'recorded'].includes(inventory) ? inventory : 'all',
    model: (query.get('model') || '').trim().toLowerCase(),
    size: [10, 25, 50, 100].includes(size) ? size : 25,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1
  };
  document.querySelector('#workstation-search').value = workstationFilters.search;
  document.querySelector('#workstation-inventory-filter').value = workstationFilters.inventory;
  document.querySelector('#workstations-page-size').value = String(workstationFilters.size);
}

function workstationDevices() {
  return (workstationConfiguration.devices ?? []).filter(device => device.deviceType === 'workstation');
}

function workstationGroup(device, key) {
  return device.workstationPeripherals?.[key] ?? { status: 'unrecorded', items: [] };
}

function workstationItems(device) {
  return ['printers', 'scanners'].flatMap(key => {
    const group = workstationGroup(device, key);
    return group.status === 'assigned' ? group.items : [];
  });
}

function workstationPending(device, key) {
  return workstationGroup(device, key).status === 'unrecorded';
}

function workstationModelName(model) {
  return `${model.manufacturer} ${model.model}`;
}

function populateWorkstationFilters() {
  const facilities = [...new Set(workstationDevices().map(device => device.facility || 'Unassigned'))].sort((a, b) => a.localeCompare(b));
  const facilitySelect = document.querySelector('#workstation-facility-filter');
  facilitySelect.innerHTML = NetWatchI18n.markup('<option value="">All facilities</option>') + facilities.map(facility =>
    NetWatchI18n.html`<option value="${escapeAttribute(facility)}">${escapeHtml(facility)}</option>`).join('');
  if (workstationFilters.facility && !facilities.includes(workstationFilters.facility)) {
    facilitySelect.add(new Option(`Unavailable facility: ${workstationFilters.facility}`, workstationFilters.facility));
  }
  facilitySelect.value = workstationFilters.facility;
  const modelSelect = document.querySelector('#workstation-model-filter');
  modelSelect.innerHTML = NetWatchI18n.markup('<option value="">All models</option>') + ['printer', 'scanner'].map(kind => {
    const models = (workstationConfiguration.peripheralCatalog ?? []).filter(model => model.kind === kind)
      .sort((a, b) => workstationModelName(a).localeCompare(workstationModelName(b)));
    return NetWatchI18n.html`<optgroup label="${NetWatchI18n.text(kind === 'printer' ? 'Printers' : 'Scanners')}">${models.map(model =>
      NetWatchI18n.html`<option value="${escapeAttribute(model.id)}">${escapeHtml(workstationModelName(model))}</option>`).join('')}</optgroup>`;
  }).join('');
  if (workstationFilters.model && !(workstationConfiguration.peripheralCatalog ?? []).some(model => model.id === workstationFilters.model)) {
    modelSelect.add(new Option('Unavailable model in this support group', workstationFilters.model));
  }
  modelSelect.value = workstationFilters.model;
}

function updateWorkstationUrl() {
  if (currentRoute !== '/workstations') return;
  const query = new URLSearchParams();
  if (workstationFilters.search) query.set('q', workstationFilters.search);
  if (workstationFilters.facility) query.set('facility', workstationFilters.facility);
  if (workstationFilters.inventory !== 'all') query.set('inventory', workstationFilters.inventory);
  if (workstationFilters.model) query.set('model', workstationFilters.model);
  if (workstationFilters.size !== 25) query.set('size', String(workstationFilters.size));
  if (workstationFilters.page > 1) query.set('page', String(workstationFilters.page));
  history.replaceState({ route: '/workstations' }, '', '/workstations' + (query.size ? `?${query}` : ''));
}

function renderWorkstationGroup(device, key, models) {
  const group = workstationGroup(device, key);
  if (group.status === 'unrecorded') return NetWatchI18n.markup('<span class="badge text-bg-warning">Not recorded</span>');
  if (group.status === 'none') return NetWatchI18n.markup('<span class="text-secondary">None</span>');
  const names = [...new Set(group.items.map(item => {
    const model = models.get(item.modelId);
    return model ? workstationModelName(model) : item.modelId;
  }))];
  return NetWatchI18n.html`<details class="workstation-peripheral-cell"><summary>Assigned (${group.items.length})<span class="d-block small text-secondary">${escapeHtml(names.join(', '))}</span></summary>
    <ul class="workstation-peripheral-list">${group.items.map(item => {
      const model = models.get(item.modelId);
      return NetWatchI18n.html`<li><span class="fw-semibold">${escapeHtml(model ? workstationModelName(model) : item.modelId)}</span>
        <div class="small text-secondary">${escapeHtml([peripheralConnectionLabel(item.connection), peripheralLinkLabel(item.linkType), item.identifier, item.address].filter(Boolean).join(' | '))}</div>
        ${item.notes ? NetWatchI18n.html`<div class="small">${escapeHtml(item.notes)}</div>` : ''}</li>`;
    }).join('')}</ul></details>`;
}

function renderWorkstations() {
  const devices = workstationDevices();
  const models = new Map((workstationConfiguration.peripheralCatalog ?? []).map(model => [model.id, model]));
  const pending = device => workstationPending(device, 'printers') || workstationPending(device, 'scanners');
  document.querySelector('#workstations-total').textContent = NetWatchI18n.text(String(devices.length));
  document.querySelector('#workstations-pending').textContent = NetWatchI18n.text(String(devices.filter(pending).length));
  document.querySelector('#workstations-recorded').textContent = NetWatchI18n.text(String(devices.filter(device => !pending(device)).length));
  const query = workstationFilters.search.trim().toLowerCase();
  const filtered = devices.filter(device => {
    if (workstationFilters.facility && device.facility !== workstationFilters.facility) return false;
    if (workstationFilters.inventory === 'pending' && !pending(device)) return false;
    if (workstationFilters.inventory === 'recorded' && pending(device)) return false;
    if (['printers', 'scanners'].includes(workstationFilters.inventory) && !workstationPending(device, workstationFilters.inventory)) return false;
    const items = workstationItems(device);
    if (workstationFilters.model && !items.some(item => item.modelId === workstationFilters.model)) return false;
    const text = [device.name, device.ip, device.hostname, device.facility, device.category, ...items.flatMap(item => {
      const model = models.get(item.modelId);
      return [model?.manufacturer, model?.model, item.modelId, item.identifier, item.address, item.notes];
    })].filter(Boolean).join(' ').toLowerCase();
    return !query || text.includes(query);
  }).sort((a, b) => a.name.localeCompare(b.name) || a.facility.localeCompare(b.facility) || a.ip.localeCompare(b.ip));

  const pages = Math.max(1, Math.ceil(filtered.length / workstationFilters.size));
  workstationFilters.page = Math.min(workstationFilters.page, pages);
  const start = (workstationFilters.page - 1) * workstationFilters.size;
  const visible = filtered.slice(start, start + workstationFilters.size);
  workstationBody.innerHTML = visible.map(device => NetWatchI18n.html`<tr data-workstation-row role="row">
    <td role="cell"><div class="fw-semibold">${escapeHtml(device.name)}</div><div class="small"><code>${escapeHtml(device.ip)}</code>${device.hostname ? ` | ${escapeHtml(device.hostname)}` : ''}</div>
      <div class="small text-secondary">${escapeHtml(device.facility)} | ${escapeHtml(device.category)}</div>${device.enabled === false ? NetWatchI18n.markup('<div class="small text-secondary">Monitoring disabled</div>') : ''}</td>
    <td role="cell" data-label="Printers">${renderWorkstationGroup(device, 'printers', models)}</td>
    <td role="cell" data-label="Scanners">${renderWorkstationGroup(device, 'scanners', models)}</td></tr>`).join('')
    || NetWatchI18n.html`<tr><td colspan="3" class="text-secondary text-center py-4">${NetWatchI18n.text(devices.length ? 'No workstations match these filters.' : 'No workstations in this support group.')}</td></tr>`;
  const selectedModel = models.get(workstationFilters.model);
  let summary = `${filtered.length} matching workstations`;
  if (workstationFilters.model) {
    const count = filtered.reduce((sum, device) => sum + workstationItems(device).filter(item => item.modelId === workstationFilters.model).length, 0);
    summary += selectedModel ? ` | ${count} assignments of ${workstationModelName(selectedModel)}` : ' | Model unavailable in this support group';
  }
  document.querySelector('#workstations-match-summary').textContent = NetWatchI18n.text(summary);
  document.querySelector('#workstations-page-summary').textContent = NetWatchI18n.text(filtered.length
    ? `${start + 1}-${start + visible.length} of ${filtered.length}` : '0 of 0');
  document.querySelector('#workstations-prev').disabled = workstationFilters.page <= 1;
  document.querySelector('#workstations-next').disabled = workstationFilters.page >= pages;
  updateWorkstationUrl();
}

function setWorkstationsBusy(busy) {
  workstationsPage.setAttribute('aria-busy', String(busy));
  workstationsPage.querySelectorAll('input, select, button').forEach(control => { control.disabled = busy || !workstationsLoaded; });
  document.querySelector('#reload-workstations').disabled = busy;
  if (!busy && workstationsLoaded) renderWorkstations();
}

async function loadWorkstations() {
  const version = ++workstationLoadVersion;
  workstationsLoaded = false;
  setWorkstationsBusy(true);
  document.querySelector('#workstations-alert').textContent = NetWatchI18n.text('');
  document.querySelector('#workstations-match-summary').textContent = NetWatchI18n.text('Loading workstations...');
  document.querySelector('#workstations-profile-label').textContent = NetWatchI18n.text('');
  for (const id of ['total', 'pending', 'recorded']) document.querySelector(`#workstations-${id}`).textContent = NetWatchI18n.text('-');
  workstationBody.innerHTML = NetWatchI18n.markup('<tr><td colspan="3" class="text-secondary py-4">Loading...</td></tr>');
  document.querySelector('#workstations-page-summary').textContent = NetWatchI18n.text('');
  try {
    await loadRegions({ showBusy: false, showErrors: false });
    const response = await fetch('/api/config');
    const payload = await readJsonResponse(response);
    if (version !== workstationLoadVersion) return;
    if (!response.ok) throw new Error(payload.error || 'Unable to load workstation inventory.');
    workstationConfiguration = payload;
    document.querySelector('#workstations-profile-label').textContent = NetWatchI18n.text(`Support group: ${getActiveRegion()?.name || 'Active inventory'}`);
    populateWorkstationFilters();
    workstationsLoaded = true;
  } catch (error) {
    if (version !== workstationLoadVersion) return;
    workstationConfiguration = { devices: [], peripheralCatalog: [] };
    workstationBody.innerHTML = '';
    document.querySelector('#workstations-match-summary').textContent = NetWatchI18n.text('');
    document.querySelector('#workstations-alert').textContent = NetWatchI18n.error(error.message);
  } finally {
    if (version === workstationLoadVersion) setWorkstationsBusy(false);
  }
}

function applyWorkstationFilterChange() {
  if (!workstationsLoaded) return;
  workstationFilters.search = document.querySelector('#workstation-search').value;
  workstationFilters.facility = document.querySelector('#workstation-facility-filter').value;
  workstationFilters.inventory = document.querySelector('#workstation-inventory-filter').value;
  workstationFilters.model = document.querySelector('#workstation-model-filter').value;
  workstationFilters.size = Number(document.querySelector('#workstations-page-size').value);
  workstationFilters.page = 1;
  renderWorkstations();
}

document.querySelector('#workstation-search').addEventListener('input', applyWorkstationFilterChange);
for (const id of ['workstation-facility-filter', 'workstation-inventory-filter', 'workstation-model-filter', 'workstations-page-size']) {
  document.querySelector(`#${id}`).addEventListener('change', applyWorkstationFilterChange);
}
document.querySelector('#workstations-prev').addEventListener('click', () => { workstationFilters.page--; renderWorkstations(); });
document.querySelector('#workstations-next').addEventListener('click', () => { workstationFilters.page++; renderWorkstations(); });
document.querySelector('#reload-workstations').addEventListener('click', loadWorkstations);
document.querySelector('#reset-workstation-filters').addEventListener('click', () => {
  history.replaceState({ route: '/workstations' }, '', '/workstations');
  restoreWorkstationFilters();
  populateWorkstationFilters();
  renderWorkstations();
});
