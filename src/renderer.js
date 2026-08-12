'use strict';

// Fallback para ejecución en navegador: si no estamos en Electron,
// exponemos `window.api` usando la API REST disponible en el backend.
if (typeof window.api === 'undefined') {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : window.location.origin;

  window.api = {
    loadItems: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/items`);
        if (!res.ok) throw new Error('Error cargando items: ' + res.status);
        return await res.json();
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    saveItems: async (items) => {
      try {
        // Obtener items en servidor para sincronizar borrados/actualizaciones
        const res = await fetch(`${API_BASE}/api/items`);
        if (!res.ok) throw new Error('Error cargando items para sincronizar: ' + res.status);
        const serverItems = await res.json();
        const serverIds = serverItems.map(i => i.id);
        const clientIds = items.map(i => i.id).filter(Boolean);

        // Borrar los que ya no existen en el cliente
        for (const id of serverIds) {
          if (!clientIds.includes(id)) {
            await fetch(`${API_BASE}/api/items/${id}`, { method: 'DELETE' });
          }
        }

        // Actualizar / crear
        for (const item of items) {
          const payload = {
            referencia: item.referencia,
            descripcion: item.descripcion,
            cantidad: Number(item.cantidad) || 0,
            precioUnitario: Number(item.precioUnitario) || 0
          };

          if (item.id && serverIds.includes(item.id)) {
            await fetch(`${API_BASE}/api/items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } else {
            await fetch(`${API_BASE}/api/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        }

        return true;
      } catch (err) {
        console.error('saveItems fallback error', err);
        return false;
      }
    }
  };
}

// ---------- Estado ----------
let items = [];
let searchTerm = '';
let editingId = null;
let dialogResolver = null;
let dialogTriggerElement = null;

// Umbral de stock bajo (igual al original: 6 unidades o menos se marca en rojo)
const LOW_STOCK_THRESHOLD = 6;
// Porcentajes de margen mostrados en el panel Resumen
const MARGEN_PCT = 0.49;
const GANANCIA_PCT = 0.51;

// ---------- Cálculo de precios ----------
// Cadena: Unitario -> +19% IVA -> +49% (precio público) -> +10% (precio con factura)
// Los porcentajes se aplican en cascada sobre el valor SIN redondear del paso anterior,
// y solo se redondea el número que se muestra en pantalla.
function calcPrices(unitario) {
  const iva = unitario * 1.19;
  const publicoRaw = iva * 1.49;
  const facturaRaw = publicoRaw * 1.10;
  return {
    iva: Math.round(iva),
    publico: Math.round(publicoRaw),
    factura: Math.round(facturaRaw)
  };
}

function formatCOP(n) {
  const rounded = Math.round(n);
  return '$' + rounded.toLocaleString('es-CO');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ---------- Inicialización ----------
async function init() {
  items = await window.api.loadItems();
  render();
  bindStaticEvents();
}

function filteredItems() {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return items;
  return items.filter(it =>
    it.referencia.toLowerCase().includes(term) ||
    it.descripcion.toLowerCase().includes(term)
  );
}

// ---------- Render ----------
function render() {
  const list = filteredItems();
  renderTable(list);
  renderSidebar();

  document.getElementById('resultCount').textContent =
    `${list.length} resultado${list.length === 1 ? '' : 's'}`;
  document.getElementById('shownCount').textContent =
    `${list.length} referencia${list.length === 1 ? '' : 's'} mostrada${list.length === 1 ? '' : 's'}`;
}

function renderTable(list) {
  const tbody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');
  tbody.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  list.forEach(item => {
    const { iva, publico, factura } = calcPrices(item.precioUnitario);
    const isLow = item.cantidad < LOW_STOCK_THRESHOLD;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cell-ref">${escapeHtml(item.referencia)}</td>
      <td>${escapeHtml(item.descripcion)}</td>
      <td>
        <span class="qty-cell ${isLow ? 'qty-low' : ''}" data-id="${item.id}" title="Clic para editar cantidad">
          <span class="qty-value">${item.cantidad}</span>
          <span class="qty-caret">▾</span>
        </span>
      </td>
      <td>${formatCOP(item.precioUnitario)}</td>
      <td>${formatCOP(iva)}</td>
      <td class="text-green">${formatCOP(publico)}</td>
      <td class="text-blue">${formatCOP(factura)}</td>
      <td>
        <div class="cell-actions">
          <button class="btn-edit" data-id="${item.id}">EDITAR</button>
          <button class="btn-delete" data-id="${item.id}" title="Eliminar">✕</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSidebar() {
  const low = items.filter(it => it.cantidad < LOW_STOCK_THRESHOLD);

  document.getElementById('lowStockBadge').textContent = low.length;
  const lowList = document.getElementById('lowStockList');
  lowList.innerHTML = low.map(it => `
    <div class="low-stock-item">
      <div>
        <div class="low-ref">${escapeHtml(it.referencia)}</div>
        <div class="low-desc">${escapeHtml(it.descripcion)}</div>
      </div>
      <div class="low-units">${it.cantidad} uds</div>
    </div>
  `).join('') || '<p class="empty-note">Sin referencias en stock bajo</p>';

  const totalRefs = items.length;
  const totalUnits = items.reduce((s, i) => s + i.cantidad, 0);
  const totalValue = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const margen = totalValue * MARGEN_PCT;
  const ganancia = totalValue * GANANCIA_PCT;

  document.getElementById('sumRefs').textContent = totalRefs;
  document.getElementById('sumUnits').textContent = totalUnits;
  document.getElementById('sumValue').textContent = formatCOP(totalValue);
  document.getElementById('sumLowStock').textContent = low.length;
  document.getElementById('sumMargin').textContent = formatCOP(margen);
  document.getElementById('sumProfit').textContent = formatCOP(ganancia);
}

// ---------- Edición rápida de cantidad ----------
function startQuantityEdit(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  const cell = document.querySelector(`.qty-cell[data-id="${id}"]`);
  if (!cell || cell.classList.contains('editing')) return;

  cell.classList.add('editing');
  cell.innerHTML = `
    <button type="button" class="qty-btn qty-dec">−</button>
    <input type="number" class="qty-input" min="0" step="1" value="${item.cantidad}" />
    <button type="button" class="qty-btn qty-inc">+</button>
  `;

  const input = cell.querySelector('.qty-input');
  input.focus();
  input.select();

  const commit = async () => {
    const num = Number(input.value);
    if (!Number.isNaN(num) && num >= 0) {
      item.cantidad = Math.round(num);
      await window.api.saveItems(items);
    }
    render();
  };

  cell.querySelector('.qty-dec').addEventListener('click', (e) => {
    e.stopPropagation();
    input.value = Math.max(0, Number(input.value || 0) - 1);
  });
  cell.querySelector('.qty-inc').addEventListener('click', (e) => {
    e.stopPropagation();
    input.value = Number(input.value || 0) + 1;
  });
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') render();
  });
  input.addEventListener('blur', commit);
}

// ---------- Modal Agregar / Editar ----------
function openModal(id = null) {
  editingId = id;
  const modalTitle = document.getElementById('modalTitle');
  const refInput = document.getElementById('fieldReferencia');
  const descInput = document.getElementById('fieldDescripcion');
  const qtyInput = document.getElementById('fieldCantidad');
  const priceInput = document.getElementById('fieldPrecio');

  document.getElementById('modalError').classList.add('hidden');

  if (id) {
    const item = items.find(i => i.id === id);
    modalTitle.textContent = 'Editar Referencia';
    refInput.value = item.referencia;
    descInput.value = item.descripcion;
    qtyInput.value = item.cantidad;
    priceInput.value = item.precioUnitario;
  } else {
    modalTitle.textContent = 'Agregar Referencia';
    refInput.value = '';
    descInput.value = '';
    qtyInput.value = '';
    priceInput.value = '';
  }

  document.getElementById('modalOverlay').classList.remove('hidden');

  window.setTimeout(() => {
    refInput.focus();
    refInput.select();
  }, 0);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingId = null;
}

function showModalError(msg) {
  return showDialog({
    title: 'Advertencia',
    message: msg,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    type: 'info'
  });
}

async function saveModal() {
  const referencia = document.getElementById('fieldReferencia').value.trim();
  const descripcion = document.getElementById('fieldDescripcion').value.trim();
  const cantidad = Number(document.getElementById('fieldCantidad').value);
  const precioUnitario = Number(document.getElementById('fieldPrecio').value);

  if (!referencia || !descripcion) {
    await showModalError('Completa la referencia y la descripción.');
    return;
  }
  if (Number.isNaN(cantidad) || cantidad < 0) {
    await showModalError('La cantidad debe ser un número válido.');
    return;
  }
  if (Number.isNaN(precioUnitario) || precioUnitario < 0) {
    await showModalError('El precio unitario debe ser un número válido.');
    return;
  }

  const duplicate = items.find(i =>
    i.referencia.toLowerCase() === referencia.toLowerCase() && i.id !== editingId
  );
  if (duplicate) {
    await showModalError('Ya existe una referencia con ese nombre.');
    return;
  }

  if (editingId) {
    const item = items.find(i => i.id === editingId);
    Object.assign(item, { referencia, descripcion, cantidad, precioUnitario });
  } else {
    const nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
    items.push({ id: nextId, referencia, descripcion, cantidad, precioUnitario });
  }

  await window.api.saveItems(items);
  closeModal();
  render();
}

function showDialog({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', type = 'confirm' }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogTriggerElement = document.activeElement && document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const overlay = document.getElementById('dialogOverlay');
    const titleEl = document.getElementById('dialogTitle');
    const messageEl = document.getElementById('dialogMessage');
    const cancelBtn = document.getElementById('dialogCancel');
    const confirmBtn = document.getElementById('dialogConfirm');

    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    if (type === 'info') {
      cancelBtn.classList.add('hidden');
    } else {
      cancelBtn.classList.remove('hidden');
    }

    overlay.classList.remove('hidden');

    window.setTimeout(() => {
      if (type === 'info') {
        confirmBtn.focus();
      } else {
        cancelBtn.focus();
      }
    }, 0);
  });
}

function closeDialog(result = false) {
  const overlay = document.getElementById('dialogOverlay');
  overlay.classList.add('hidden');

  if (dialogResolver) {
    const resolve = dialogResolver;
    dialogResolver = null;
    resolve(result);
  }

  window.setTimeout(() => {
    if (dialogTriggerElement && document.contains(dialogTriggerElement)) {
      dialogTriggerElement.focus();
    }
    dialogTriggerElement = null;
  }, 0);
}

async function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  const ok = await showDialog({
    title: 'Confirmar eliminación',
    message: `¿Eliminar la referencia "${item.referencia}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    type: 'confirm'
  });

  if (!ok) return;
  items = items.filter(i => i.id !== id);
  await window.api.saveItems(items);
  render();
}

// ---------- Eventos ----------
function bindStaticEvents() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    render();
  });

  document.getElementById('btnAdd').addEventListener('click', () => openModal());

  document.getElementById('tableBody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-delete');
    const qtyCell = e.target.closest('.qty-cell');

    if (editBtn) return openModal(Number(editBtn.dataset.id));
    if (delBtn) return deleteItem(Number(delBtn.dataset.id));
    if (qtyCell) return startQuantityEdit(Number(qtyCell.dataset.id));
  });

  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnSave').addEventListener('click', saveModal);

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });

  document.getElementById('dialogOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'dialogOverlay') closeDialog(false);
  });

  document.getElementById('dialogCancel').addEventListener('click', () => closeDialog(false));
  document.getElementById('dialogConfirm').addEventListener('click', () => closeDialog(true));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('modalOverlay').classList.contains('hidden')) {
      closeModal();
    }

    if (e.key === 'Escape' && !document.getElementById('dialogOverlay').classList.contains('hidden')) {
      closeDialog(false);
    }
  });

  ['fieldReferencia', 'fieldDescripcion', 'fieldCantidad', 'fieldPrecio'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveModal();
    });
  });
}

init();
