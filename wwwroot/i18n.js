window.NetWatchI18n = (() => {
  'use strict';
  const dictionary = window.NetWatchSpanish || {};
  let language = 'en';
  try { language = localStorage.getItem('netwatch.language') === 'es' ? 'es' : 'en'; } catch { /* Storage is optional. */ }
  const requested = new URL(location.href).searchParams.get('lang');
  if (requested === 'en' || requested === 'es') language = requested;
  const seen = new Set(), missing = new Set();
  const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ');
  const own = key => Object.prototype.hasOwnProperty.call(dictionary, key);
  const translatedValues = new Set(Object.values(dictionary));
  const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = Object.keys(dictionary).filter(key => /\{\d+\}/.test(key)).map(key => {
    const indexes = [];
    const parts = key.split(/(\{\d+\})/).map(part => {
      if (!/^\{\d+\}$/.test(part)) return escapePattern(part);
      indexes.push(Number(part.slice(1, -1)));
      return '([\\s\\S]*?)';
    });
    return { key, indexes, pattern: new RegExp('^' + parts.join('') + '$'), weight: key.replace(/\{\d+\}/g, '').length };
  }).sort((left, right) => right.weight - left.weight);
  const translatedPatterns = Object.entries(dictionary).filter(([key, value]) => key !== value && /\{\d+\}/.test(value)).map(([, value]) =>
    new RegExp('^' + value.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? '[\\s\\S]*?' : escapePattern(part)).join('') + '$'));
  function resolve(value) {
    const key = normalize(value);
    if (!key || !/[a-zA-Z]/.test(key)) return { text: key, known: true };
    if (own(key)) { seen.add(key); return { text: language === 'es' ? dictionary[key] : key, known: true }; }
    if (language === 'es' && translatedValues.has(key)) return { text: key, known: true };
    if (language === 'es' && translatedPatterns.some(pattern => pattern.test(key))) return { text: key, known: true };
    seen.add(key);
    for (const item of patterns) {
      const match = key.match(item.pattern);
      if (!match) continue;
      const values = {};
      item.indexes.forEach((index, offset) => { values[index] = match[offset + 1]; });
      return { text: (language === 'es' ? dictionary[item.key] : item.key).replace(/\{(\d+)\}/g, (all, index) => values[index] ?? all), known: true };
    }
    missing.add(key);
    return { text: key, known: false };
  }
  function text(value) {
    if (typeof value !== 'string') return value == null ? '' : String(value);
    if (!value.trim()) return value;
    const result = resolve(value);
    const leading = value.match(/^\s*/)[0], trailing = value.match(/\s*$/)[0];
    return leading + result.text + trailing;
  }
  function error(value, traceId = '') {
    const result = resolve(String(value || 'Unable to complete the operation.'));
    const message = language === 'es' && !result.known
      ? 'No se pudo completar la operaci\u00f3n. Consulta Diagn\u00f3sticos para ver el detalle t\u00e9cnico.' : result.text;
    return message + (traceId ? ' ' + text(`Reference: ${traceId}`) : '');
  }
  const marker = index => `__nw_i18n_value_${index}__`;
  const markerPattern = /__nw_i18n_value_(\d+)__/g;
  function translatedTemplate(value) {
    const indexes = [];
    const source = value.replace(markerPattern, (all, index) => { indexes.push(Number(index)); return `{${indexes.length - 1}}`; });
    if (!/[a-zA-Z]/.test(source.replace(/\{\d+\}/g, ''))) return value;
    return text(source).replace(/\{(\d+)\}/g, (all, index) => indexes[index] == null ? all : marker(indexes[index]));
  }
  const attributes = ['title', 'aria-label', 'placeholder', 'alt', 'data-label'];
  const ignored = 'script, style, pre, code, textarea, [data-i18n-skip]';
  function localizeTree(root, templated = false) {
    const parents = [root, ...root.querySelectorAll('*')];
    for (const parent of parents) {
      if (parent.nodeType === Node.ELEMENT_NODE && parent.closest(ignored)) continue;
      let group = [];
      const flush = () => {
        if (!group.length) return;
        const source = group.map(node => node.data).join('');
        const node = document.createTextNode(templated ? translatedTemplate(source) : text(source));
        parent.insertBefore(node, group[0]);
        group.forEach(value => value.remove()); group = [];
      };
      for (const node of [...parent.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE || templated && node.nodeType === Node.COMMENT_NODE && /^__nw_i18n_value_\d+__$/.test(node.data)) group.push(node);
        else flush();
      }
      flush();
    }
    for (const element of root.querySelectorAll('*')) {
      if (element.closest(ignored)) continue;
      for (const attribute of attributes) if (element.hasAttribute(attribute)) {
        const value = element.getAttribute(attribute);
        element.setAttribute(attribute, templated ? translatedTemplate(value) : text(value));
      }
    }
  }
  const templates = new WeakMap(), markupCache = new Map();
  function compile(strings) {
    const template = document.createElement('template');
    let inTag = false, quote = '', source = '';
    strings.forEach((part, index) => {
      for (let offset = 0; offset < part.length; offset++) {
        const character = part[offset];
        if (inTag) {
          if (quote) { if (character === quote) quote = ''; }
          else if (character === '"' || character === "'") quote = character;
          else if (character === '>') inTag = false;
        } else if (character === '<' && /[a-zA-Z/!?]/.test(part[offset + 1] || '')) inTag = true;
      }
      source += part;
      // Comments survive table parsing; text placeholders would be foster-parented out of tbody.
      if (index < strings.length - 1) source += inTag ? marker(index) : `<!--${marker(index)}-->`;
    });
    template.innerHTML = source;
    localizeTree(template.content, true);
    return template.innerHTML;
  }
  function html(strings, ...values) {
    let compiled = templates.get(strings);
    if (compiled == null) { compiled = compile(strings); templates.set(strings, compiled); }
    // Replace placeholders once: interpolated inventory/markup is never translated or reparsed.
    return compiled.replace(/(?:<!--|&lt;!--)?__nw_i18n_value_(\d+)__(?:=""|-->|--&gt;)?/g, (all, index) => String(values[index] ?? ''));
  }
  function markup(source) {
    if (!markupCache.has(source)) {
      const strings = [source];
      const compiled = compile(strings);
      if (markupCache.size < 1000) markupCache.set(source, compiled);
      return compiled;
    }
    return markupCache.get(source);
  }
  function setLanguage(value) {
    if (value !== 'en' && value !== 'es') return false;
    try { localStorage.setItem('netwatch.language', value); return true; } catch { return false; }
  }
  document.documentElement.lang = language;
  localizeTree(document.body);
  const select = document.querySelector('#app-language');
  if (select) select.value = language;
  document.addEventListener('invalid', event => {
    const input = event.target;
    if (!input.setCustomValidity || input.validity.customError) return;
    let message = 'Enter a valid value.';
    if (input.validity.valueMissing) message = 'This field is required.';
    else if (input.validity.typeMismatch) message = input.type === 'url' ? 'Enter a valid HTTP or HTTPS URL.' : 'Enter a valid value.';
    else if (input.validity.rangeUnderflow) message = `The minimum value is ${input.min}.`;
    else if (input.validity.rangeOverflow) message = `The maximum value is ${input.max}.`;
    else if (input.validity.tooLong) message = `Use at most ${input.maxLength} characters.`;
    input.setCustomValidity(text(message)); input.dataset.i18nValidity = 'true';
  }, true);
  document.addEventListener('input', event => {
    if (event.target.dataset?.i18nValidity) { event.target.setCustomValidity(''); delete event.target.dataset.i18nValidity; }
  }, true);
  return Object.freeze({ text, error, html, markup, setLanguage,
    language, locale: language === 'es' ? 'es-ES' : 'en-US',
    missing: () => [...missing].sort(), seen: () => [...seen].sort() });
})();
