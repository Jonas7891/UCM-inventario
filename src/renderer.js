'use strict';

/*
 * ============================================================
 * UNIVERSAL DE CAMISAS PARA MOTORES
 * Frontend web
 *
 * El frontend se comunica con el backend mediante:
 *
 *   /api/items
 *
 * Nginx se encargará de enviar esas peticiones al backend.
 *
 * Por eso NO usamos:
 *
 *   http://localhost:3000
 *
 * Esto permite acceder desde:
 *
 *   http://localhost:8080
 *   http://192.168.x.x:8080
 *   http://IP-DE-LA-VM:8080
 * ============================================================
 */


// ============================================================
// CONFIGURACIÓN DE LA API
// ============================================================

const API_URL = '/api/items';


// ============================================================
// ESTADO DE LA APLICACIÓN
// ============================================================

let items = [];
let searchTerm = '';
let editingId = null;

let dialogResolver = null;
let dialogTriggerElement = null;


// ============================================================
// CONFIGURACIÓN DEL INVENTARIO
// ============================================================

// Stock bajo: menos de 6 unidades
const LOW_STOCK_THRESHOLD = 6;

// Porcentajes utilizados en el resumen
const MARGEN_PCT = 0.49;
const GANANCIA_PCT = 0.51;


// ============================================================
// FUNCIONES DE API
// ============================================================

/**
 * Obtener todos los items.
 */
async function apiGetItems() {

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {

    let errorMessage = `Error HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (data.error) {
        errorMessage = data.error;
      }

    } catch (_) {
      // La respuesta no era JSON.
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}


/**
 * Crear un item.
 */
async function apiCreateItem(item) {

  const response = await fetch(API_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },

    body: JSON.stringify(item)
  });


  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      `Error HTTP ${response.status}`
    );
  }


  return data;
}


/**
 * Actualizar un item.
 */
async function apiUpdateItem(id, item) {

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',

    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },

    body: JSON.stringify(item)
  });


  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      `Error HTTP ${response.status}`
    );
  }


  return data;
}


/**
 * Eliminar un item.
 */
async function apiDeleteItem(id) {

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',

    headers: {
      'Accept': 'application/json'
    }
  });


  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      `Error HTTP ${response.status}`
    );
  }


  return data;
}


// ============================================================
// CÁLCULO DE PRECIOS
// ============================================================

/*
 * Cadena:
 *
 * Precio unitario
 *      ↓
 * +19% IVA
 *      ↓
 * +49% precio público
 *      ↓
 * +10% precio con factura
 *
 * Se calcula sin redondear y solamente se redondea
 * el valor mostrado.
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
// FORMATO DE DINERO
// ============================================================

function formatCOP(n) {

  const rounded = Math.round(Number(n) || 0);

  return '$' + rounded.toLocaleString('es-CO');
}


// ============================================================
// SEGURIDAD HTML
// ============================================================

function escapeHtml(str) {

  const div = document.createElement('div');

  div.textContent =
    str == null
      ? ''
      : String(str);

  return div.innerHTML;
}


// ============================================================
// INICIALIZACIÓN
// ============================================================

async function init() {

  try {

    console.log('Conectando con backend...');

    items = await apiGetItems();

    console.log(
      `Backend conectado. ${items.length} items encontrados.`
    );

    render();

    bindStaticEvents();

  } catch (error) {

    console.error(
      'Error cargando inventario:',
      error
    );

    showConnectionError(error);
  }
}


// ============================================================
// ERROR DE CONEXIÓN
// ============================================================

function showConnectionError(error) {

  const tbody = document.getElementById('tableBody');

  const emptyState =
    document.getElementById('emptyState');


  if (tbody) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:40px;">
          <strong>No se pudo conectar con el servidor.</strong>
          <br><br>
          Verifica que Docker Compose esté funcionando.
          <br>
          <small>${escapeHtml(error.message)}</small>
        </td>
      </tr>
    `;
  }


  if (emptyState) {

    emptyState.classList.add('hidden');
  }
}


// ============================================================
// FILTRADO
// ============================================================

function filteredItems() {

  const term =
    searchTerm
      .trim()
      .toLowerCase();


  if (!term) {

    return items;
  }


  return items.filter(item => {

    const referencia =
      String(item.referencia || '')
        .toLowerCase();

    const descripcion =
      String(item.descripcion || '')
        .toLowerCase();


    return (
      referencia.includes(term) ||
      descripcion.includes(term)
    );
  });
}


// ============================================================
// RENDER PRINCIPAL
// ============================================================

function render() {

  const list = filteredItems();

  renderTable(list);

  renderSidebar();


  const resultCount =
    document.getElementById('resultCount');

  const shownCount =
    document.getElementById('shownCount');


  if (resultCount) {

    resultCount.textContent =
      `${list.length} resultado${
        list.length === 1 ? '' : 's'
      }`;
  }


  if (shownCount) {

    shownCount.textContent =
      `${list.length} referencia${
        list.length === 1 ? '' : 's'
      } mostrada${
        list.length === 1 ? '' : 's'
      }`;
  }
}


// ============================================================
// TABLA
// ============================================================

function renderTable(list) {

  const tbody =
    document.getElementById('tableBody');

  const emptyState =
    document.getElementById('emptyState');


  if (!tbody) return;


  tbody.innerHTML = '';


  if (list.length === 0) {

    if (emptyState) {
      emptyState.classList.remove('hidden');
    }

    return;
  }


  if (emptyState) {
    emptyState.classList.add('hidden');
  }


  list.forEach(item => {

    const cantidad =
      Number(item.cantidad) || 0;

    const precioUnitario =
      Number(item.precioUnitario) || 0;


    const {
      iva,
      publico,
      factura
    } = calcPrices(precioUnitario);


    const isLow =
      cantidad < LOW_STOCK_THRESHOLD;


    const tr =
      document.createElement('tr');


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
        ${formatCOP(precioUnitario)}
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
// PANEL LATERAL
// ============================================================

function renderSidebar() {

  const low =
    items.filter(item => {

      return (
        Number(item.cantidad) || 0
      ) < LOW_STOCK_THRESHOLD;

    });


  const lowStockBadge =
    document.getElementById('lowStockBadge');

  const lowList =
    document.getElementById('lowStockList');


  if (lowStockBadge) {

    lowStockBadge.textContent =
      low.length;
  }


  if (lowList) {

    lowList.innerHTML =
      low.map(item => {

        const cantidad =
          Number(item.cantidad) || 0;


        return `

          <div class="low-stock-item">

            <div>

              <div class="low-ref">
                ${escapeHtml(item.referencia)}
              </div>

              <div class="low-desc">
                ${escapeHtml(item.descripcion)}
              </div>

            </div>

            <div class="low-units">
              ${cantidad} uds
            </div>

          </div>

        `;

      }).join('') ||

      '<p class="empty-note">Sin referencias en stock bajo</p>';
  }


  // ----------------------------------------------------------
  // RESUMEN
  // ----------------------------------------------------------

  const totalRefs =
    items.length;


  const totalUnits =
    items.reduce(
      (sum, item) =>
        sum + (Number(item.cantidad) || 0),
      0
    );


  const totalValue =
    items.reduce(
      (sum, item) => {

        const cantidad =
          Number(item.cantidad) || 0;

        const precio =
          Number(item.precioUnitario) || 0;

        return sum + cantidad * precio;

      },
      0
    );


  const margen =
    totalValue * MARGEN_PCT;


  const ganancia =
    totalValue * GANANCIA_PCT;


  const sumRefs =
    document.getElementById('sumRefs');

  const sumUnits =
    document.getElementById('sumUnits');

  const sumValue =
    document.getElementById('sumValue');

  const sumLowStock =
    document.getElementById('sumLowStock');

  const sumMargin =
    document.getElementById('sumMargin');

  const sumProfit =
    document.getElementById('sumProfit');


  if (sumRefs) {
    sumRefs.textContent = totalRefs;
  }


  if (sumUnits) {
    sumUnits.textContent = totalUnits;
  }


  if (sumValue) {
    sumValue.textContent =
      formatCOP(totalValue);
  }


  if (sumLowStock) {
    sumLowStock.textContent =
      low.length;
  }


  if (sumMargin) {
    sumMargin.textContent =
      formatCOP(margen);
  }


  if (sumProfit) {
    sumProfit.textContent =
      formatCOP(ganancia);
  }
}


// ============================================================
// EDICIÓN RÁPIDA DE CANTIDAD
// ============================================================

function startQuantityEdit(id) {

  const item =
    items.find(i => i.id === id);


  if (!item) return;


  const cell =
    document.querySelector(
      `.qty-cell[data-id="${id}"]`
    );


  if (
    !cell ||
    cell.classList.contains('editing')
  ) {
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


  let committed = false;


  const commit = async () => {

    if (committed) return;

    committed = true;


    const num =
      Number(input.value);


    if (
      Number.isNaN(num) ||
      num < 0
    ) {

      render();

      return;
    }


    const cantidad =
      Math.round(num);


    try {

      const updated =
        await apiUpdateItem(
          item.id,
          {
            referencia: item.referencia,
            descripcion: item.descripcion,
            cantidad,
            precioUnitario:
              Number(item.precioUnitario) || 0
          }
        );


      Object.assign(
        item,
        updated
      );


      render();

    } catch (error) {

      console.error(
        'Error actualizando cantidad:',
        error
      );


      await showModalError(
        'No se pudo actualizar la cantidad.\n\n' +
        error.message
      );


      render();
    }
  };


  cell
    .querySelector('.qty-dec')
    .addEventListener(
      'click',
      event => {

        event.stopPropagation();

        input.value =
          Math.max(
            0,
            Number(input.value || 0) - 1
          );
      }
    );


  cell
    .querySelector('.qty-inc')
    .addEventListener(
      'click',
      event => {

        event.stopPropagation();

        input.value =
          Number(input.value || 0) + 1;
      }
    );


  input.addEventListener(
    'click',
    event => {
      event.stopPropagation();
    }
  );


  input.addEventListener(
    'keydown',
    event => {

      if (event.key === 'Enter') {

        event.preventDefault();

        commit();
      }


      if (event.key === 'Escape') {

        committed = true;

        render();
      }

    }
  );


  input.addEventListener(
    'blur',
    commit
  );
}


// ============================================================
// MODAL AGREGAR / EDITAR
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

  const modalError =
    document.getElementById('modalError');


  if (modalError) {
    modalError.classList.add('hidden');
  }


  if (id !== null) {

    const item =
      items.find(i => i.id === id);


    if (!item) return;


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
    .classList
    .remove('hidden');


  window.setTimeout(() => {

    refInput.focus();

    refInput.select();

  }, 0);
}


// ============================================================
// CERRAR MODAL
// ============================================================

function closeModal() {

  const overlay =
    document.getElementById('modalOverlay');


  if (overlay) {

    overlay
      .classList
      .add('hidden');
  }


  editingId = null;
}


// ============================================================
// ERROR DEL MODAL
// ============================================================

function showModalError(message) {

  return showDialog({

    title: 'Advertencia',

    message,

    confirmText: 'Aceptar',

    cancelText: 'Cancelar',

    type: 'info'

  });
}


// ============================================================
// GUARDAR FORMULARIO
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


  // ----------------------------------------------------------
  // VALIDACIONES
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // REFERENCIA DUPLICADA
  // ----------------------------------------------------------

  const duplicate =
    items.find(item => {

      return (
        String(item.referencia)
          .toLowerCase() ===
        referencia.toLowerCase() &&

        item.id !== editingId
      );

    });


  if (duplicate) {

    await showModalError(
      'Ya existe una referencia con ese nombre.'
    );

    return;
  }


  // ----------------------------------------------------------
  // CREAR / ACTUALIZAR
  // ----------------------------------------------------------

  try {

    if (editingId !== null) {

      const updated =
        await apiUpdateItem(
          editingId,
          {
            referencia,
            descripcion,
            cantidad,
            precioUnitario
          }
        );


      const index =
        items.findIndex(
          item => item.id === editingId
        );


      if (index !== -1) {

        items[index] =
          updated;
      }

    } else {

      const created =
        await apiCreateItem({
          referencia,
          descripcion,
          cantidad,
          precioUnitario
        });


      items.push(created);
    }


    closeModal();

    render();


  } catch (error) {

    console.error(
      'Error guardando referencia:',
      error
    );


    await showModalError(
      error.message
    );
  }
}


// ============================================================
// DIÁLOGOS
// ============================================================

function showDialog({
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'confirm'
}) {

  return new Promise(resolve => {

    dialogResolver =
      resolve;


    dialogTriggerElement =
      document.activeElement &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;


    const overlay =
      document.getElementById(
        'dialogOverlay'
      );


    const titleEl =
      document.getElementById(
        'dialogTitle'
      );


    const messageEl =
      document.getElementById(
        'dialogMessage'
      );


    const cancelBtn =
      document.getElementById(
        'dialogCancel'
      );


    const confirmBtn =
      document.getElementById(
        'dialogConfirm'
      );


    titleEl.textContent =
      title;


    messageEl.textContent =
      message;


    cancelBtn.textContent =
      cancelText;


    confirmBtn.textContent =
      confirmText;


    if (type === 'info') {

      cancelBtn.classList.add(
        'hidden'
      );

    } else {

      cancelBtn.classList.remove(
        'hidden'
      );
    }


    overlay
      .classList
      .remove('hidden');


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
// CERRAR DIÁLOGO
// ============================================================

function closeDialog(result = false) {

  const overlay =
    document.getElementById(
      'dialogOverlay'
    );


  overlay
    .classList
    .add('hidden');


  if (dialogResolver) {

    const resolve =
      dialogResolver;


    dialogResolver =
      null;


    resolve(result);
  }


  window.setTimeout(() => {

    if (
      dialogTriggerElement &&
      document.contains(
        dialogTriggerElement
      )
    ) {

      dialogTriggerElement.focus();
    }


    dialogTriggerElement =
      null;

  }, 0);
}


// ============================================================
// ELIMINAR ITEM
// ============================================================

async function deleteItem(id) {

  const item =
    items.find(
      i => i.id === id
    );


  if (!item) return;


  const ok =
    await showDialog({

      title:
        'Confirmar eliminación',

      message:
        `¿Eliminar la referencia "${item.referencia}"? Esta acción no se puede deshacer.`,

      confirmText:
        'Eliminar',

      cancelText:
        'Cancelar',

      type:
        'confirm'

    });


  if (!ok) return;


  try {

    await apiDeleteItem(id);


    items =
      items.filter(
        item => item.id !== id
      );


    render();


  } catch (error) {

    console.error(
      'Error eliminando referencia:',
      error
    );


    await showModalError(
      error.message
    );
  }
}


// ============================================================
// EVENTOS
// ============================================================

function bindStaticEvents() {

  // ----------------------------------------------------------
  // BUSCADOR
  // ----------------------------------------------------------

  document
    .getElementById('searchInput')
    .addEventListener(
      'input',
      event => {

        searchTerm =
          event.target.value;

        render();
      }
    );


  // ----------------------------------------------------------
  // AGREGAR
  // ----------------------------------------------------------

  document
    .getElementById('btnAdd')
    .addEventListener(
      'click',
      () => openModal()
    );


  // ----------------------------------------------------------
  // TABLA
  // ----------------------------------------------------------

  document
    .getElementById('tableBody')
    .addEventListener(
      'click',
      event => {

        const editBtn =
          event.target.closest(
            '.btn-edit'
          );


        const deleteBtn =
          event.target.closest(
            '.btn-delete'
          );


        const qtyCell =
          event.target.closest(
            '.qty-cell'
          );


        if (editBtn) {

          return openModal(
            Number(
              editBtn.dataset.id
            )
          );
        }


        if (deleteBtn) {

          return deleteItem(
            Number(
              deleteBtn.dataset.id
            )
          );
        }


        if (qtyCell) {

          return startQuantityEdit(
            Number(
              qtyCell.dataset.id
            )
          );
        }

      }
    );


  // ----------------------------------------------------------
  // MODAL
  // ----------------------------------------------------------

  document
    .getElementById('btnCancel')
    .addEventListener(
      'click',
      closeModal
    );


  document
    .getElementById('btnSave')
    .addEventListener(
      'click',
      saveModal
    );


  document
    .getElementById('modalOverlay')
    .addEventListener(
      'click',
      event => {

        if (
          event.target.id ===
          'modalOverlay'
        ) {

          closeModal();
        }
      }
    );


  // ----------------------------------------------------------
  // DIÁLOGO
  // ----------------------------------------------------------

  document
    .getElementById('dialogOverlay')
    .addEventListener(
      'click',
      event => {

        if (
          event.target.id ===
          'dialogOverlay'
        ) {

          closeDialog(false);
        }
      }
    );


  document
    .getElementById('dialogCancel')
    .addEventListener(
      'click',
      () => closeDialog(false)
    );


  document
    .getElementById('dialogConfirm')
    .addEventListener(
      'click',
      () => closeDialog(true)
    );


  // ----------------------------------------------------------
  // ESCAPE
  // ----------------------------------------------------------

  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape' &&
        !document
          .getElementById('modalOverlay')
          .classList
          .contains('hidden')
      ) {

        closeModal();
      }


      if (
        event.key === 'Escape' &&
        !document
          .getElementById('dialogOverlay')
          .classList
          .contains('hidden')
      ) {

        closeDialog(false);
      }

    }
  );


  // ----------------------------------------------------------
  // ENTER EN FORMULARIO
  // ----------------------------------------------------------

  [
    'fieldReferencia',
    'fieldDescripcion',
    'fieldCantidad',
    'fieldPrecio'
  ].forEach(id => {

    document
      .getElementById(id)
      .addEventListener(
        'keydown',
        event => {

          if (
            event.key === 'Enter'
          ) {

            event.preventDefault();

            saveModal();
          }
        }
      );

  });
}


// ============================================================
// INICIAR APLICACIÓN
// ============================================================

init();