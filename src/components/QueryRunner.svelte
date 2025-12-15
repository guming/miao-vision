<script lang="ts">
  import MonacoEditor from './MonacoEditor.svelte'
  import { databaseStore } from '@/lib/stores/database.svelte'
  import type { QueryResult } from '@/types/database'

  interface Props {
    onQueryResult?: (result: QueryResult) => void
  }

  let { onQueryResult }: Props = $props()

  let sqlQuery = $state(`-- Example SQL Query
SELECT * FROM your_table LIMIT 10;`)

  let queryResult = $state<QueryResult | null>(null)
  let queryError = $state<string | null>(null)
  let isExecuting = $state(false)

  async function executeQuery() {
    if (!databaseStore.state.initialized) {
      queryError = 'Database not initialized'
      return
    }

    queryError = null
    queryResult = null
    isExecuting = true

    try {
      const result = await databaseStore.executeQuery(sqlQuery)
      queryResult = result
      console.log('Query executed successfully:', result)

      // Call callback if provided
      if (onQueryResult) {
        onQueryResult(result)
      }
    } catch (error) {
      queryError = error instanceof Error ? error.message : 'Query execution failed'
      console.error('Query error:', error)
    } finally {
      isExecuting = false
    }
  }

  function handleEditorChange(value: string) {
    sqlQuery = value
  }
</script>

<div class="query-runner">
  <div class="editor-section">
    <div class="section-header">
      <h3>SQL Query Editor</h3>
      <button
        class="run-button"
        onclick={executeQuery}
        disabled={isExecuting || !databaseStore.state.initialized}
      >
        {isExecuting ? 'Running...' : '▶ Run Query'}
      </button>
    </div>

    <MonacoEditor
      bind:value={sqlQuery}
      language="sql"
      height="200px"
      onChange={handleEditorChange}
    />
  </div>

  {#if queryError}
    <div class="error-message">
      <strong>Error:</strong> {queryError}
    </div>
  {/if}

  {#if queryResult}
    <div class="results-section">
      <div class="results-header">
        <h3>Query Results</h3>
        <span class="result-stats">
          {queryResult.rowCount} rows in {queryResult.executionTime.toFixed(2)}ms
        </span>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              {#each queryResult.columns as column}
                <th>{column}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each queryResult.data as row}
              <tr>
                {#each queryResult.columns as column}
                  <td>{row[column]}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .query-runner {
    width: 100%;
  }

  .editor-section {
    margin-bottom: 1.5rem;
    background: #1F2937;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid #374151;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #F3F4F6;
    font-weight: 600;
  }

  .run-button {
    padding: 0.625rem 1.5rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .run-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 100%);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  }

  .run-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    padding: 1rem 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #FCA5A5;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }

  .results-section {
    margin-top: 1.5rem;
    background: #1F2937;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid #374151;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .results-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #F3F4F6;
    font-weight: 600;
  }

  .result-stats {
    font-size: 0.8125rem;
    color: #9CA3AF;
    font-weight: 500;
    padding: 0.375rem 0.75rem;
    background: rgba(66, 133, 244, 0.1);
    border: 1px solid rgba(66, 133, 244, 0.2);
    border-radius: 9999px;
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid #374151;
    border-radius: 8px;
    max-height: 500px;
    overflow-y: auto;
    background: #111827;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #374151;
  }

  th {
    background: #1F2937;
    color: #F3F4F6;
    font-weight: 600;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  td {
    color: #E5E7EB;
  }

  tbody tr:hover {
    background: rgba(66, 133, 244, 0.05);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
</style>
