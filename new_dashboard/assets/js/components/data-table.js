/* Tabla de datos sortable con sticky header — Raycy Dashboard */

import { Icon } from '../icons.js';

/**
 * Crea una tabla de datos.
 * @param {Object} opts
 * @param {Array<{key, label, align?, format?, width?}>} opts.columnas
 * @param {Array<Object>} opts.filas
 * @param {Function} [opts.onRowClick] - callback con (fila, index)
 * @param {string} [opts.emptyMsg]
 * @param {boolean} [opts.stickyHeader]
 */
export function crearDataTable({
  columnas,
  filas,
  onRowClick = null,
  emptyMsg = 'Sin datos para mostrar.',
  stickyHeader = true,
}) {
  const el = document.createElement('div');
  el.className = `data-table-wrap${stickyHeader ? ' data-table-wrap--sticky' : ''}`;

  let _filas = [...filas];
  let _sortKey = null;
  let _sortDir = 'asc';

  function render() {
    el.innerHTML = '';

    if (_filas.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'data-table__empty';
      empty.innerHTML = `
        ${Icon('info', { size: 24 })}
        <p>${emptyMsg}</p>`;
      el.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';

    // Head
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columnas.forEach(col => {
      const th = document.createElement('th');
      th.className = `data-table__th${col.align === 'right' ? ' text-right' : ''}`;
      if (col.width) th.style.width = col.width;

      const inner = document.createElement('button');
      inner.className = 'data-table__sort-btn';
      inner.textContent = col.label;

      if (_sortKey === col.key) {
        inner.innerHTML += ` ${Icon(_sortDir === 'asc' ? 'chevron-down' : 'chevron-right', { size: 12 })}`;
      }

      inner.addEventListener('click', () => {
        if (_sortKey === col.key) {
          _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _sortKey = col.key;
          _sortDir = 'asc';
        }
        _filas = _sortData(_filas, _sortKey, _sortDir);
        render();
      });

      th.appendChild(inner);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    _filas.forEach((fila, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'data-table__row';
      if (onRowClick) {
        tr.classList.add('data-table__row--clickable');
        tr.setAttribute('tabindex', '0');
        tr.setAttribute('role', 'button');
        tr.addEventListener('click', () => onRowClick(fila, idx));
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick(fila, idx);
          }
        });
      }

      columnas.forEach(col => {
        const td = document.createElement('td');
        td.className = `data-table__td${col.align === 'right' ? ' text-right tabular' : ''}`;
        const raw = fila[col.key];
        td.innerHTML = col.format ? col.format(raw, fila) : (raw ?? '—');
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    el.appendChild(table);
  }

  render();

  el.update = (nuevasFilas) => {
    _filas = [...nuevasFilas];
    if (_sortKey) _filas = _sortData(_filas, _sortKey, _sortDir);
    render();
  };

  return el;
}

function _sortData(filas, key, dir) {
  return [...filas].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return dir === 'asc' ? cmp : -cmp;
  });
}
