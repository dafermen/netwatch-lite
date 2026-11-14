async function loadBuildInfo() {
  const version = document.querySelector('#running-version');
  const details = document.querySelector('#build-details');
  try {
    const response = await fetch('/api/build', { cache: 'no-store' });
    if (!response.ok) throw new Error('Build information unavailable.');
    const info = await response.json();
    version.textContent = `v${info.version}`;
    const fields = [['Version', info.version], ['Build', info.build || NetWatchI18n.text('Not recorded')],
      ['Runtime', info.runtime], ['Storage', info.provider], ['Schema', info.schemaVersion ?? NetWatchI18n.text('Not applicable')]];
    details.replaceChildren();
    for (const [name, value] of fields) {
      const term = document.createElement('dt'); term.className = 'col-4 col-md-2'; term.textContent = NetWatchI18n.text(name);
      const description = document.createElement('dd'); description.className = 'col-8 col-md-10 text-break';
      description.textContent = String(value); description.setAttribute('data-i18n-skip', '');
      details.append(term, description);
    }
  } catch {
    version.removeAttribute('data-i18n-skip');
    version.textContent = NetWatchI18n.text('Build information unavailable.');
  }
}
void loadBuildInfo();
