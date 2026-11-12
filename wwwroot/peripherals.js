const peripheralPage = document.querySelector('#peripherals-page');
const peripheralCatalogBody = document.querySelector('#peripheral-catalog-body');
const peripheralModelElement = document.querySelector('#peripheral-model-modal');
const peripheralModelModal = typeof bootstrap !== 'undefined' ? new bootstrap.Modal(peripheralModelElement) : null;
const peripheralModelForm = document.querySelector('#peripheral-model-form');
const workstationPeripheralFields = document.querySelector('#workstation-peripherals');
const deviceTypeSelect = document.querySelector('#device-type');
configureManagementModalFocus(peripheralModelElement, '#peripheral-manufacturer');
workstationPeripheralFields.querySelector('a[data-route]').addEventListener('click', event => {
  if (!confirm('Leave the device editor without saving its changes?')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});
let peripheralCatalogBusy = false;
let peripheralCatalogLoaded = false;

function setPeripheralCatalogBusy(busy) {
  peripheralCatalogBusy = busy;
  peripheralPage.querySelectorAll('input, select, button').forEach(element => { element.disabled = busy || !peripheralCatalogLoaded; });
  document.querySelector('#reload-peripherals').disabled = busy;
  peripheralModelForm.querySelectorAll('input, select, button').forEach(element => { element.disabled = busy; });
  const id = document.querySelector('#peripheral-model-id').value;
  document.querySelector('#peripheral-model-kind').disabled = busy || Boolean(id && peripheralUses(id));
  if (!busy && peripheralCatalogLoaded) {
    peripheralCatalogBody.querySelectorAll('[data-delete-peripheral-model]').forEach(button => {
      button.disabled = peripheralUses(button.dataset.deletePeripheralModel) > 0;
    });
  }
}

function peripheralUses(id) {
  return (configState.devices ?? []).reduce((count, device) => count + ['printers', 'scanners'].reduce((sum, key) =>
    sum + (device.workstationPeripherals?.[key]?.items ?? []).filter(item => item.modelId === id).length, 0), 0);
}

function renderPeripheralCatalog() {
  const kind = document.querySelector('#peripheral-kind-filter').value;
  const query = document.querySelector('#peripheral-catalog-search').value.trim().toLowerCase();
  const models = (configState.peripheralCatalog ?? []).filter(model => (!kind || model.kind === kind)
    && `${model.manufacturer} ${model.model}`.toLowerCase().includes(query));
  document.querySelector('#peripheral-profile-label').textContent = NetWatchI18n.text(`Support group: ${getActiveRegion()?.name || 'Active inventory'}`);
  peripheralCatalogBody.innerHTML = models.map(model => {
    const uses = peripheralUses(model.id);
    return NetWatchI18n.html`<tr data-peripheral-model-row="${escapeAttribute(model.id)}">
      <td data-label="Type">${NetWatchI18n.text(model.kind === 'printer' ? 'Printer' : 'Scanner')}</td>
      <td data-label="Manufacturer">${escapeHtml(model.manufacturer)}</td><td data-label="Model"><a href="/workstations?model=${encodeURIComponent(model.id)}" data-view-model-workstations="${escapeAttribute(model.id)}" title="View workstations using this model">${escapeHtml(model.model)}</a></td><td data-label="Assignments">${uses}</td>
      <td class="text-end text-nowrap" data-label="Actions">
        <button class="btn btn-outline-primary btn-sm" type="button" data-edit-peripheral-model="${escapeAttribute(model.id)}" aria-label="Edit model" title="Edit model"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-delete-peripheral-model="${escapeAttribute(model.id)}" aria-label="Delete model" title="${NetWatchI18n.text(uses ? 'Remove assignments before deleting this model' : 'Delete model')}" ${uses ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
      </td></tr>`;
  }).join('') || NetWatchI18n.markup('<tr><td colspan="5" class="text-center text-secondary py-4">No models found.</td></tr>');
}

async function loadPeripheralCatalog() {
  if (peripheralCatalogBusy) return;
  peripheralCatalogLoaded = false;
  peripheralCatalogBody.innerHTML = NetWatchI18n.markup('<tr><td colspan="5" class="text-center text-secondary py-4">Loading catalog...</td></tr>');
  document.querySelector('#peripheral-profile-label').textContent = NetWatchI18n.text('');
  setPeripheralCatalogBusy(true);
  const alert = document.querySelector('#peripheral-catalog-alert');
  alert.textContent = NetWatchI18n.text('');
  try {
    if (!await loadRegions({ showBusy: false, showErrors: false })) throw new Error('Unable to verify the active support group. Retry loading the catalog.');
    const response = await fetch('/api/config');
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || 'Unable to load the catalog.');
    applyConfigPayload(payload);
    renderPeripheralCatalog();
    peripheralCatalogLoaded = true;
  } catch (error) {
    alert.textContent = NetWatchI18n.error(error.message);
    peripheralCatalogBody.innerHTML = NetWatchI18n.markup('<tr><td colspan="5" class="text-center text-secondary py-4">Unable to load catalog.</td></tr>');
  }
  finally { setPeripheralCatalogBusy(false); }
}

function openPeripheralModel(id = '') {
  const model = configState.peripheralCatalog?.find(entry => entry.id === id);
  peripheralModelForm.reset();
  document.querySelector('#peripheral-model-alert').textContent = NetWatchI18n.text('');
  document.querySelector('#peripheral-model-id').value = id;
  document.querySelector('#peripheral-model-title').textContent = NetWatchI18n.text(model ? 'Edit Model' : 'Add Model');
  document.querySelector('#peripheral-model-kind').value = model?.kind || 'printer';
  document.querySelector('#peripheral-model-kind').disabled = Boolean(model && peripheralUses(id));
  document.querySelector('#peripheral-manufacturer').value = model?.manufacturer || '';
  document.querySelector('#peripheral-model-name').value = model?.model || '';
  peripheralModelModal?.show();
}

async function savePeripheralCatalog(catalog) {
  if (peripheralCatalogBusy || !peripheralCatalogLoaded) throw new Error('Wait for the catalog to finish loading.');
  setPeripheralCatalogBusy(true);
  try {
    const response = await fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...configState, peripheralCatalog: catalog })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || 'Unable to save the catalog.');
    applyConfigPayload(payload.configuration);
    renderPeripheralCatalog();
  } finally { setPeripheralCatalogBusy(false); }
}

peripheralModelForm.addEventListener('submit', async event => {
  event.preventDefault();
  const save = document.querySelector('#save-peripheral-model');
  save.disabled = true;
  try {
    const id = document.querySelector('#peripheral-model-id').value
      || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const model = {
      id, kind: document.querySelector('#peripheral-model-kind').value,
      manufacturer: document.querySelector('#peripheral-manufacturer').value.trim(),
      model: document.querySelector('#peripheral-model-name').value.trim()
    };
    const catalog = [...(configState.peripheralCatalog ?? [])];
    const index = catalog.findIndex(entry => entry.id === id);
    if (index < 0) catalog.push(model); else catalog[index] = model;
    await savePeripheralCatalog(catalog);
    hideManagementModal(peripheralModelElement);
  } catch (error) { document.querySelector('#peripheral-model-alert').textContent = NetWatchI18n.error(error.message); }
  finally { save.disabled = false; }
});

peripheralCatalogBody.addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit-peripheral-model]');
  if (edit) { openPeripheralModel(edit.dataset.editPeripheralModel); return; }
  const remove = event.target.closest('[data-delete-peripheral-model]');
  if (!remove || remove.disabled) return;
  const model = configState.peripheralCatalog.find(item => item.id === remove.dataset.deletePeripheralModel);
  if (!await confirmManagementAction({ title: 'Delete peripheral model', message: `Delete '${model.manufacturer} ${model.model}'? Existing devices and other models will be kept.` })) return;
  remove.disabled = true;
  try { await savePeripheralCatalog(configState.peripheralCatalog.filter(model => model.id !== remove.dataset.deletePeripheralModel)); }
  catch (error) {
    document.querySelector('#peripheral-catalog-alert').textContent = NetWatchI18n.error(error.message);
    renderPeripheralCatalog();
  }
});
document.querySelector('#add-peripheral-model').addEventListener('click', () => openPeripheralModel());
document.querySelector('#reload-peripherals').addEventListener('click', loadPeripheralCatalog);
document.querySelector('#peripheral-kind-filter').addEventListener('change', renderPeripheralCatalog);
document.querySelector('#peripheral-catalog-search').addEventListener('input', renderPeripheralCatalog);

function peripheralGroupElement(key) {
  return workstationPeripheralFields.querySelector(`[data-peripheral-group="${key}"]`);
}

function peripheralLinkLabel(value) {
  return NetWatchI18n.text(value === 'wireless' ? 'Wireless' : value === 'cabled' ? 'Cabled' : 'Link not recorded');
}

function peripheralConnectionLabel(value) {
  return NetWatchI18n.text(value === 'usb' ? 'USB' : value === 'network' ? 'Network' : 'Other');
}

function readPeripheralGroup(key) {
  const element = peripheralGroupElement(key);
  const status = element.querySelector('select').value;
  const items = Array.from(element.querySelectorAll('[data-peripheral-assignment]')).map(row => ({
    modelId: row.querySelector('[data-assignment-model]').value,
    connection: row.querySelector('[data-assignment-connection]').value,
    linkType: row.querySelector('[data-assignment-link-type]').value,
    identifier: row.querySelector('[data-assignment-identifier]').value.trim(),
    address: row.querySelector('[data-assignment-address]').value.trim(),
    notes: row.querySelector('[data-assignment-notes]').value.trim()
  }));
  return { status, items };
}

function renderPeripheralGroup(key, group = { status: 'unrecorded', items: [] }) {
  const element = peripheralGroupElement(key);
  element.querySelector('select').value = group.status;
  const models = (configState.peripheralCatalog ?? []).filter(model => model.kind === (key === 'printers' ? 'printer' : 'scanner'));
  element.querySelector('[data-peripheral-items]').innerHTML = (group.items ?? []).map(item => NetWatchI18n.html`
    <fieldset class="peripheral-assignment" data-peripheral-assignment>
      <legend class="visually-hidden">${NetWatchI18n.text(key === 'printers' ? 'Printer' : 'Scanner')} assignment</legend>
      <div class="peripheral-assignment-grid">
        <label class="form-label peripheral-model">Model<select class="form-select" data-assignment-model required>
          <option value="">Select model</option>${models.map(model => NetWatchI18n.html`<option value="${escapeAttribute(model.id)}" ${model.id === item.modelId ? 'selected' : ''}>${escapeHtml(model.manufacturer)} ${escapeHtml(model.model)}</option>`).join('')}
        </select></label>
        <label class="form-label">Connection<select class="form-select" data-assignment-connection>${['usb', 'network', 'other'].map(value => NetWatchI18n.html`<option value="${value}" ${item.connection === value ? 'selected' : ''}>${NetWatchI18n.text(value === 'usb' ? 'USB' : value === 'network' ? 'Network' : 'Other')}</option>`).join('')}</select></label>
        <label class="form-label">Link type<select class="form-select" data-assignment-link-type>${['unrecorded', 'wireless', 'cabled'].map(value => NetWatchI18n.html`<option value="${value}" ${(item.linkType || 'unrecorded') === value ? 'selected' : ''}>${value === 'unrecorded' ? NetWatchI18n.text('Not recorded') : peripheralLinkLabel(value)}</option>`).join('')}</select></label>
        <label class="form-label">Name / Asset ID<input class="form-control" data-assignment-identifier maxlength="200" value="${escapeAttribute(item.identifier || '')}"></label>
        <label class="form-label">Network address<input class="form-control" data-assignment-address maxlength="253" value="${escapeAttribute(item.address || '')}" ${item.connection === 'network' ? '' : 'disabled'}></label>
        <label class="form-label peripheral-notes">Notes<textarea class="form-control" rows="2" data-assignment-notes maxlength="1000">${escapeHtml(item.notes || '')}</textarea></label>
        <button type="button" class="btn btn-outline-danger btn-sm peripheral-remove" data-remove-peripheral title="Remove assignment" aria-label="Remove assignment"><i class="fa-solid fa-trash"></i></button>
      </div>
    </fieldset>`).join('');
  const add = element.querySelector('[data-add-peripheral]');
  add.hidden = group.status !== 'assigned';
  add.disabled = models.length === 0 || group.items.length >= 50;
  add.title = NetWatchI18n.text(models.length === 0 ? 'Add a model to the catalog first' : 'Add assignment');
}

function populatePeripheralForm(device) {
  renderDeviceTypeOptions(device.deviceType || 'unspecified');
  const isWorkstation = deviceTypeSelect.value === 'workstation';
  workstationPeripheralFields.hidden = !isWorkstation;
  workstationPeripheralFields.disabled = !isWorkstation;
  document.querySelector('#device-peripheral-alert').textContent = NetWatchI18n.text('');
  renderPeripheralGroup('printers', device.workstationPeripherals?.printers);
  renderPeripheralGroup('scanners', device.workstationPeripherals?.scanners);
}

function syncPeripheralFormAvailability() {
  for (const key of ['printers', 'scanners']) {
    const element = peripheralGroupElement(key);
    const kind = key === 'printers' ? 'printer' : 'scanner';
    const add = element.querySelector('[data-add-peripheral]');
    add.disabled = !(configState.peripheralCatalog ?? []).some(model => model.kind === kind)
      || element.querySelectorAll('[data-peripheral-assignment]').length >= 50;
    element.querySelectorAll('[data-peripheral-assignment]').forEach(row => {
      row.querySelector('[data-assignment-address]').disabled = row.querySelector('[data-assignment-connection]').value !== 'network';
    });
  }
}

deviceTypeSelect.addEventListener('change', () => {
  if (deviceTypeSelect.value !== 'workstation') {
    const recorded = ['printers', 'scanners'].some(key => readPeripheralGroup(key).status !== 'unrecorded');
    if (recorded && !confirm('Changing the device type removes its recorded peripheral inventory when saved. Continue?')) {
      deviceTypeSelect.value = 'workstation'; return;
    }
    renderPeripheralGroup('printers'); renderPeripheralGroup('scanners');
  }
  workstationPeripheralFields.hidden = deviceTypeSelect.value !== 'workstation';
  workstationPeripheralFields.disabled = workstationPeripheralFields.hidden;
});

workstationPeripheralFields.addEventListener('change', event => {
  const element = event.target.closest('[data-peripheral-group]');
  if (!element) return;
  const key = element.dataset.peripheralGroup;
  const row = event.target.closest('[data-peripheral-assignment]');
  if (row && event.target.matches('[data-assignment-connection]')) {
    const address = row.querySelector('[data-assignment-address]');
    address.disabled = event.target.value !== 'network';
    if (address.disabled) address.value = '';
  } else if (!row && event.target.matches('select')) {
    const group = readPeripheralGroup(key);
    if (group.status !== 'assigned' && group.items.length && !confirm('Clear the recorded assignments for this peripheral type?')) {
      element.querySelector('select').value = 'assigned'; return;
    }
    if (group.status !== 'assigned') group.items = [];
    renderPeripheralGroup(key, group);
  }
});
workstationPeripheralFields.addEventListener('click', event => {
  const add = event.target.closest('[data-add-peripheral]');
  const remove = event.target.closest('[data-remove-peripheral]');
  if (!add && !remove) return;
  const element = event.target.closest('[data-peripheral-group]');
  const key = element.dataset.peripheralGroup;
  const group = readPeripheralGroup(key);
  if (add) group.items.push({ modelId: '', connection: 'usb', linkType: 'unrecorded' });
  if (remove) {
    const index = Array.from(element.querySelectorAll('[data-peripheral-assignment]')).indexOf(remove.closest('[data-peripheral-assignment]'));
    group.items.splice(index, 1);
  }
  renderPeripheralGroup(key, group);
});

function readPeripheralDeviceFields() {
  const deviceType = deviceTypeSelect.value;
  if (deviceType !== 'workstation') return { deviceType, workstationPeripherals: null };
  const inventory = { printers: readPeripheralGroup('printers'), scanners: readPeripheralGroup('scanners') };
  for (const group of Object.values(inventory)) {
    if (group.status === 'assigned' && (!group.items.length || group.items.some(item => !item.modelId))) {
      document.querySelector('#device-peripheral-alert').textContent = NetWatchI18n.text('Select at least one catalog model for each assigned peripheral type.');
      return null;
    }
  }
  return { deviceType, workstationPeripherals: inventory };
}

function renderWorkstationInventory(device) {
  if (device?.deviceType !== 'workstation') return '';
  const inventory = device.workstationPeripherals;
  const count = key => inventory?.[key]?.status === 'assigned' ? inventory[key].items.length : inventory?.[key]?.status === 'none' ? 'None' : 'Not recorded';
  const lines = ['printers', 'scanners'].flatMap(key => (inventory?.[key]?.items ?? []).map(item => {
    const model = configState.peripheralCatalog?.find(entry => entry.id === item.modelId);
    return NetWatchI18n.html`<li>${NetWatchI18n.text(key === 'printers' ? 'Printer' : 'Scanner')}: ${escapeHtml(model ? `${model.manufacturer} ${model.model}` : item.modelId)} (${escapeHtml(peripheralConnectionLabel(item.connection))} &middot; ${peripheralLinkLabel(item.linkType)})${item.identifier ? ` &middot; ${escapeHtml(item.identifier)}` : ''}${item.address ? ` &middot; ${escapeHtml(item.address)}` : ''}${item.notes ? NetWatchI18n.html`<div>${escapeHtml(item.notes)}</div>` : ''}</li>`;
  }));
  return NetWatchI18n.html`<details class="workstation-inventory small fw-normal"><summary title="Recorded peripheral inventory">Printers: ${count('printers')} &middot; Scanners: ${count('scanners')}</summary>${lines.length ? NetWatchI18n.html`<ul class="mb-0 mt-1">${lines.join('')}</ul>` : ''}</details>`;
}
