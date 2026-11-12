(function (root) {
  'use strict';
  const normalized = value => String(value ?? '').trim().toLowerCase();
  function search(item, value) {
    const needle = normalized(value);
    return !needle || [item.name, item.ip, item.hostname, item.facility, item.category,
      item.websiteUrl, item.location, item.notes, ...(item.configuredChecks ?? item.checks ?? []).map(check => check.url)]
      .some(field => String(field ?? '').toLowerCase().includes(needle));
  }
  function status(item, value) {
    if (!value || value === 'all') return true;
    if (item.enabled === false) return false;
    if (value === 'online') return item.isOnline === true;
    if (value === 'offline') return item.status === 'Down';
    if (value === 'problems') return item.status === 'Down' || item.status === 'Degraded';
    if (value === 'pending') return !item.lastCheck || item.status === 'Pending';
    return false;
  }
  function matches(item, filters = {}) {
    return (!filters.deviceType || normalized(item.deviceType || 'unspecified') === normalized(filters.deviceType))
      && (!filters.facility || normalized(item.facility || 'Unassigned') === normalized(filters.facility))
      && (!filters.category || normalized(item.category || 'Uncategorized') === normalized(filters.category))
      && (filters.monitoring !== 'enabled' || item.enabled !== false)
      && (filters.monitoring !== 'paused' || item.enabled === false)
      && search(item, filters.search) && status(item, filters.status);
  }
  const api = Object.freeze({ matches, search, status });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NetWatchFilters = api;
})(typeof window !== 'undefined' ? window : globalThis);
