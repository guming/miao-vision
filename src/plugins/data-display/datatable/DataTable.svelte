<script lang="ts">
  import type { DataTableData, SortState, FilterState, ColumnFilter } from './types'
  import { processData, toggleSort, getSortIcon } from './operations'
  import { formatValue } from './formatter'
  import { downloadCSV, downloadExcel } from './export'

  interface Props {
    data: DataTableData
  }

  let { data }: Props = $props()

  // Local state
  let searchQuery = $state('')
  let sortState = $state<SortState | null>(null)
  let scrollTop = $state(0)
  let showColumnSelector = $state(false)
  let filterState = $state<FilterState>([])
  let activeFilterColumn = $state<string | null>(null)
  let selectedRows = $state<Set<number>>(new Set())

  // Column visibility state
  let columnVisibility = $state(
    data.columns.reduce((acc, col) => {
      acc[col.name] = col.visible !== false
      return acc
    }, {} as Record<string, boolean>)
  )

  // Export menu state
  let showExportMenu = $state(false)

  let visibleColumns = $derived(
    data.columns.filter(col => columnVisibility[col.name] !== false)
  )

  // Apply filters to data
  function applyFilters(rows: any[], filters: FilterState): any[] {
    if (filters.length === 0) return rows

    return rows.filter(row => {
      return filters.every(filter => {
        const value = row[filter.column]
        if (value === null || value === undefined) return false

        switch (filter.operator) {
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'not_contains':
            return !String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'equals':
            return String(value).toLowerCase() === String(filter.value).toLowerCase()
          case 'not_equals':
            return String(value).toLowerCase() !== String(filter.value).toLowerCase()
          case 'greater_than':
            return Number(value) > Number(filter.value)
          case 'less_than':
            return Number(value) < Number(filter.value)
          case 'between':
            return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2)
          case 'after':
            return new Date(value) > new Date(filter.value)
          case 'before':
            return new Date(value) < new Date(filter.value)
          case 'date_between':
            return new Date(value) >= new Date(filter.value) && new Date(value) <= new Date(filter.value2)
          default:
            return true
        }
      })
    })
  }

  let processedData = $derived(
    processData(
      applyFilters(data.rows, filterState),
      searchQuery,
      sortState,
      data.columns.map(c => c.name)
    )
  )

  // Calculate summary row
  function calculateSummary(rows: any[], column: typeof data.columns[0]): string {
    if (!column.summary || column.summary === 'none' || rows.length === 0) {
      return ''
    }

    const values = rows.map(row => row[column.name]).filter(v => v !== null && v !== undefined && v !== '')
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v))

    switch (column.summary) {
      case 'sum':
        return formatValue(numericValues.reduce((acc, v) => acc + v, 0), column.format || 'number')
      case 'avg':
        return formatValue(numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length, column.format || 'number')
      case 'count':
        return String(values.length)
      case 'min':
        return formatValue(Math.min(...numericValues), column.format || 'number')
      case 'max':
        return formatValue(Math.max(...numericValues), column.format || 'number')
      default:
        return ''
    }
  }

  let summaryRow = $derived.by(() => {
    if (!data.config.summaryRow) return null

    return visibleColumns.reduce((acc, col) => {
      acc[col.name] = calculateSummary(processedData, col)
      return acc
    }, {} as Record<string, string>)
  })

  // Virtual scrolling config
  const rowHeight = data.config.rowHeight || 36
  const maxHeight = data.config.maxHeight || 600
  const overscan = 5

  let visibleRange = $derived.by(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const viewportHeight = maxHeight - 40
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
    const end = Math.min(processedData.length, start + visibleCount)
    return { start, end }
  })

  let visibleRows = $derived(processedData.slice(visibleRange.start, visibleRange.end))
  let totalHeight = $derived(processedData.length * rowHeight)
  let offsetY = $derived(visibleRange.start * rowHeight)

  function handleSort(columnName: string) {
    if (!data.config.sortable) return
    sortState = toggleSort(sortState, columnName)
  }

  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement
    searchQuery = target.value
    scrollTop = 0
  }

  let scrollRAF: number | null = null
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    if (scrollRAF !== null) {
      cancelAnimationFrame(scrollRAF)
    }
    scrollRAF = requestAnimationFrame(() => {
      scrollTop = target.scrollTop
      scrollRAF = null
    })
  }

  function toggleColumnVisibility(columnName: string) {
    const visibleCount = Object.values(columnVisibility).filter(v => v).length
    if (visibleCount === 1 && columnVisibility[columnName]) {
      return
    }
    columnVisibility[columnName] = !columnVisibility[columnName]
  }

  function toggleColumnSelector() {
    showColumnSelector = !showColumnSelector
  }

  function toggleFilterDropdown(columnName: string) {
    if (activeFilterColumn === columnName) {
      activeFilterColumn = null
    } else {
      activeFilterColumn = columnName
    }
  }

  function addOrUpdateFilter(filter: ColumnFilter) {
    const existingIndex = filterState.findIndex(f => f.column === filter.column)
    if (existingIndex >= 0) {
      filterState[existingIndex] = filter
    } else {
      filterState = [...filterState, filter]
    }
    scrollTop = 0
  }

  function removeFilter(columnName: string) {
    filterState = filterState.filter(f => f.column !== columnName)
    scrollTop = 0
  }

  function clearAllFilters() {
    filterState = []
    scrollTop = 0
  }

  function getActiveFilter(columnName: string): ColumnFilter | undefined {
    return filterState.find(f => f.column === columnName)
  }

  function toggleRowSelection(rowIndex: number) {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    selectedRows = newSelected
  }

  function toggleSelectAll() {
    if (selectedRows.size === processedData.length) {
      selectedRows = new Set()
    } else {
      selectedRows = new Set(processedData.map((_, idx) => idx))
    }
  }

  function clearSelection() {
    selectedRows = new Set()
  }

  let allSelected = $derived(processedData.length > 0 && selectedRows.size === processedData.length)
  let someSelected = $derived(selectedRows.size > 0 && selectedRows.size < processedData.length)

  function handleExportCSV() {
    if (!data.config.exportable) return
    const filename = `${data.config.query}_${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(processedData, visibleColumns, filename)
    showExportMenu = false
  }

  function handleExportExcel() {
    if (!data.config.exportable) return
    const filename = `${data.config.query}_${new Date().toISOString().split('T')[0]}.xlsx`
    downloadExcel(processedData, visibleColumns, filename)
    showExportMenu = false
  }

  function toggleExportMenu() {
    showExportMenu = !showExportMenu
  }

  function getCellValue(row: any, column: typeof data.columns[0]): string {
    const value = row[column.name]
    return formatValue(value, column.format || 'text')
  }

  function getCellStyle(row: any, column: typeof data.columns[0]): string {
    if (!column.conditionalFormat || column.conditionalFormat.length === 0) {
      return ''
    }

    const value = Number(row[column.name])
    if (isNaN(value)) return ''

    for (const rule of column.conditionalFormat) {
      let matches = false

      switch (rule.condition) {
        case 'greater_than':
          matches = value > rule.value
          break
        case 'less_than':
          matches = value < rule.value
          break
        case 'equals':
          matches = value === rule.value
          break
        case 'between':
          matches = rule.value2 !== undefined && value >= rule.value && value <= rule.value2
          break
      }

      if (matches) {
        const styles: string[] = []
        if (rule.backgroundColor) styles.push(`background-color: ${rule.backgroundColor}`)
        if (rule.textColor) styles.push(`color: ${rule.textColor}`)
        if (rule.fontWeight) styles.push(`font-weight: ${rule.fontWeight}`)
        return styles.join('; ')
      }
    }

    return ''
  }

  function getDataBarWidth(row: any, column: typeof data.columns[0]): number {
    if (!column.showDataBar) return 0

    const value = Number(row[column.name])
    if (isNaN(value)) return 0

    const values = processedData
      .map(r => Number(r[column.name]))
      .filter(v => !isNaN(v))

    if (values.length === 0) return 0

    const min = Math.min(...values)
    const max = Math.max(...values)

    if (max === min) return 100

    return ((value - min) / (max - min)) * 100
  }

  // Color scale palettes
  const colorScalePalettes: Record<string, [string, string, string?]> = {
    'red-green': ['#EF4444', '#22C55E'],
    'green-red': ['#22C55E', '#EF4444'],
    'red-yellow-green': ['#EF4444', '#EAB308', '#22C55E'],
    'blue-white-red': ['#3B82F6', '#FFFFFF', '#EF4444'],
    'white-blue': ['#FFFFFF', '#3B82F6']
  }

  function interpolateColor(color1: string, color2: string, factor: number): string {
    const hex = (c: string) => parseInt(c, 16)
    const r1 = hex(color1.slice(1, 3)), g1 = hex(color1.slice(3, 5)), b1 = hex(color1.slice(5, 7))
    const r2 = hex(color2.slice(1, 3)), g2 = hex(color2.slice(3, 5)), b2 = hex(color2.slice(5, 7))
    const r = Math.round(r1 + (r2 - r1) * factor)
    const g = Math.round(g1 + (g2 - g1) * factor)
    const b = Math.round(b1 + (b2 - b1) * factor)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  function getColorScaleBackground(row: any, column: typeof data.columns[0]): string {
    if (!column.colorScale) return ''

    const value = Number(row[column.name])
    if (isNaN(value)) return ''

    const values = processedData
      .map(r => Number(r[column.name]))
      .filter(v => !isNaN(v))

    if (values.length === 0) return ''

    const min = column.colorScale.min ?? Math.min(...values)
    const max = column.colorScale.max ?? Math.max(...values)

    if (max === min) return ''

    const palette = colorScalePalettes[column.colorScale.type] || colorScalePalettes['red-green']
    const factor = Math.max(0, Math.min(1, (value - min) / (max - min)))

    if (palette.length === 3) {
      // Three-color gradient
      if (factor <= 0.5) {
        return interpolateColor(palette[0], palette[1], factor * 2)
      } else {
        return interpolateColor(palette[1], palette[2]!, (factor - 0.5) * 2)
      }
    } else {
      // Two-color gradient
      return interpolateColor(palette[0], palette[1], factor)
    }
  }

  // Icon sets
  const iconSets: Record<string, [string, string, string]> = {
    'arrows': ['↓', '→', '↑'],      // Down, Right, Up
    'trend': ['▼', '–', '▲'],       // Down triangle, dash, Up triangle
    'rating': ['★', '★★', '★★★'],   // Stars
    'flags': ['🔴', '🟡', '🟢'],    // Red, Yellow, Green
    'symbols': ['✕', '●', '✓']     // X, Circle, Check
  }

  const iconColors: Record<string, [string, string, string]> = {
    'arrows': ['#EF4444', '#9CA3AF', '#22C55E'],
    'trend': ['#EF4444', '#9CA3AF', '#22C55E'],
    'rating': ['#F59E0B', '#F59E0B', '#F59E0B'],
    'flags': ['#EF4444', '#EAB308', '#22C55E'],
    'symbols': ['#EF4444', '#9CA3AF', '#22C55E']
  }

  function getIconForValue(row: any, column: typeof data.columns[0]): { icon: string; color: string } | null {
    if (!column.iconSet) return null

    const value = Number(row[column.name])
    if (isNaN(value)) return null

    const values = processedData
      .map(r => Number(r[column.name]))
      .filter(v => !isNaN(v))

    if (values.length === 0) return null

    const sortedValues = [...values].sort((a, b) => a - b)
    const thresholds = column.iconSet.thresholds || [33, 67]
    const lowIdx = Math.floor(sortedValues.length * thresholds[0] / 100)
    const highIdx = Math.floor(sortedValues.length * thresholds[1] / 100)
    const lowThreshold = sortedValues[lowIdx] || sortedValues[0]
    const highThreshold = sortedValues[highIdx] || sortedValues[sortedValues.length - 1]

    const icons = iconSets[column.iconSet.type] || iconSets['arrows']
    const colors = iconColors[column.iconSet.type] || iconColors['arrows']

    if (value < lowThreshold) {
      return { icon: icons[0], color: colors[0] }
    } else if (value >= highThreshold) {
      return { icon: icons[2], color: colors[2] }
    } else {
      return { icon: icons[1], color: colors[1] }
    }
  }
</script>

<div class="datatable-container">
  <!-- Toolbar -->
  <div class="datatable-toolbar">
    {#if data.config.searchable}
      <div class="search-box">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          oninput={handleSearch}
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
    {/if}

    <div class="stats">
      {processedData.length} {processedData.length === 1 ? 'row' : 'rows'}
      {#if searchQuery || filterState.length > 0}
        <span class="filter-hint">(filtered from {data.rows.length})</span>
      {/if}
      {#if filterState.length > 0}
        <span class="filter-badge">{filterState.length} {filterState.length === 1 ? 'filter' : 'filters'}</span>
      {/if}
      {#if data.config.selectable && selectedRows.size > 0}
        <span class="selection-badge">{selectedRows.size} selected</span>
      {/if}
    </div>

    {#if data.config.filterable && filterState.length > 0}
      <button class="clear-filters-btn" onclick={clearAllFilters}>
        Clear Filters
      </button>
    {/if}

    {#if data.config.selectable && selectedRows.size > 0}
      <button class="clear-selection-btn" onclick={clearSelection}>
        Clear Selection
      </button>
    {/if}

    {#if data.config.exportable}
      <div class="export-wrapper">
        <button class="export-btn" onclick={toggleExportMenu}>
          📥 Export
        </button>
        {#if showExportMenu}
          <div class="export-dropdown">
            <button class="export-option" onclick={handleExportCSV}>
              📄 CSV
            </button>
            <button class="export-option" onclick={handleExportExcel}>
              📊 Excel
            </button>
          </div>
        {/if}
      </div>
    {/if}

    {#if data.config.columnSelector}
      <div class="column-selector-wrapper">
        <button class="column-selector-btn" onclick={toggleColumnSelector}>
          ⚙️ Columns
        </button>

        {#if showColumnSelector}
          <div class="column-selector-dropdown">
            <div class="dropdown-header">Show/Hide Columns</div>
            <div class="column-list">
              {#each data.columns as column}
                <label class="column-item">
                  <input
                    type="checkbox"
                    checked={columnVisibility[column.name]}
                    onchange={() => toggleColumnVisibility(column.name)}
                    disabled={Object.values(columnVisibility).filter(v => v).length === 1 && columnVisibility[column.name]}
                  />
                  <span>{column.label || column.name}</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Table wrapper with virtual scrolling -->
  <div class="table-scroll" style="max-height: {maxHeight}px;" onscroll={handleScroll}>
    <div class="table-wrapper">
      <table class="datatable">
        <thead>
          <tr>
            {#if data.config.selectable}
              <th class="header-cell select-cell" style="width: 50px;">
                <input
                  type="checkbox"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onchange={toggleSelectAll}
                  class="select-checkbox"
                />
              </th>
            {/if}

            {#each visibleColumns as column}
              <th
                class="header-cell"
                class:sortable={data.config.sortable}
                class:sorted={sortState?.column === column.name}
                class:filtered={getActiveFilter(column.name)}
                style:text-align={column.align || 'left'}
                style:width={column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : 'auto'}
              >
                <div class="header-content">
                  <span
                    class="header-label"
                    class:clickable={data.config.sortable}
                    onclick={() => handleSort(column.name)}
                  >
                    {column.label || column.name}
                  </span>
                  <div class="header-icons">
                    {#if data.config.sortable}
                      <span class="sort-icon" onclick={() => handleSort(column.name)}>{getSortIcon(column.name, sortState)}</span>
                    {/if}
                    {#if data.config.filterable}
                      <span
                        class="filter-icon"
                        class:active={getActiveFilter(column.name)}
                        onclick={() => toggleFilterDropdown(column.name)}
                      >
                        🔽
                      </span>
                    {/if}
                  </div>
                </div>

                {#if data.config.filterable && activeFilterColumn === column.name}
                  <div class="filter-dropdown" onclick={(e) => e.stopPropagation()}>
                    {#if column.format === 'number' || column.format === 'currency' || column.format === 'percent'}
                      <div class="filter-content">
                        <div class="filter-header">Filter: {column.label || column.name}</div>
                        <select class="filter-operator" value={getActiveFilter(column.name)?.operator || 'greater_than'}>
                          <option value="greater_than">Greater than</option>
                          <option value="less_than">Less than</option>
                          <option value="between">Between</option>
                          <option value="equals">Equals</option>
                        </select>
                        <input
                          type="number"
                          class="filter-input"
                          placeholder="Value"
                          value={getActiveFilter(column.name)?.value || ''}
                          oninput={(e) => {
                            const val = (e.target as HTMLInputElement).value
                            if (val) {
                              const operator = getActiveFilter(column.name)?.operator || 'greater_than'
                              addOrUpdateFilter({ column: column.name, operator, value: val })
                            }
                          }}
                        />
                        <div class="filter-actions">
                          <button class="filter-apply-btn" onclick={() => activeFilterColumn = null}>Apply</button>
                          <button class="filter-clear-btn" onclick={() => { removeFilter(column.name); activeFilterColumn = null }}>Clear</button>
                        </div>
                      </div>
                    {:else if column.format === 'date'}
                      <div class="filter-content">
                        <div class="filter-header">Filter: {column.label || column.name}</div>
                        <select class="filter-operator" value={getActiveFilter(column.name)?.operator || 'after'}>
                          <option value="after">After</option>
                          <option value="before">Before</option>
                          <option value="date_between">Between</option>
                          <option value="equals">On date</option>
                        </select>
                        <input
                          type="date"
                          class="filter-input"
                          placeholder="Date"
                          value={getActiveFilter(column.name)?.value || ''}
                          oninput={(e) => {
                            const val = (e.target as HTMLInputElement).value
                            if (val) {
                              const operator = getActiveFilter(column.name)?.operator || 'after'
                              addOrUpdateFilter({ column: column.name, operator, value: val })
                            }
                          }}
                        />
                        <div class="filter-actions">
                          <button class="filter-apply-btn" onclick={() => activeFilterColumn = null}>Apply</button>
                          <button class="filter-clear-btn" onclick={() => { removeFilter(column.name); activeFilterColumn = null }}>Clear</button>
                        </div>
                      </div>
                    {:else}
                      <div class="filter-content">
                        <div class="filter-header">Filter: {column.label || column.name}</div>
                        <select class="filter-operator" value={getActiveFilter(column.name)?.operator || 'contains'}>
                          <option value="contains">Contains</option>
                          <option value="not_contains">Does not contain</option>
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not equals</option>
                        </select>
                        <input
                          type="text"
                          class="filter-input"
                          placeholder="Search text..."
                          value={getActiveFilter(column.name)?.value || ''}
                          oninput={(e) => {
                            const val = (e.target as HTMLInputElement).value
                            if (val) {
                              const operator = getActiveFilter(column.name)?.operator || 'contains'
                              addOrUpdateFilter({ column: column.name, operator, value: val })
                            }
                          }}
                        />
                        <div class="filter-actions">
                          <button class="filter-apply-btn" onclick={() => activeFilterColumn = null}>Apply</button>
                          <button class="filter-clear-btn" onclick={() => { removeFilter(column.name); activeFilterColumn = null }}>Clear</button>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>

        <tbody>
          <tr style="height: {totalHeight}px;">
            <td colspan={visibleColumns.length}></td>
          </tr>

          <tr style="position: absolute; top: 0; left: 0; right: 0; transform: translateY({offsetY}px);">
            <td colspan={visibleColumns.length} style="padding: 0;">
              <table style="width: 100%; table-layout: fixed;">
                <colgroup>
                  {#if data.config.selectable}
                    <col style="width: 50px" />
                  {/if}
                  {#each visibleColumns as column}
                    <col style:width={column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : 'auto'} />
                  {/each}
                </colgroup>
                <tbody>
                  {#each visibleRows as row, idx}
                    {@const actualIndex = visibleRange.start + idx}
                    <tr
                      class="data-row"
                      class:selected={selectedRows.has(actualIndex)}
                      style="height: {rowHeight}px;"
                    >
                      {#if data.config.selectable}
                        <td class="data-cell select-cell">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(actualIndex)}
                            onchange={() => toggleRowSelection(actualIndex)}
                            class="select-checkbox"
                          />
                        </td>
                      {/if}
                      {#each visibleColumns as column}
                        {@const colorScaleBg = getColorScaleBackground(row, column)}
                        {@const iconInfo = getIconForValue(row, column)}
                        {@const cellStyle = [
                          getCellStyle(row, column),
                          colorScaleBg ? `background-color: ${colorScaleBg}` : ''
                        ].filter(Boolean).join('; ')}
                        <td
                          class="data-cell"
                          class:has-data-bar={column.showDataBar}
                          class:has-color-scale={!!colorScaleBg}
                          style:text-align={column.align || 'left'}
                          style={cellStyle}
                        >
                          {#if column.showDataBar}
                            <div class="cell-with-bar">
                              <div class="data-bar" style="width: {getDataBarWidth(row, column)}%"></div>
                              <span class="cell-value">{getCellValue(row, column)}</span>
                            </div>
                          {:else if iconInfo}
                            <span class="cell-with-icon">
                              <span class="cell-icon" style="color: {iconInfo.color}">{iconInfo.icon}</span>
                              {#if column.iconSet?.showValue !== false}
                                <span class="cell-value">{getCellValue(row, column)}</span>
                              {/if}
                            </span>
                          {:else}
                            {getCellValue(row, column)}
                          {/if}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>

        {#if data.config.summaryRow && summaryRow}
          <tfoot>
            <tr class="summary-row">
              {#if data.config.selectable}
                <td class="summary-cell select-cell" style="width: 50px;"></td>
              {/if}
              {#each visibleColumns as column}
                <td
                  class="summary-cell"
                  style:text-align={column.align || 'left'}
                  style:width={column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : 'auto'}
                >
                  {#if summaryRow[column.name]}
                    <span class="summary-value">{summaryRow[column.name]}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          </tfoot>
        {/if}
      </table>

      {#if processedData.length === 0}
        <div class="empty-state">
          {#if searchQuery}
            <p>No results found for "{searchQuery}"</p>
          {:else}
            <p>No data available</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .datatable-container {
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 8px;
    margin: 2rem 0;
    overflow: hidden;
  }

  .datatable-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #4B5563;
    background: #111827;
  }

  .search-box {
    position: relative;
    flex: 1;
    max-width: 300px;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.875rem;
    background: #1F2937;
    color: #F3F4F6;
  }

  .search-input::placeholder {
    color: #9CA3AF;
  }

  .search-input:focus {
    outline: none;
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
    pointer-events: none;
  }

  .stats {
    flex: 1;
    font-size: 0.875rem;
    color: #D1D5DB;
  }

  .filter-hint {
    opacity: 0.7;
    margin-left: 0.25rem;
  }

  .filter-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    margin-left: 0.5rem;
    background: #3B82F6;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .selection-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    margin-left: 0.5rem;
    background: #10B981;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .clear-filters-btn,
  .clear-selection-btn {
    padding: 0.5rem 1rem;
    background: #6B7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .clear-filters-btn:hover,
  .clear-selection-btn:hover {
    background: #4B5563;
  }

  .export-wrapper {
    position: relative;
  }

  .export-btn {
    padding: 0.5rem 1rem;
    background: #3B82F6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .export-btn:hover {
    background: #2563EB;
  }

  .export-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    z-index: 20;
    min-width: 120px;
    overflow: hidden;
  }

  .export-option {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    text-align: left;
    background: transparent;
    border: none;
    color: #F3F4F6;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .export-option:hover {
    background: #374151;
  }

  .export-option:first-child {
    border-bottom: 1px solid #4B5563;
  }

  .column-selector-wrapper {
    position: relative;
  }

  .column-selector-btn {
    padding: 0.5rem 1rem;
    background: #6B7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .column-selector-btn:hover {
    background: #4B5563;
  }

  .column-selector-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.5rem;
    background: #1F2937;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 200px;
  }

  .dropdown-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #E5E7EB;
    font-weight: 600;
    font-size: 0.875rem;
    color: #F3F4F6;
  }

  .column-list {
    padding: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .column-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
    font-size: 0.875rem;
  }

  .column-item:hover {
    background: #374151;
  }

  .table-scroll {
    overflow: auto;
    position: relative;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    transform: translate3d(0, 0, 0);
    will-change: scroll-position;
  }

  .table-wrapper {
    position: relative;
    width: 100%;
  }

  .datatable {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    table-layout: fixed;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #374151;
  }

  .header-cell {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #F3F4F6;
    border-bottom: 2px solid #E5E7EB;
    white-space: nowrap;
    background: #374151;
  }

  .header-cell.sortable {
    cursor: pointer;
    user-select: none;
  }

  .header-cell.sortable:hover {
    background: #4B5563;
  }

  .header-cell.sorted {
    background: #4B5563;
    color: #60A5FA;
  }

  .header-cell.filtered {
    background: #FEF3C7;
    color: #92400E;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
    position: relative;
  }

  .header-label {
    flex: 1;
  }

  .header-label.clickable {
    cursor: pointer;
    user-select: none;
  }

  .header-icons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .sort-icon {
    opacity: 0.5;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .header-cell.sorted .sort-icon {
    opacity: 1;
  }

  .filter-icon {
    opacity: 0.4;
    font-size: 0.625rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .filter-icon:hover {
    opacity: 0.8;
  }

  .filter-icon.active {
    opacity: 1;
    color: #F59E0B;
  }

  .filter-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    background: #1F2937;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 20;
    min-width: 250px;
  }

  .filter-content {
    padding: 1rem;
  }

  .filter-header {
    font-weight: 600;
    font-size: 0.875rem;
    color: #F3F4F6;
    margin-bottom: 0.75rem;
  }

  .filter-operator {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    background: #111827;
    color: #F3F4F6;
  }

  .filter-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    background: #111827;
    color: #F3F4F6;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }

  .filter-apply-btn {
    flex: 1;
    padding: 0.5rem;
    background: #3B82F6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .filter-apply-btn:hover {
    background: #2563EB;
  }

  .filter-clear-btn {
    flex: 1;
    padding: 0.5rem;
    background: #6B7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .filter-clear-btn:hover {
    background: #4B5563;
  }

  tbody {
    background: #1F2937;
    position: relative;
  }

  .data-row {
    border-bottom: 1px solid #374151;
    transition: background 0.2s;
  }

  .data-row:hover {
    background: #374151;
  }

  .data-row.selected {
    background: #1E3A5F;
  }

  .data-row.selected:hover {
    background: #2E4A6F;
  }

  .data-cell {
    padding: 0.75rem 1rem;
    color: #F3F4F6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-cell {
    text-align: center;
    padding: 0.5rem;
  }

  .select-checkbox {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  .data-cell.has-data-bar {
    padding: 0;
  }

  .cell-with-bar {
    position: relative;
    padding: 0.75rem 1rem;
    overflow: visible;
  }

  .data-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%);
    opacity: 0.2;
    z-index: 0;
    transition: width 0.3s ease;
  }

  .cell-value {
    position: relative;
    z-index: 1;
  }

  /* Color scale cells */
  .data-cell.has-color-scale {
    transition: background-color 0.2s ease;
  }

  /* Icon set cells */
  .cell-with-icon {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cell-icon {
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  tfoot {
    position: sticky;
    bottom: 0;
    z-index: 10;
    background: #374151;
    border-top: 2px solid #4B5563;
  }

  .summary-row {
    background: #374151;
  }

  .summary-cell {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #F3F4F6;
    border-top: 2px solid #4B5563;
  }

  .summary-value {
    font-weight: 700;
    color: #F3F4F6;
  }

  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: #D1D5DB;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  @media (max-width: 640px) {
    .datatable-toolbar {
      flex-wrap: wrap;
    }

    .search-box {
      max-width: 100%;
      order: -1;
      flex-basis: 100%;
    }

    .datatable {
      font-size: 0.75rem;
    }

    .header-cell,
    .data-cell {
      padding: 0.5rem 0.75rem;
    }
  }
</style>
