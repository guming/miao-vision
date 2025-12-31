/**
 * Interactive Runtime for Exported Reports
 *
 * A lightweight JavaScript runtime that provides interactivity
 * for exported HTML reports without requiring the full application.
 *
 * Features:
 * - Table sorting and filtering
 * - Drilldown modals
 * - Input controls (dropdown, button group)
 * - Cross-component filtering via inputs
 *
 * @module core/export/interactive-runtime
 */

/**
 * Generate the interactive runtime script
 * This is embedded into exported HTML files
 */
export function generateInteractiveRuntime(): string {
  return `
(function() {
  'use strict';

  // ============================================
  // State Management
  // ============================================
  const state = {
    inputs: {},
    data: {},
    listeners: []
  };

  window.MiaoVision = {
    state,
    setInput,
    getInput,
    registerData,
    getData,
    subscribe,
    showModal,
    hideModal,
    filterTable,
    sortTable
  };

  function setInput(name, value) {
    const oldValue = state.inputs[name];
    state.inputs[name] = value;
    if (oldValue !== value) {
      notifyListeners({ type: 'input', name, value, oldValue });
      updateDependentComponents(name);
    }
  }

  function getInput(name) {
    return state.inputs[name];
  }

  function registerData(name, data) {
    state.data[name] = data;
  }

  function getData(name) {
    return state.data[name] || [];
  }

  function subscribe(callback) {
    state.listeners.push(callback);
    return () => {
      state.listeners = state.listeners.filter(l => l !== callback);
    };
  }

  function notifyListeners(event) {
    state.listeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error('Listener error:', e); }
    });
  }

  // ============================================
  // Modal System
  // ============================================
  let modalContainer = null;

  function createModalContainer() {
    if (modalContainer) return;
    modalContainer = document.createElement('div');
    modalContainer.id = 'miao-modal-container';
    modalContainer.innerHTML = \`
      <div class="miao-modal-backdrop" onclick="MiaoVision.hideModal()">
        <div class="miao-modal" onclick="event.stopPropagation()">
          <header class="miao-modal-header">
            <h2 class="miao-modal-title"></h2>
            <button class="miao-modal-close" onclick="MiaoVision.hideModal()">&times;</button>
          </header>
          <div class="miao-modal-body"></div>
          <footer class="miao-modal-footer">
            <button class="miao-btn" onclick="MiaoVision.hideModal()">Close</button>
          </footer>
        </div>
      </div>
    \`;
    document.body.appendChild(modalContainer);

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });
  }

  function showModal(title, rowData, options = {}) {
    createModalContainer();
    const backdrop = modalContainer.querySelector('.miao-modal-backdrop');
    const titleEl = modalContainer.querySelector('.miao-modal-title');
    const bodyEl = modalContainer.querySelector('.miao-modal-body');

    titleEl.textContent = title;

    // Build content
    const columns = options.displayColumns || Object.keys(rowData);
    let html = '<dl class="miao-details">';
    columns.forEach(col => {
      const value = rowData[col];
      const label = col.replace(/_/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase());
      html += \`
        <div class="miao-detail-item">
          <dt>\${label}</dt>
          <dd>\${formatValue(value)}</dd>
        </div>
      \`;
    });
    html += '</dl>';
    bodyEl.innerHTML = html;

    backdrop.classList.add('visible');
  }

  function hideModal() {
    if (modalContainer) {
      modalContainer.querySelector('.miao-modal-backdrop').classList.remove('visible');
    }
  }

  function formatValue(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  // ============================================
  // Table Interactivity
  // ============================================
  function filterTable(tableId, column, value) {
    const table = document.querySelector(\`[data-table-id="\${tableId}"]\`);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const colIndex = getColumnIndex(table, column);

    rows.forEach(row => {
      const cell = row.cells[colIndex];
      if (!cell) return;
      const cellValue = cell.textContent.trim().toLowerCase();
      const filterValue = String(value).toLowerCase();
      row.style.display = (value === '' || cellValue.includes(filterValue)) ? '' : 'none';
    });
  }

  function sortTable(tableId, column, direction = 'asc') {
    const table = document.querySelector(\`[data-table-id="\${tableId}"]\`);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const colIndex = getColumnIndex(table, column);

    rows.sort((a, b) => {
      const aVal = getCellValue(a.cells[colIndex]);
      const bVal = getCellValue(b.cells[colIndex]);
      const cmp = aVal < bVal ? -1 : (aVal > bVal ? 1 : 0);
      return direction === 'asc' ? cmp : -cmp;
    });

    rows.forEach(row => tbody.appendChild(row));

    // Update sort indicators
    table.querySelectorAll('th').forEach((th, i) => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (i === colIndex) {
        th.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  function getColumnIndex(table, column) {
    const headers = table.querySelectorAll('th');
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].dataset.column === column || headers[i].textContent.trim() === column) {
        return i;
      }
    }
    return 0;
  }

  function getCellValue(cell) {
    if (!cell) return '';
    const val = cell.dataset.value || cell.textContent.trim();
    const num = parseFloat(val.replace(/[,$%]/g, ''));
    return isNaN(num) ? val.toLowerCase() : num;
  }

  // ============================================
  // Input Controls
  // ============================================
  function updateDependentComponents(inputName) {
    // Find tables that filter by this input
    document.querySelectorAll(\`[data-filter-input="\${inputName}"]\`).forEach(el => {
      const tableId = el.dataset.tableId;
      const column = el.dataset.filterColumn;
      const value = state.inputs[inputName];
      filterTable(tableId, column, value || '');
    });

    // Update display elements
    document.querySelectorAll(\`[data-bind="\${inputName}"]\`).forEach(el => {
      el.textContent = state.inputs[inputName] || '';
    });
  }

  // ============================================
  // Initialize on DOM ready
  // ============================================
  function init() {
    // Initialize dropdown controls
    document.querySelectorAll('[data-miao-dropdown]').forEach(select => {
      const inputName = select.dataset.miaoDropdown;
      const defaultValue = select.dataset.defaultValue;
      if (defaultValue) setInput(inputName, defaultValue);

      select.addEventListener('change', (e) => {
        setInput(inputName, e.target.value);
      });
    });

    // Initialize button group controls
    document.querySelectorAll('[data-miao-buttongroup]').forEach(container => {
      const inputName = container.dataset.miaoButtongroup;
      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          setInput(inputName, btn.dataset.value);
        });
      });
    });

    // Initialize sortable tables
    document.querySelectorAll('[data-miao-sortable] th[data-column]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const table = th.closest('table');
        const tableId = table.dataset.tableId;
        const column = th.dataset.column;
        const currentDir = th.classList.contains('sort-asc') ? 'desc' : 'asc';
        sortTable(tableId, column, currentDir);
      });
    });

    // Initialize drilldown rows
    document.querySelectorAll('[data-miao-drilldown]').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        const data = JSON.parse(row.dataset.rowData || '{}');
        const title = row.dataset.drilldownTitle || 'Details';
        const columns = row.dataset.drilldownColumns ? row.dataset.drilldownColumns.split(',') : null;
        showModal(title, data, { displayColumns: columns });
      });
    });

    console.log('🎯 MiaoVision Interactive Runtime initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

/**
 * Generate CSS styles for the interactive runtime
 */
export function generateInteractiveStyles(): string {
  return `
/* MiaoVision Interactive Runtime Styles */

/* Modal */
.miao-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.miao-modal-backdrop.visible {
  display: flex;
}

.miao-modal {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #1F2937;
  border: 1px solid #374151;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.miao-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #374151;
}

.miao-modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #F3F4F6;
}

.miao-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9CA3AF;
  font-size: 1.5rem;
  cursor: pointer;
}

.miao-modal-close:hover {
  background: rgba(255,255,255,0.1);
  color: #F3F4F6;
}

.miao-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.miao-modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.25rem;
  border-top: 1px solid #374151;
}

.miao-details {
  margin: 0;
  padding: 0;
}

.miao-detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #374151;
}

.miao-detail-item:last-child {
  border-bottom: none;
}

.miao-detail-item dt {
  font-size: 0.75rem;
  font-weight: 500;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.miao-detail-item dd {
  margin: 0;
  font-size: 0.9375rem;
  color: #F3F4F6;
  font-family: 'JetBrains Mono', monospace;
}

/* Buttons */
.miao-btn {
  padding: 0.5rem 1rem;
  background: #374151;
  border: 1px solid #4B5563;
  border-radius: 6px;
  color: #E5E7EB;
  font-size: 0.875rem;
  cursor: pointer;
}

.miao-btn:hover {
  background: #4B5563;
}

/* Sortable Tables */
[data-miao-sortable] th {
  position: relative;
  user-select: none;
}

[data-miao-sortable] th::after {
  content: '';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  opacity: 0.3;
}

[data-miao-sortable] th.sort-asc::after {
  border-bottom-color: currentColor;
  opacity: 1;
}

[data-miao-sortable] th.sort-desc::after {
  border-top-color: currentColor;
  opacity: 1;
}

/* Drilldown Rows */
[data-miao-drilldown] {
  cursor: pointer;
  transition: background 0.15s;
}

[data-miao-drilldown]:hover {
  background: rgba(59, 130, 246, 0.1) !important;
}

/* Input Controls */
.miao-dropdown {
  padding: 0.5rem 0.75rem;
  background: #1F2937;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #F3F4F6;
  font-size: 0.875rem;
}

.miao-buttongroup {
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #374151;
}

.miao-buttongroup button {
  padding: 0.5rem 1rem;
  background: #1F2937;
  border: none;
  border-right: 1px solid #374151;
  color: #9CA3AF;
  font-size: 0.875rem;
  cursor: pointer;
}

.miao-buttongroup button:last-child {
  border-right: none;
}

.miao-buttongroup button:hover {
  background: #374151;
}

.miao-buttongroup button.active {
  background: #3B82F6;
  color: white;
}
`;
}

/**
 * Wrap table rows with drilldown data attributes
 */
export function wrapTableRowsForDrilldown(
  rows: Record<string, unknown>[],
  config: {
    titleTemplate?: string;
    displayColumns?: string[];
  }
): string {
  return rows.map((row, index) => {
    const title = config.titleTemplate
      ? config.titleTemplate.replace(/\{(\w+)\}/g, (_, key) => String(row[key] ?? ''))
      : `Row ${index + 1}`;

    const columnsAttr = config.displayColumns
      ? `data-drilldown-columns="${config.displayColumns.join(',')}"`
      : '';

    return `data-miao-drilldown data-row-data='${JSON.stringify(row)}' data-drilldown-title="${title}" ${columnsAttr}`;
  }).join('\n');
}
