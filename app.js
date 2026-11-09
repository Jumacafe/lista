'use strict';

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const KEY = 'lista-compras.items.v1';
const THEME_KEY = 'lista-compras.theme';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>'
};

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safeLocalGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function safeLocalSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
}

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */

let items = loadItems();
let filter = 'all';
let editingId = null;
let toastTimer = null;

function loadItems() {
  const raw = safeLocalGet(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(function (it) { return it && typeof it.name === 'string'; })
      .map(function (it) {
        return {
          id: it.id || uid(),
          name: String(it.name).slice(0, 80),
          qty: String(it.qty || '').slice(0, 24),
          note: String(it.note || '').slice(0, 80),
          done: !!it.done,
          createdAt: it.createdAt || Date.now()
        };
      });
  } catch (e) {
    return [];
  }
}

function saveItems() {
  safeLocalSet(KEY, JSON.stringify(items));
}

/* ------------------------------------------------------------------ */
/* Tema                                                                */
/* ------------------------------------------------------------------ */

const themeBtn = $('#themeBtn');

function applyTheme(theme) {
  const resolved =
    theme === 'auto'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0b1120' : '#eef1f6');
}

function cycleTheme() {
  const current = safeLocalGet(THEME_KEY) || 'auto';
  const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
  safeLocalSet(THEME_KEY, next);
  applyTheme(next);
}

applyTheme(safeLocalGet(THEME_KEY) || 'auto');
if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

const listEl = $('#list');
const emptyEl = $('#empty');
const emptyText = $('#emptyText');
const statsEl = $('#stats');

function visibleItems() {
  if (filter === 'pending') return items.filter(function (i) { return !i.done; });
  if (filter === 'done') return items.filter(function (i) { return i.done; });
  return items.slice();
}

function render() {
  const shown = visibleItems();

  listEl.innerHTML = shown
    .map(function (it) {
      const meta = [];
      if (it.qty) meta.push('<span class="qty">' + esc(it.qty) + '</span>');
      if (it.note) meta.push('<span class="note">' + esc(it.note) + '</span>');
      const metaHtml = meta.length
        ? '<span class="item-meta">' + meta.join('<span class="sep">&middot;</span>') + '</span>'
        : '';

      return (
        '<li class="item' + (it.done ? ' is-done' : '') + '" data-id="' + esc(it.id) + '">' +
          '<span class="grip" aria-hidden="true" title="Arrastrar para ordenar">' + ICON.grip + '</span>' +
          '<button class="check" type="button" role="checkbox" aria-checked="' + (it.done ? 'true' : 'false') +
            '" aria-label="' + (it.done ? 'Marcar como pendiente' : 'Marcar como comprado') + '">' + ICON.check + '</button>' +
          '<div class="item-body" role="button" tabindex="0">' +
            '<span class="item-name">' + esc(it.name) + '</span>' + metaHtml +
          '</div>' +
          '<div class="item-actions">' +
            '<button class="mini" type="button" data-act="edit" aria-label="Editar">' + ICON.edit + '</button>' +
            '<button class="mini danger" type="button" data-act="del" aria-label="Borrar">' + ICON.del + '</button>' +
          '</div>' +
        '</li>'
      );
    })
    .join('');

  listEl.classList.toggle('filtered', filter !== 'all');

  const isEmpty = shown.length === 0;
  emptyEl.hidden = !isEmpty;
  if (isEmpty) {
    emptyText.textContent =
      items.length === 0
        ? 'Tu lista esta vacia'
        : filter === 'done'
          ? 'Todavia no compraste nada'
          : 'Todo comprado, bien hecho';
  }

  const pending = items.filter(function (i) { return !i.done; }).length;
  const done = items.length - pending;
  statsEl.textContent = items.length
    ? pending + ' por comprar' + (done ? ' · ' + done + (done === 1 ? ' comprado' : ' comprados') : '')
    : 'Agrega tu primer articulo';

  $('#clearDone').hidden = done === 0;
}

/* ------------------------------------------------------------------ */
/* Acciones de la lista                                                 */
/* ------------------------------------------------------------------ */

function addItem(name, qty) {
  const clean = name.trim();
  if (!clean) return;
  items.unshift({
    id: uid(),
    name: clean.slice(0, 80),
    qty: (qty || '').trim().slice(0, 24),
    note: '',
    done: false,
    createdAt: Date.now()
  });
  saveItems();
  render();
}

function toggleItem(id) {
  const it = items.find(function (i) { return i.id === id; });
  if (!it) return;
  it.done = !it.done;
  saveItems();
  render();
}

function removeItem(id) {
  const index = items.findIndex(function (i) { return i.id === id; });
  if (index < 0) return;
  const removed = items.splice(index, 1)[0];
  saveItems();
  render();
  showToast('"' + removed.name + '" borrado', 'Deshacer', function () {
    items.splice(Math.min(index, items.length), 0, removed);
    saveItems();
    render();
  });
}

function updateItem(id, patch) {
  const it = items.find(function (i) { return i.id === id; });
  if (!it) return;
  it.name = String(patch.name || '').trim().slice(0, 80) || it.name;
  it.qty = String(patch.qty || '').trim().slice(0, 24);
  it.note = String(patch.note || '').trim().slice(0, 80);
  saveItems();
  render();
}

/* ------------------------------------------------------------------ */
/* Eventos de la lista                                                 */
/* ------------------------------------------------------------------ */

listEl.addEventListener('click', function (e) {
  const li = e.target.closest('.item');
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.closest('.check')) {
    toggleItem(id);
    return;
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'edit') openSheet(id);
    else if (act.dataset.act === 'del') removeItem(id);
    return;
  }
  if (e.target.closest('.item-body')) {
    openSheet(id);
  }
});

listEl.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const body = e.target.closest('.item-body');
  if (!body) return;
  e.preventDefault();
  openSheet(body.closest('.item').dataset.id);
});

/* ---------- reordenar arrastrando ---------- */

let dragId = null;

function itemAfterElement(container, y) {
  const els = $$('.item:not(.dragging)', container);
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;
  els.forEach(function (el) {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = el;
    }
  });
  return closest;
}

listEl.addEventListener('pointerdown', function (e) {
  const grip = e.target.closest('.grip');
  if (!grip || filter !== 'all') return;
  const li = grip.closest('.item');
  if (!li) return;
  dragId = li.dataset.id;
  li.classList.add('dragging');
  try { grip.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  e.preventDefault();
});

listEl.addEventListener('pointermove', function (e) {
  if (!dragId) return;
  const li = listEl.querySelector('.item[data-id="' + dragId + '"]');
  if (!li) return;
  const after = itemAfterElement(listEl, e.clientY);
  if (after == null) listEl.appendChild(li);
  else listEl.insertBefore(li, after);
});

function endDrag() {
  if (!dragId) return;
  const li = listEl.querySelector('.item[data-id="' + dragId + '"]');
  if (li) li.classList.remove('dragging');
  dragId = null;
  persistOrderFromDom();
}
listEl.addEventListener('pointerup', endDrag);
listEl.addEventListener('pointercancel', endDrag);

function persistOrderFromDom() {
  const order = $$('.item', listEl).map(function (el) { return el.dataset.id; });
  const byId = {};
  items.forEach(function (i) { byId[i.id] = i; });
  const next = [];
  order.forEach(function (id) { if (byId[id]) { next.push(byId[id]); delete byId[id]; } });
  items.forEach(function (i) { if (byId[i.id]) next.push(i); });
  items = next;
  saveItems();
}

/* ------------------------------------------------------------------ */
/* Agregar                                                             */
/* ------------------------------------------------------------------ */

const addForm = $('#addForm');
const nameInput = $('#nameInput');
const qtyInput = $('#qtyInput');

addForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  addItem(name, qtyInput.value);
  nameInput.value = '';
  qtyInput.value = '';
  nameInput.focus();
});

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

$$('.chip[data-filter]').forEach(function (chip) {
  chip.addEventListener('click', function () {
    $$('.chip[data-filter]').forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    filter = chip.dataset.filter;
    render();
  });
});

/* ------------------------------------------------------------------ */
/* Hoja de edicion                                                     */
/* ------------------------------------------------------------------ */

const sheet = $('#sheet');
const editName = $('#editName');
const editQty = $('#editQty');
const editNote = $('#editNote');

function openSheet(id) {
  const it = items.find(function (i) { return i.id === id; });
  if (!it) return;
  editingId = id;
  editName.value = it.name;
  editQty.value = it.qty;
  editNote.value = it.note;
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(function () { editName.focus(); editName.select(); }, 60);
}

function closeSheet() {
  sheet.hidden = true;
  document.body.style.overflow = '';
  editingId = null;
}

$('#editCancel').addEventListener('click', closeSheet);
$$('[data-close]').forEach(function (el) { el.addEventListener('click', closeSheet); });

$('#editSave').addEventListener('click', function () {
  if (!editingId) return;
  updateItem(editingId, { name: editName.value, qty: editQty.value, note: editNote.value });
  closeSheet();
});

editName.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); $('#editSave').click(); }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !sheet.hidden) closeSheet();
});

/* ------------------------------------------------------------------ */
/* Borrar comprados                                                    */
/* ------------------------------------------------------------------ */

$('#clearDone').addEventListener('click', function () {
  const removed = items.filter(function (i) { return i.done; });
  if (!removed.length) return;
  items = items.filter(function (i) { return !i.done; });
  saveItems();
  render();
  showToast(removed.length + ' comprado(s) borrado(s)', 'Deshacer', function () {
    items = items.concat(removed);
    saveItems();
    render();
  });
});

/* ------------------------------------------------------------------ */
/* Compartir                                                           */
/* ------------------------------------------------------------------ */

$('#shareBtn').addEventListener('click', function () {
  if (!items.length) { showToast('La lista esta vacia'); return; }
  const pending = items.filter(function (i) { return !i.done; });
  const done = items.filter(function (i) { return i.done; });
  const lines = [];
  if (pending.length) {
    lines.push('Lista de compras:');
    pending.forEach(function (i) {
      lines.push('- ' + i.name + (i.qty ? ' (' + i.qty + ')' : ''));
    });
  }
  if (done.length) {
    lines.push('', 'Ya comprado:');
    done.forEach(function (i) { lines.push('- ' + i.name); });
  }
  const text = lines.join('\n');
  if (navigator.share) {
    navigator.share({ title: 'Lista de compras', text: text }).catch(function () { copyText(text); });
  } else {
    copyText(text);
  }
});

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () { showToast('Lista copiada'); },
      function () { showToast('No se pudo copiar'); }
    );
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Lista copiada'); }
    catch (e) { showToast('No se pudo copiar'); }
    document.body.removeChild(ta);
  }
}

/* ------------------------------------------------------------------ */
/* Exportar / importar                                                 */
/* ------------------------------------------------------------------ */

$('#exportBtn').addEventListener('click', function () {
  const data = JSON.stringify({ app: 'lista-compras', version: 1, items: items }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp =
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
  a.href = url;
  a.download = 'lista-compras-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
});

$('#importBtn').addEventListener('click', function () { $('#importFile').click(); });

$('#importFile').addEventListener('change', function (e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const parsed = JSON.parse(String(reader.result));
      const arr = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(arr)) throw new Error('formato');
      const imported = arr
        .filter(function (it) { return it && typeof it.name === 'string'; })
        .map(function (it) {
          return {
            id: it.id || uid(),
            name: String(it.name).slice(0, 80),
            qty: String(it.qty || '').slice(0, 24),
            note: String(it.note || '').slice(0, 80),
            done: !!it.done,
            createdAt: it.createdAt || Date.now()
          };
        });
      const backup = items;
      items = imported;
      saveItems();
      render();
      showToast(imported.length + ' articulo(s) importados', 'Deshacer', function () {
        items = backup;
        saveItems();
        render();
      });
    } catch (err) {
      showToast('Archivo invalido');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

const toast = $('#toast');
const toastText = $('#toastText');
const toastAction = $('#toastAction');

function showToast(text, actionLabel, action) {
  toastText.textContent = text;
  if (actionLabel && action) {
    toastAction.hidden = false;
    toastAction.textContent = actionLabel;
    toastAction.onclick = function () {
      hideToast();
      action();
    };
  } else {
    toastAction.hidden = true;
    toastAction.onclick = null;
  }
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 9000 : 2600);
}

function hideToast() {
  toast.hidden = true;
  clearTimeout(toastTimer);
}

/* ------------------------------------------------------------------ */
/* Service worker (offline)                                             */
/* ------------------------------------------------------------------ */

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* noop */ });
  });
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

render();
