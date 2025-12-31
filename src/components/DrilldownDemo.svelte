<script lang="ts">
  /**
   * Drilldown Demo
   *
   * Demonstrates two drilldown modes:
   * 1. Modal - Click row to show detail modal
   * 2. SetInput - Click row to filter another table
   */
  import DataTable from '@plugins/data-display/datatable/DataTable.svelte'
  import type { DataTableData, DataTableConfig, ColumnConfig } from '@plugins/data-display/datatable/types'
  import { createInputStore } from '@app/stores/report-inputs.svelte'

  // Create a Svelte 5 reactive input store for this demo
  const inputStore = createInputStore()

  // Sample order data
  const ordersData = [
    { order_id: 1001, customer: 'Alice Chen', product: 'Laptop Pro', quantity: 1, total: 2499, status: 'Shipped', date: '2024-01-15' },
    { order_id: 1002, customer: 'Bob Smith', product: 'Wireless Mouse', quantity: 2, total: 79, status: 'Delivered', date: '2024-01-14' },
    { order_id: 1003, customer: 'Carol Davis', product: 'USB-C Hub', quantity: 3, total: 149, status: 'Processing', date: '2024-01-16' },
    { order_id: 1004, customer: 'David Lee', product: 'Mechanical Keyboard', quantity: 1, total: 199, status: 'Shipped', date: '2024-01-13' },
    { order_id: 1005, customer: 'Eva Martinez', product: 'Monitor 27"', quantity: 2, total: 898, status: 'Delivered', date: '2024-01-12' },
    { order_id: 1006, customer: 'Frank Wilson', product: 'Webcam HD', quantity: 1, total: 129, status: 'Processing', date: '2024-01-16' },
    { order_id: 1007, customer: 'Grace Kim', product: 'Laptop Stand', quantity: 2, total: 98, status: 'Shipped', date: '2024-01-15' },
    { order_id: 1008, customer: 'Henry Brown', product: 'Headphones Pro', quantity: 1, total: 349, status: 'Delivered', date: '2024-01-11' }
  ]

  // Sample customer data for setInput demo
  const customersData = [
    { customer: 'Alice Chen', email: 'alice@email.com', orders: 5, total_spent: 5234 },
    { customer: 'Bob Smith', email: 'bob@email.com', orders: 12, total_spent: 1890 },
    { customer: 'Carol Davis', email: 'carol@email.com', orders: 8, total_spent: 3421 },
    { customer: 'David Lee', email: 'david@email.com', orders: 3, total_spent: 899 },
    { customer: 'Eva Martinez', email: 'eva@email.com', orders: 15, total_spent: 7650 },
    { customer: 'Frank Wilson', email: 'frank@email.com', orders: 6, total_spent: 2100 },
    { customer: 'Grace Kim', email: 'grace@email.com', orders: 9, total_spent: 4200 },
    { customer: 'Henry Brown', email: 'henry@email.com', orders: 4, total_spent: 1560 }
  ]

  // Column configs
  const orderColumns: ColumnConfig[] = [
    { name: 'order_id', label: 'Order ID', width: 100 },
    { name: 'customer', label: 'Customer', width: 150 },
    { name: 'product', label: 'Product', width: 180 },
    { name: 'quantity', label: 'Qty', width: 60, align: 'right' },
    { name: 'total', label: 'Total', width: 100, format: 'currency', align: 'right' },
    { name: 'status', label: 'Status', width: 100 },
    { name: 'date', label: 'Date', width: 100 }
  ]

  const customerColumns: ColumnConfig[] = [
    { name: 'customer', label: 'Customer', width: 150 },
    { name: 'email', label: 'Email', width: 200 },
    { name: 'orders', label: 'Orders', width: 80, align: 'right' },
    { name: 'total_spent', label: 'Total Spent', width: 120, format: 'currency', align: 'right' }
  ]

  // Build DataTable data for Modal demo
  const modalTableConfig: DataTableConfig = {
    query: 'orders_modal',
    columns: orderColumns,
    sortable: true,
    searchable: true,
    drilldown: {
      enabled: true,
      action: 'modal',
      titleTemplate: 'Order #{order_id}',
      displayColumns: ['order_id', 'customer', 'product', 'quantity', 'total', 'status', 'date'],
      tooltip: 'Click to view order details',
      cursor: 'pointer',
      highlight: true
    }
  }

  const modalTableData: DataTableData = {
    config: modalTableConfig,
    columns: orderColumns,
    rows: ordersData,
    filteredRows: ordersData,
    sortState: null,
    searchQuery: ''
  }

  // Build DataTable data for SetInput demo
  const setInputTableConfig: DataTableConfig = {
    query: 'customers_setinput',
    columns: customerColumns,
    sortable: true,
    searchable: true,
    drilldown: {
      enabled: true,
      action: 'setInput',
      mappings: [
        { column: 'customer', inputName: 'selected_customer' }
      ],
      tooltip: 'Click to filter orders by customer',
      cursor: 'pointer',
      highlight: true
    }
  }

  const setInputTableData: DataTableData = {
    config: setInputTableConfig,
    columns: customerColumns,
    rows: customersData,
    filteredRows: customersData,
    sortState: null,
    searchQuery: ''
  }

  // Derived: Get selected customer from reactive input store
  let selectedCustomer = $derived(inputStore.state['selected_customer'] as string | null)

  // Derived: Filter orders by selected customer
  let filteredOrdersData = $derived(() => {
    if (!selectedCustomer) return ordersData
    return ordersData.filter(order => order.customer === selectedCustomer)
  })

  // Orders table for showing filtered results
  const filteredOrdersConfig: DataTableConfig = {
    query: 'filtered_orders',
    columns: orderColumns,
    sortable: true,
    searchable: false,
    drilldown: {
      enabled: true,
      action: 'modal',
      titleTemplate: 'Order #{order_id} - {customer}',
      tooltip: 'Click to view details'
    }
  }

  let filteredOrdersTableData = $derived<DataTableData>({
    config: filteredOrdersConfig,
    columns: orderColumns,
    rows: filteredOrdersData(),
    filteredRows: filteredOrdersData(),
    sortState: null,
    searchQuery: ''
  })

  // Clear selection
  function clearSelection() {
    inputStore.setValue('selected_customer', null)
  }
</script>

<div class="drilldown-demo">
  <header class="demo-header">
    <h1>Drilldown Demo</h1>
    <p class="demo-description">
      Demonstrates two drilldown modes for DataTable: Modal (view details) and SetInput (filter data).
    </p>
  </header>

  <div class="demo-sections">
    <!-- Section 1: Modal Drilldown -->
    <section class="demo-section">
      <div class="section-header">
        <h2>1. Modal Drilldown</h2>
        <span class="badge">action: modal</span>
      </div>
      <p class="section-description">
        Click any row to open a detail modal showing all order information.
      </p>
      <div class="table-container">
        <DataTable data={modalTableData} {inputStore} />
      </div>
      <div class="code-example">
        <pre><code>drilldown:
  enabled: true
  action: modal
  titleTemplate: "Order #&#123;order_id&#125;"
  displayColumns:
    - order_id
    - customer
    - product
    - total
    - status</code></pre>
      </div>
    </section>

    <!-- Section 2: SetInput Drilldown -->
    <section class="demo-section">
      <div class="section-header">
        <h2>2. SetInput Drilldown (Cross-Table Filtering)</h2>
        <span class="badge">action: setInput</span>
      </div>
      <p class="section-description">
        Click a customer row to filter the orders table below. This demonstrates cross-component communication.
      </p>

      {#if selectedCustomer}
        <div class="active-filter">
          <span class="filter-label">Filtering by:</span>
          <span class="filter-value">{selectedCustomer}</span>
          <button class="clear-btn" onclick={clearSelection}>Clear</button>
        </div>
      {/if}

      <div class="linked-tables">
        <div class="table-panel">
          <h3>Customers</h3>
          <DataTable data={setInputTableData} {inputStore} />
        </div>

        <div class="table-panel">
          <h3>
            Orders
            {#if selectedCustomer}
              <span class="filter-indicator">({filteredOrdersData().length} results)</span>
            {/if}
          </h3>
          <DataTable data={filteredOrdersTableData} {inputStore} />
        </div>
      </div>

      <div class="code-example">
        <pre><code>drilldown:
  enabled: true
  action: setInput
  mappings:
    - column: customer
      inputName: selected_customer</code></pre>
      </div>
    </section>
  </div>

  <div class="demo-info">
    <h3>How Drilldown Works:</h3>
    <ul>
      <li><strong>Modal Action:</strong> Opens a detail modal showing row data. Configure with <code>titleTemplate</code> and <code>displayColumns</code>.</li>
      <li><strong>SetInput Action:</strong> Sets input variables from row data. Other components can reactively filter based on these inputs.</li>
      <li><strong>Automatic Detection:</strong> If <code>action</code> is not specified, it defaults to <code>setInput</code> if mappings exist, otherwise <code>modal</code>.</li>
    </ul>
  </div>
</div>

<style>
  .drilldown-demo {
    padding: 2rem;
    background: var(--bg-primary, #111827);
    min-height: 100vh;
  }

  .demo-header {
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary, #F3F4F6);
  }

  .demo-description {
    margin: 0;
    color: var(--text-secondary, #9CA3AF);
    font-size: 0.9375rem;
  }

  .demo-sections {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .demo-section {
    background: var(--bg-card, #1F2937);
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #F3F4F6);
  }

  .badge {
    padding: 0.25rem 0.5rem;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    color: #93C5FD;
  }

  .section-description {
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #9CA3AF);
    font-size: 0.875rem;
  }

  .table-container {
    margin-bottom: 1rem;
    max-height: 350px;
    overflow: auto;
    border-radius: 0.5rem;
    border: 1px solid var(--border-color, #374151);
  }

  .active-filter {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 0.5rem;
  }

  .filter-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #9CA3AF);
  }

  .filter-value {
    font-weight: 600;
    color: #6EE7B7;
  }

  .clear-btn {
    margin-left: auto;
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 0.375rem;
    color: #FCA5A5;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.7);
  }

  .linked-tables {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .table-panel {
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .table-panel h3 {
    margin: 0;
    padding: 0.75rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary, #F3F4F6);
    border-bottom: 1px solid var(--border-color, #374151);
  }

  .filter-indicator {
    font-weight: 400;
    color: #6EE7B7;
    font-size: 0.8125rem;
  }

  .code-example {
    background: #0D1117;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .code-example pre {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
  }

  .code-example code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: #E6EDF3;
    line-height: 1.6;
  }

  .demo-info {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--bg-card, #1F2937);
    border: 1px solid var(--border-color, #374151);
    border-radius: 0.75rem;
  }

  .demo-info h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--text-primary, #F3F4F6);
  }

  .demo-info ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary, #9CA3AF);
  }

  .demo-info li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .demo-info code {
    padding: 0.125rem 0.375rem;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 0.25rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: #93C5FD;
  }

  @media (max-width: 1024px) {
    .linked-tables {
      grid-template-columns: 1fr;
    }
  }
</style>
