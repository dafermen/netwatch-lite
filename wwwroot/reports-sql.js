/* SQL reports retain the existing renderers; only bounded pages enter browser state. */
window.netwatchSqlReports = (() => {
  let sequence = 0;
  let timer;
  let exporting = false;
  const camel = value => Array.isArray(value) ? value.map(camel) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key ? key[0].toLowerCase() + key.slice(1) : key, camel(item)])) : value;
  const views = ['devices', 'runs', 'facility', 'category'];
  function parameters(view) {
    applyReportPeriod();
    const state = view === 'devices' ? [reportsCurrentPage, reportsPageSize, reportsSort]
      : view === 'runs' ? [reportsRunPage, reportsRunPageSize, reportsRunSort]
        : view === 'facility' ? [reportsFacilityPage, reportsFacilityPageSize, reportsFacilitySort]
          : [reportsCategoryPage, reportsCategoryPageSize, reportsCategorySort];
    const query = new URLSearchParams({ view, page: state[0], size: state[1], sort: state[2].key, direction: state[2].direction });
    for (const key of ['search', 'profile', 'facility', 'category', 'mode', 'status', 'runKey', 'deviceKey'])
      if (reportsFilters[key]) query.set(key, key === 'search' ? reportsFilters[key].trim() : reportsFilters[key]);
    if (reportsFilters.fromDate) query.set('from', new Date(`${reportsFilters.fromDate}T00:00:00`).toISOString());
    if (reportsFilters.toDate) query.set('to', new Date(`${reportsFilters.toDate}T23:59:59.999`).toISOString());
    return query;
  }
  async function fetchPage(query) {
    const response = await fetch(`/api/reports/query?${query}`);
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || 'Unable to query history.');
    if (!Array.isArray(payload.records) || !payload.metrics || !payload.coverage) throw new Error('Invalid SQL history response.');
    return payload;
  }
  function convert(record) {
    const run = camel(JSON.parse(record.run_payload));
    run._ordinal = Number(record.run_index);
    const result = camel(JSON.parse(record.payload));
    result.status = record.status;
    const row = flattenHistoryRows([{ ...run, results: [result] }])[0];
    row.rowId = `${record.run_index}-${record.ordinal}`;
    row.runKey = reportRunKey(run, run._ordinal);
    return { row, run };
  }
  async function load() {
    const version = ++sequence;
    ++reportsLoadVersion;
    reportsBusy = true;
    reportsAvailable = false;
    closeReportDetail(true);
    renderReports(true);
    if (invalidReportRange()) { reportsBusy = false; reportsAvailable = true; renderReports(true); return; }
    try {
      const first = await fetchPage(parameters('devices'));
      const payloads = [first, ...await Promise.all(views.slice(1).map(view => { const query = parameters(view); query.set('revision', first.revision); return fetchPage(query); }))];
      if (version !== sequence || !reportsSqlEnabled || currentRoute !== '/reports') return;
      reportsSqlState = Object.fromEntries(views.map((view, index) => [view, payloads[index]]));
      [reportsCurrentPage, reportsRunPage, reportsFacilityPage, reportsCategoryPage] = payloads.map(payload => payload.page);
      const runMap = new Map();
      const converted = reportsSqlState.devices.records.map(convert);
      for (const { run } of converted) runMap.set(run._ordinal, run);
      for (const record of reportsSqlState.runs.records) { const run = camel(JSON.parse(record.payload)); run._ordinal = Number(record.ordinal); runMap.set(run._ordinal, run); }
      reportsState = { schemaVersion: 1, runs: [...runMap.values()] };
      reportsRows = converted.map(({ row, run }) => ({ ...row, runIndex: reportsState.runs.findIndex(value => value._ordinal === run._ordinal) }));
      reportsAvailable = true;
      options();
      clearReportsAlert();
    } catch (error) {
      if (version !== sequence) return;
      reportsSqlState = null;
      reportsRows = [];
      reportsState = { schemaVersion: 1, runs: [] };
      showReportsAlert('danger', error.message);
    } finally {
      if (version === sequence) { reportsBusy = false; renderReports(true); }
    }
  }
  function cancelPending() { clearTimeout(timer); ++sequence; }
  function render() {
    clearTimeout(timer);
    // Mutations retain the loaded snapshot while their write is pending.
    if (reportsBusy && reportsAvailable) return;
    timer = setTimeout(load, 100);
  }
  function options() {
    const all = reportsSqlState?.devices.options || [];
    const profile = value => reportProfileKey({ region: value.region, supportGroup: value.support_group });
    syncSelectOptions(reportsProfileFilter, all.map(value => ({ value: profile(value), label: `${value.support_group || 'Unrecorded group'} / ${value.region || 'Unrecorded region'}` })), 'All support groups', 'profile');
    const scoped = all.filter(value => !reportsFilters.profile || profile(value) === reportsFilters.profile);
    syncSelectOptions(reportsFacilityFilter, scoped.map(value => value.facility).filter(Boolean), 'All facilities', 'facility');
    syncSelectOptions(reportsCategoryFilter, scoped.filter(value => !reportsFilters.facility || value.facility === reportsFilters.facility).map(value => value.category).filter(Boolean), 'All categories', 'category');
  }
  function metrics() {
    const available = reportsAvailable && !reportsBusy && !invalidReportRange();
    const values = reportsSqlState.devices.metrics;
    for (const [element, key] of [[reportsRunCount, 'runs'], [reportsDeviceCount, 'devices'], [reportsRowCount, 'evaluations'], [reportsProblemCount, 'problems']]) element.textContent = NetWatchI18n.text(available ? formatNumber(values[key] || 0) : '-');
    reportsAvgAvailability.textContent = NetWatchI18n.text(available && values.measured ? reportPercent(values.healthy / values.measured * 100) : '-');
    reportsAvgAvailability.title = NetWatchI18n.text('Healthy / known-status evaluations; not time-based uptime');
    reportsHealthyCount.textContent = NetWatchI18n.text(available && values.measured ? `${formatNumber(values.healthy)} / ${formatNumber(values.measured)}` : '');
    reportsTableSummary.textContent = NetWatchI18n.text(`${formatNumber(values.evaluations || 0)} evaluations`);
  }
  function groups(view) { return (!reportsAvailable || reportsBusy || invalidReportRange() ? [] : reportsSqlState?.[view].records || []).map(record => ({ ...record, profile: reportProfileKey({ region: record.region, supportGroup: record.support_group }), profileLabel: `${record.support_group || 'Unrecorded group'} / ${record.region || 'Unrecorded region'}` })); }
  function runs() {
    return (!reportsAvailable || reportsBusy || invalidReportRange() ? [] : reportsSqlState?.runs.records || []).map(record => {
      const run = camel(JSON.parse(record.payload));
      return { ...run, runKey: reportRunKey(run, Number(record.ordinal)), rowCount: record.rowCount, totalCount: record.totalCount,
        availability: record.availability, ambiguousId: record.duplicateCount > 1,
        profileLabel: reportProfileLabel(reportRunProfile(run)), scopeLabel: getRunScopeLabel(run.scope) };
    });
  }
  async function exportAll(format) {
    if (exporting || reportsBusy || !reportsAvailable) return;
    exporting = true;
    const version = reportsLoadVersion;
    try {
      const query = parameters('devices'); query.set('size', '100');
      const rows = [];
      for (let page = 1; ; page++) {
        query.set('page', page);
        const payload = await fetchPage(query);
        if (version !== reportsLoadVersion || currentRoute !== '/reports') return;
        rows.push(...payload.records.map(record => convert(record).row));
        query.set('revision', payload.revision);
        if (rows.length >= payload.total) break;
        if (rows.length >= 100000) throw new Error('Export exceeds 100000 evaluations. Select a shorter period.');
      }
      exportFilteredReports(format, rows);
    } catch (error) { showReportsAlert('danger', error.message); }
    finally { exporting = false; }
  }
  return { load, render, cancelPending, options, metrics, groups, runs, export: exportAll };
})();
