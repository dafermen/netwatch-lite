const deviceTypesPage = document.querySelector('#device-types-page');
const deviceTypesBody = document.querySelector('#device-types-body');
const deviceTypeModalElement = document.querySelector('#device-type-modal');
const deviceTypeModal = typeof bootstrap !== 'undefined' ? new bootstrap.Modal(deviceTypeModalElement) : null;
const deviceTypeForm = document.querySelector('#device-type-form');
const initialDeviceTypes = [
  { id: 'unspecified', name: 'Not specified' }, { id: 'workstation', name: 'Workstation' },
  { id: 'server', name: 'Server' }, { id: 'network', name: 'Network device' }, { id: 'other', name: 'Other' }
];
let deviceTypesSnapshot = null;
let deviceTypesBusy = false;
let deviceTypesStale = false;

function renderDeviceTypeOptions(selected = 'unspecified') {
  const types = configState.deviceTypes ?? initialDeviceTypes;
  deviceTypeSelect.innerHTML = types.map(type =>
    `<option value="${escapeAttribute(type.id)}">${escapeHtml(type.name)}</option>`).join('');
  deviceTypeSelect.value = types.some(type => type.id === selected) ? selected : 'unspecified';
}

function setDeviceTypesBusy(busy) {
  deviceTypesBusy = busy;
  deviceTypesPage.querySelectorAll('input, select, button').forEach(element => {
    element.disabled = busy || !deviceTypesSnapshot || deviceTypesStale;
  });
  document.querySelector('#reload-device-types').disabled = busy;
  deviceTypeForm.querySelectorAll('input, button').forEach(element => { element.disabled = busy; });
  document.querySelector('#save-device-type').disabled = busy || deviceTypesStale;
  document.querySelector('#reload-type-editor').hidden = !deviceTypesStale;
  if (!busy && deviceTypesSnapshot && !deviceTypesStale) {
    deviceTypesBody.querySelectorAll('[data-type-protected]').forEach(button => { button.disabled = true; });
    deviceTypesBody.querySelectorAll('[data-type-in-use]').forEach(button => { button.disabled = true; });
  }
}

function renderDeviceTypes() {
  if (!deviceTypesSnapshot) return;
  const query = document.querySelector('#device-types-search').value.trim().toLowerCase();
  const filter = document.querySelector('#device-types-filter').value;
  const protectedIds = new Set(deviceTypesSnapshot.protectedIds);
  const types = deviceTypesSnapshot.deviceTypes.filter(type => {
    const uses = deviceTypesSnapshot.usage[type.id] || 0;
    return `${type.name} ${type.id}`.toLowerCase().includes(query)
      && (!filter || (filter === 'custom' && !protectedIds.has(type.id))
        || (filter === 'protected' && protectedIds.has(type.id))
        || (filter === 'used' && uses > 0) || (filter === 'unused' && uses === 0));
  }).sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector('#device-types-profile').textContent =
    `Support group: ${deviceTypesSnapshot.profileName} / ${deviceTypesSnapshot.region}`;
  document.querySelector('#device-types-count').textContent =
    `${types.length} of ${deviceTypesSnapshot.deviceTypes.length} types`;
  deviceTypesBody.innerHTML = types.map(type => {
    const protectedType = protectedIds.has(type.id);
    const uses = deviceTypesSnapshot.usage[type.id] || 0;
    return `<tr data-device-type-row="${escapeAttribute(type.id)}">
      <td class="device-type-name"><div class="fw-semibold">${escapeHtml(type.name)}</div><code class="small text-secondary">${escapeHtml(type.id)}</code></td>
      <td class="device-type-usage">${uses} device${uses === 1 ? '' : 's'}</td>
      <td class="device-type-status"><span class="badge ${protectedType ? 'text-bg-secondary' : 'text-bg-light'}">${protectedType ? '<i class="fa-solid fa-lock me-1"></i>Protected' : 'Custom'}</span></td>
      <td class="device-type-actions text-end text-nowrap">
        <button class="btn btn-outline-primary btn-sm" type="button" data-edit-device-type="${escapeAttribute(type.id)}" title="${protectedType ? 'Protected system type' : 'Rename type'}" aria-label="Rename type" ${protectedType ? 'data-type-protected disabled' : ''}><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-delete-device-type="${escapeAttribute(type.id)}" title="${protectedType ? 'Protected system type' : uses ? 'Reassign devices before deleting this type' : 'Delete type'}" aria-label="Delete type" ${protectedType ? 'data-type-protected disabled' : uses ? 'data-type-in-use disabled' : ''}><i class="fa-solid fa-trash"></i></button>
      </td></tr>`;
  }).join('') || '<tr><td colspan="4" class="text-center text-secondary py-4">No device types match.</td></tr>';
}

async function loadDeviceTypes() {
  if (deviceTypesBusy) return;
  deviceTypesSnapshot = null;
  deviceTypesStale = false;
  deviceTypesBody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">Loading device types...</td></tr>';
  document.querySelector('#device-types-profile').textContent = '';
  document.querySelector('#device-types-count').textContent = '';
  document.querySelector('#device-types-alert').textContent = '';
  setDeviceTypesBusy(true);
  try {
    const response = await fetch('/api/device-types');
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to load device types.');
    deviceTypesSnapshot = payload;
    renderDeviceTypes();
  } catch (error) {
    document.querySelector('#device-types-alert').textContent = error.message;
    deviceTypesBody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">Unable to load device types.</td></tr>';
  } finally { setDeviceTypesBusy(false); }
}

function openDeviceType(id = '') {
  if (deviceTypesBusy || !deviceTypesSnapshot || deviceTypesStale || deviceTypesSnapshot.protectedIds.includes(id)) return;
  const type = deviceTypesSnapshot.deviceTypes.find(entry => entry.id === id);
  deviceTypeForm.reset();
  document.querySelector('#device-type-edit-id').value = id;
  document.querySelector('#device-type-name').value = type?.name || '';
  document.querySelector('#device-type-modal-title').textContent = type ? 'Rename Device Type' : 'Add Device Type';
  document.querySelector('#device-type-form-alert').textContent = '';
  document.querySelector('#reload-type-editor').hidden = true;
  deviceTypeModal?.show();
}

async function saveDeviceTypes(types) {
  if (deviceTypesBusy || !deviceTypesSnapshot || deviceTypesStale) throw new Error('Reload Device Types before saving.');
  setDeviceTypesBusy(true);
  try {
    const response = await fetch('/api/device-types', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: deviceTypesSnapshot.profileId, version: deviceTypesSnapshot.version, deviceTypes: types })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      if (response.status === 409) deviceTypesStale = true;
      throw new Error(payload.error || payload.detail || 'Unable to save device types.');
    }
    deviceTypesSnapshot = payload;
    renderDeviceTypes();
  } finally { setDeviceTypesBusy(false); }
}

deviceTypeForm.addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.querySelector('#device-type-edit-id').value
    || `type-${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')}`;
  const type = { id, name: document.querySelector('#device-type-name').value.trim() };
  const types = [...(deviceTypesSnapshot?.deviceTypes ?? [])];
  const index = types.findIndex(entry => entry.id === id);
  if (index < 0) types.push(type); else types[index] = type;
  try { await saveDeviceTypes(types); hideManagementModal(deviceTypeModalElement); }
  catch (error) { document.querySelector('#device-type-form-alert').textContent = error.message; }
});

deviceTypesBody.addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit-device-type]');
  if (edit && !edit.disabled) { openDeviceType(edit.dataset.editDeviceType); return; }
  const remove = event.target.closest('[data-delete-device-type]');
  if (!remove || remove.disabled) return;
  const type = deviceTypesSnapshot.deviceTypes.find(item => item.id === remove.dataset.deleteDeviceType);
  if (!await confirmManagementAction({ title: 'Delete device type', message: `Delete the unused type '${type.name}'? Existing devices and other types will be kept.` })) return;
  try { await saveDeviceTypes(deviceTypesSnapshot.deviceTypes.filter(type => type.id !== remove.dataset.deleteDeviceType)); }
  catch (error) { document.querySelector('#device-types-alert').textContent = error.message; }
});

document.querySelector('#add-device-type').addEventListener('click', () => openDeviceType());
document.querySelector('#reload-device-types').addEventListener('click', loadDeviceTypes);
document.querySelector('#device-types-search').addEventListener('input', renderDeviceTypes);
document.querySelector('#device-types-filter').addEventListener('change', renderDeviceTypes);
configureManagementModalFocus(deviceTypeModalElement, '#device-type-name');
document.querySelector('#reload-type-editor').addEventListener('click', () => {
  deviceTypeModalElement.addEventListener('hidden.bs.modal', () => { void loadDeviceTypes(); }, { once: true });
  hideManagementModal(deviceTypeModalElement);
});
document.querySelector('#manage-device-types').addEventListener('click', event => {
  if (!confirm('Leave the device editor without saving its changes?')) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
});
