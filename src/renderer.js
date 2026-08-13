'use strict';

// ============================================================
// Estado
// ============================================================

let items = [];
let searchTerm = '';
let editingId = null;

let dialogResolver = null;
let dialogTriggerElement = null;

// Umbral de stock bajo
const LOW_STOCK_THRESHOLD = 6;

// Porcentajes del panel Resumen
const MARGEN_PCT = 0.49;
const GANANCIA_PCT = 0.51;


// ============================================================
// API
// ============================================================

/*
 * IMPORTANTE:
 *
 * Ya no usamos:
 *
 * window.api.loadItems()
 * window.api.saveItems()
 *
 * Eso era para Electron.
 *
 * Ahora usamos fetch('/api/...').
 *
 * Nginx recibe /api y lo envía al backend Express.
 */

// Obtener todos los items
async function apiGetItems() {
  const response = await fetch('/api/items');

  if (!response.ok) {
    throw new Error('No se pudieron cargar los items');
  }

  return await response.json();
}


// Crear un item
async function apiCreateItem(item) {
  const response = await fetch('/api/items', {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      referencia: item.referencia,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el item');
  }

  return data;
}


// Actualizar un item
async function apiUpdateItem(item) {
  const response = await fetch(`/api/items/${item.id}`, {
    method: 'PUT',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      referencia: item.referencia,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar el item');
  }

  return data;
}


// Eliminar un item
async function apiDeleteItem(id) {
  const response = await fetch(`/api/items/${id}`, {
    method: 'DELETE'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el item');
  }

  return data;
}


// ============================================================
// Cálculo de precios
// ============================================================

/*
 * Cadena:
 *
 * Unitario
 *   ↓ +19% IVA
 * IVA
 *   ↓ +49%
 * Precio público
 *   ↓ +10%
 * Precio con factura
 *
 * Los cálculos se hacen sin redondear
 * y solo se redondea al mostrar.
 */

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


// ============================================================
// Formato de moneda
// ============================================================

function formatCOP(n) {
  const rounded = Math.round(n);

  return '$' + rounded.toLocaleString('es-CO');
}


// ============================================================
// Seguridad HTML
// ============================================================

function escapeHtml(str) {
  const div = document.createElement('div');

  div.textContent = str == null
    ? ''
    : String(str);

  return div.innerHTML;
}


// ============================================================
// Inicialización
// ============================================================

async function init() {
  try {
    items = await apiGetItems();

    render();

    bindStaticEvents();

    console.log('Inventario cargado correctamente');
  } catch (error) {
    console.error('Error inicializando aplicación:', error);

    showApplicationError(
      'No se pudo conectar con el servidor del inventario. ' +
      'Verifica que Docker esté funcionando.'
    );
  }
}


// ============================================================
// Error general de aplicación
// ============================================================

function showApplicationError(message) {
  const tbody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  if (tbody) {
    tbody.innerHTML = '';
  }

  if (emptyState) {
    emptyState.textContent = message;
    emptyState.classList.remove('hidden');
  }
}


// ============================================================
// Filtrado
// ============================================================

function filteredItems() {
  const term = searchTerm.trim().toLowerCase();

  if (!term) {
    return items;
  }

  return items.filter(it =>
    String(it.referencia || '')
      .toLowerCase()
      .includes(term) ||

    String(it.descripcion || '')
      .toLowerCase()
      .includes(term)
  );
}


// ============================================================
// Render general
// ============================================================

function render() {
  const list = filteredItems();

  renderTable(list);
  renderSidebar();

  const resultCount = document.getElementById('resultCount');

  if (resultCount) {
    resultCount.textContent =
      `${list.length} resultado${list.length === 1 ? '' : 's'}`;
  }

  const shownCount = document.getElementById('shownCount');

  if (shownCount) {
    shownCount.textContent =
      `${list.length} referencia${list.length === 1 ? '' : 's'} ` +
      `mostrada${list.length === 1 ? '' : 's'}`;
  }
}


// ============================================================
// Render tabla
// ============================================================

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
    const { iva, publico, factura } =
      calcPrices(Number(item.precioUnitario) || 0);

    const cantidad = Number(item.cantidad) || 0;

    const isLow = cantidad < LOW_STOCK_THRESHOLD;

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="cell-ref">
        ${escapeHtml(item.referencia)}
      </td>

      <td>
        ${escapeHtml(item.descripcion)}
      </td>

      <td>
        <span
          class="qty-cell ${isLow ? 'qty-low' : ''}"
          data-id="${item.id}"
          title="Clic para editar cantidad"
        >
          <span class="qty-value">
            ${cantidad}
          </span>

          <span class="qty-caret">
            ▾
          </span>
        </span>
      </td>

      <td>
        ${formatCOP(item.precioUnitario)}
      </td>

      <td>
        ${formatCOP(iva)}
      </td>

      <td class="text-green">
        ${formatCOP(publico)}
      </td>

      <td class="text-blue">
        ${formatCOP(factura)}
      </td>

      <td>
        <div class="cell-actions">

          <button
            class="btn-edit"
            data-id="${item.id}"
          >
            EDITAR
          </button>

          <button
            class="btn-delete"
            data-id="${item.id}"
            title="Eliminar"
          >
            ✕
          </button>

        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}


// ============================================================
// Sidebar
// ============================================================

function renderSidebar() {
  const low = items.filter(
    it => Number(it.cantidad) < LOW_STOCK_THRESHOLD
  );

  document.getElementById('lowStockBadge').textContent =
    low.length;

  const lowList =
    document.getElementById('lowStockList');

  lowList.innerHTML = low.map(it => `
    <div class="low-stock-item">

      <div>
        <div class="low-ref">
          ${escapeHtml(it.referencia)}
        </div>

        <div class="low-desc">
          ${escapeHtml(it.descripcion)}
        </div>
      </div>

      <div class="low-units">
        ${Number(it.cantidad) || 0} uds
      </div>

    </div>
  `).join('') ||
  '<p class="empty-note">Sin referencias en stock bajo</p>';


  // Resumen

  const totalRefs = items.length;

  const totalUnits = items.reduce(
    (sum, item) =>
      sum + (Number(item.cantidad) || 0),
    0
  );

  const totalValue = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.cantidad) || 0) *
      (Number(item.precioUnitario) || 0),
    0
  );

  const margen = totalValue * MARGEN_PCT;

  const ganancia = totalValue * GANANCIA_PCT;


  document.getElementById('sumRefs').textContent =
    totalRefs;

  document.getElementById('sumUnits').textContent =
    totalUnits;

  document.getElementById('sumValue').textContent =
    formatCOP(totalValue);

  document.getElementById('sumLowStock').textContent =
    low.length;

  document.getElementById('sumMargin').textContent =
    formatCOP(margen);

  document.getElementById('sumProfit').textContent =
    formatCOP(ganancia);
}


// ============================================================
// Edición rápida de cantidad
// ============================================================

function startQuantityEdit(id) {
  const item = items.find(
    i => Number(i.id) === Number(id)
  );

  if (!item) {
    return;
  }

  const cell = document.querySelector(
    `.qty-cell[data-id="${id}"]`
  );

  if (!cell || cell.classList.contains('editing')) {
    return;
  }

  cell.classList.add('editing');

  cell.innerHTML = `
    <button
      type="button"
      class="qty-btn qty-dec"
    >
      −
    </button>

    <input
      type="number"
      class="qty-input"
      min="0"
      step="1"
      value="${Number(item.cantidad) || 0}"
    />

    <button
      type="button"
      class="qty-btn qty-inc"
    >
      +
    </button>
  `;

  const input =
    cell.querySelector('.qty-input');

  input.focus();
  input.select();


  // Guardar cantidad en PostgreSQL
  const commit = async () => {
    const num = Number(input.value);

    if (
      Number.isNaN(num) ||
      num < 0
    ) {
      render();
      return;
    }

    const newQuantity = Math.round(num);

    // No hacemos saveItems.
    // Ahora actualizamos directamente el item
    // mediante PUT /api/items/:id.

    const updatedItem = {
      ...item,
      cantidad: newQuantity
    };

    try {
      const savedItem =
        await apiUpdateItem(updatedItem);

      const index = items.findIndex(
        i => Number(i.id) === Number(id)
      );

      if (index !== -1) {
        items[index] = savedItem;
      }

      render();

    } catch (error) {
      console.error(
        'Error actualizando cantidad:',
        error
      );

      alert(
        'No se pudo actualizar la cantidad: ' +
        error.message
      );

      render();
    }
  };


  // Botón -
  cell.querySelector('.qty-dec')
    .addEventListener('click', e => {

      e.stopPropagation();

      input.value = Math.max(
        0,
        Number(input.value || 0) - 1
      );
    });


  // Botón +
  cell.querySelector('.qty-inc')
    .addEventListener('click', e => {

      e.stopPropagation();

      input.value =
        Number(input.value || 0) + 1;
    });


  // Evitar que el click propague
  input.addEventListener(
    'click',
    e => e.stopPropagation()
  );


  // Enter = guardar
  input.addEventListener(
    'keydown',
    e => {

      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        render();
      }
    }
  );


  // Perder foco = guardar
  input.addEventListener(
    'blur',
    commit
  );
}


// ============================================================
// Modal Agregar / Editar
// ============================================================

function openModal(id = null) {
  editingId = id;

  const modalTitle =
    document.getElementById('modalTitle');

  const refInput =
    document.getElementById('fieldReferencia');

  const descInput =
    document.getElementById('fieldDescripcion');

  const qtyInput =
    document.getElementById('fieldCantidad');

  const priceInput =
    document.getElementById('fieldPrecio');


  document
    .getElementById('modalError')
    .classList.add('hidden');


  if (id !== null) {
    const item = items.find(
      i => Number(i.id) === Number(id)
    );

    if (!item) {
      return;
    }

    modalTitle.textContent =
      'Editar Referencia';

    refInput.value =
      item.referencia;

    descInput.value =
      item.descripcion;

    qtyInput.value =
      item.cantidad;

    priceInput.value =
      item.precioUnitario;

  } else {

    modalTitle.textContent =
      'Agregar Referencia';

    refInput.value = '';
    descInput.value = '';
    qtyInput.value = '';
    priceInput.value = '';
  }


  document
    .getElementById('modalOverlay')
    .classList.remove('hidden');


  window.setTimeout(() => {
    refInput.focus();
    refInput.select();
  }, 0);
}


// ============================================================
// Cerrar modal
// ============================================================

function closeModal() {
  document
    .getElementById('modalOverlay')
    .classList.add('hidden');

  editingId = null;
}


// ============================================================
// Error modal
// ============================================================

async function showModalError(msg) {
  return showDialog({
    title: 'Advertencia',
    message: msg,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    type: 'info'
  });
}


// ============================================================
// Guardar modal
// ============================================================

async function saveModal() {
  const referencia =
    document
      .getElementById('fieldReferencia')
      .value
      .trim();

  const descripcion =
    document
      .getElementById('fieldDescripcion')
      .value
      .trim();

  const cantidad =
    Number(
      document
        .getElementById('fieldCantidad')
        .value
    );

  const precioUnitario =
    Number(
      document
        .getElementById('fieldPrecio')
        .value
    );


  // Validaciones

  if (!referencia || !descripcion) {
    await showModalError(
      'Completa la referencia y la descripción.'
    );

    return;
  }


  if (
    Number.isNaN(cantidad) ||
    cantidad < 0
  ) {
    await showModalError(
      'La cantidad debe ser un número válido.'
    );

    return;
  }


  if (
    Number.isNaN(precioUnitario) ||
    precioUnitario < 0
  ) {
    await showModalError(
      'El precio unitario debe ser un número válido.'
    );

    return;
  }


  // Verificar referencia duplicada
  const duplicate = items.find(i =>
    String(i.referencia)
      .toLowerCase() === referencia.toLowerCase() &&
    Number(i.id) !== Number(editingId)
  );


  if (duplicate) {
    await showModalError(
      'Ya existe una referencia con ese nombre.'
    );

    return;
  }


  // ==========================================================
  // EDITAR
  // ==========================================================

  if (editingId !== null) {

    const item = items.find(
      i => Number(i.id) === Number(editingId)
    );

    if (!item) {
      return;
    }


    const updatedItem = {
      ...item,

      referencia,

      descripcion,

      cantidad: Math.round(cantidad),

      precioUnitario
    };


    try {

      const savedItem =
        await apiUpdateItem(updatedItem);


      const index = items.findIndex(
        i => Number(i.id) === Number(editingId)
      );


      if (index !== -1) {
        items[index] = savedItem;
      }


      closeModal();

      render();

    } catch (error) {

      console.error(
        'Error actualizando item:',
        error
      );

      await showModalError(
        error.message
      );
    }


    return;
  }


  // ==========================================================
  // CREAR
  // ==========================================================

  const newItem = {

    referencia,

    descripcion,

    cantidad: Math.round(cantidad),

    precioUnitario
  };


  try {

    const savedItem =
      await apiCreateItem(newItem);


    items.push(savedItem);


    closeModal();

    render();

  } catch (error) {

    console.error(
      'Error creando item:',
      error
    );

    await showModalError(
      error.message
    );
  }
}


// ============================================================
// Dialog
// ============================================================

function showDialog({
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'confirm'
}) {

  return new Promise(resolve => {

    dialogResolver = resolve;

    dialogTriggerElement =
      document.activeElement &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;


    const overlay =
      document.getElementById('dialogOverlay');

    const titleEl =
      document.getElementById('dialogTitle');

    const messageEl =
      document.getElementById('dialogMessage');

    const cancelBtn =
      document.getElementById('dialogCancel');

    const confirmBtn =
      document.getElementById('dialogConfirm');


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


// ============================================================
// Cerrar dialog
// ============================================================

function closeDialog(result = false) {
  const overlay =
    document.getElementById('dialogOverlay');

  overlay.classList.add('hidden');


  if (dialogResolver) {

    const resolve = dialogResolver;

    dialogResolver = null;

    resolve(result);
  }


  window.setTimeout(() => {

    if (
      dialogTriggerElement &&
      document.contains(dialogTriggerElement)
    ) {
      dialogTriggerElement.focus();
    }

    dialogTriggerElement = null;

  }, 0);
}


// ============================================================
// Eliminar item
// ============================================================

async function deleteItem(id) {
  const item = items.find(
    i => Number(i.id) === Number(id)
  );

  if (!item) {
    return;
  }


  const ok = await showDialog({
    title: 'Confirmar eliminación',

    message:
      `¿Eliminar la referencia "${item.referencia}"? ` +
      'Esta acción no se puede deshacer.',

    confirmText: 'Eliminar',

    cancelText: 'Cancelar',

    type: 'confirm'
  });


  if (!ok) {
    return;
  }


  try {

    await apiDeleteItem(id);


    items = items.filter(
      i => Number(i.id) !== Number(id)
    );


    render();

  } catch (error) {

    console.error(
      'Error eliminando item:',
      error
    );

    await showModalError(
      error.message
    );
  }
}


// ============================================================
// Eventos
// ============================================================

function bindStaticEvents() {

  // Buscar
  document
    .getElementById('searchInput')
    .addEventListener('input', e => {

      searchTerm = e.target.value;

      render();
    });


  // Agregar
  document
    .getElementById('btnAdd')
    .addEventListener('click', () => {

      openModal();
    });


  // Eventos de la tabla
  document
    .getElementById('tableBody')
    .addEventListener('click', e => {

      const editBtn =
        e.target.closest('.btn-edit');

      const delBtn =
        e.target.closest('.btn-delete');

      const qtyCell =
        e.target.closest('.qty-cell');


      if (editBtn) {

        return openModal(
          Number(editBtn.dataset.id)
        );
      }


      if (delBtn) {

        return deleteItem(
          Number(delBtn.dataset.id)
        );
      }


      if (qtyCell) {

        return startQuantityEdit(
          Number(qtyCell.dataset.id)
        );
      }
    });


  // Cancelar modal
  document
    .getElementById('btnCancel')
    .addEventListener('click', closeModal);


  // Guardar modal
  document
    .getElementById('btnSave')
    .addEventListener('click', saveModal);


  // Click fuera del modal
  document
    .getElementById('modalOverlay')
    .addEventListener('click', e => {

      if (
        e.target.id === 'modalOverlay'
      ) {
        closeModal();
      }
    });


  // Click fuera del dialog
  document
    .getElementById('dialogOverlay')
    .addEventListener('click', e => {

      if (
        e.target.id === 'dialogOverlay'
      ) {
        closeDialog(false);
      }
    });


  // Cancelar dialog
  document
    .getElementById('dialogCancel')
    .addEventListener(
      'click',
      () => closeDialog(false)
    );


  // Confirmar dialog
  document
    .getElementById('dialogConfirm')
    .addEventListener(
      'click',
      () => closeDialog(true)
    );


  // ESC
  document.addEventListener(
    'keydown',
    e => {

      if (
        e.key === 'Escape' &&
        !document
          .getElementById('modalOverlay')
          .classList
          .contains('hidden')
      ) {
        closeModal();
      }


      if (
        e.key === 'Escape' &&
        !document
          .getElementById('dialogOverlay')
          .classList
          .contains('hidden')
      ) {
        closeDialog(false);
      }
    }
  );


  // Enter en campos del formulario
  [
    'fieldReferencia',
    'fieldDescripcion',
    'fieldCantidad',
    'fieldPrecio'
  ].forEach(id => {

    document
      .getElementById(id)
      .addEventListener('keydown', e => {

        if (e.key === 'Enter') {

          e.preventDefault();

          saveModal();
        }
      });
  });
}


// ============================================================
// Arrancar aplicación
// ============================================================

init();
