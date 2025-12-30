/**
 * Hybrid GNode Implementation
 *
 * Combines DuckDB's storage efficiency with Perspective-style dependency graph
 *
 * Architecture:
 * - Dependency Graph: TypeScript (lightweight, flexible)
 * - Storage & Compute: DuckDB (powerful, efficient)
 * - Incremental State: In-memory cache (fast access)
 */

import { duckDBManager } from '@core/database'
import type {
  SchemaDefinition,
  ViewConfig,
  GNodeDescriptor,
  Delta,
  DeltaOperation,
  UpdateCallback,
  IncrementalState,
  AggregateValue
} from './types'
import { HybridView } from './view'

export class HybridGNode {
  private nodes = new Map<string, GNodeDescriptor>()
  private currentVersion = 0
  private refreshTimer?: ReturnType<typeof setTimeout>
  private updateCallbacks = new Map<string, Set<UpdateCallback>>()

  constructor() {
    console.log('🚀 Hybrid GNode initialized')
  }

  /**
   * Create a new table (data source)
   */
  async createTable(
    id: string,
    schema: SchemaDefinition
  ): Promise<void> {
    if (this.nodes.has(id)) {
      throw new Error(`Node "${id}" already exists`)
    }

    const db = await duckDBManager.getDB()
    const conn = await db.connect()

    const columns = Object.entries(schema)
      .map(([col, type]) => `"${col}" ${type}`)
      .join(', ')

    try {
      // Main table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS "${id}" (
          _row_id BIGINT,
          _version BIGINT,
          _timestamp TIMESTAMP,
          ${columns}
        )
      `)

      // Delta table for incremental updates
      await conn.query(`
        CREATE TABLE IF NOT EXISTS "${id}_delta" (
          _row_id BIGINT,
          _version BIGINT,
          _timestamp TIMESTAMP,
          _op VARCHAR,
          ${columns}
        )
      `)

      // Create indexes
      await conn.query(`
        CREATE INDEX IF NOT EXISTS "idx_${id}_version"
        ON "${id}"(_version)
      `)

      // Register in dependency graph
      this.nodes.set(id, {
        id,
        type: 'table',
        dependencies: new Set(),
        dependents: new Set(),
        dirty: false,
        dirtyRows: new Set(),
        duckdbTable: id
      })

      console.log(`✅ Table "${id}" created`)
    } catch (error) {
      console.error(`Failed to create table "${id}":`, error)
      throw error
    }
  }

  /**
   * Create a view with Perspective-style configuration
   */
  async createView(
    id: string,
    config: ViewConfig
  ): Promise<HybridView> {
    if (this.nodes.has(id)) {
      throw new Error(`Node "${id}" already exists`)
    }

    if (!this.nodes.has(config.source)) {
      throw new Error(`Source "${config.source}" does not exist`)
    }

    const db = await duckDBManager.getDB()
    const conn = await db.connect()

    try {
      // Build initial SQL query
      const sql = this.buildViewSQL(config)

      // Create cache table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS "${id}_cache" AS ${sql}
      `)

      // Register in dependency graph
      const viewNode: GNodeDescriptor = {
        id,
        type: 'view',
        dependencies: new Set([config.source]),
        dependents: new Set(),
        dirty: false,
        dirtyRows: new Set(),
        duckdbTable: `${id}_cache`,
        viewConfig: config,
        incrementalState: {
          aggregates: new Map(),
          lastVersion: this.currentVersion,
          needsRefresh: false,
          lastRefreshTime: Date.now()
        }
      }

      this.nodes.set(id, viewNode)

      // Add to source's dependents
      const sourceNode = this.nodes.get(config.source)!
      sourceNode.dependents.add(id)

      console.log(`✅ View "${id}" created (depends on "${config.source}")`)

      return new HybridView(id, this)
    } catch (error) {
      console.error(`Failed to create view "${id}":`, error)
      throw error
    }
  }

  /**
   * Build SQL query from view config
   */
  private buildViewSQL(config: ViewConfig): string {
    const { source, rowPivots, aggregates, filters, sort } = config

    // SELECT clause
    const pivotCols = rowPivots || []
    const aggCols = Object.entries(aggregates).map(([col, agg]) =>
      `${agg.toUpperCase()}("${col}") as "${col}_${agg}"`
    )
    const selectCols = [...pivotCols.map(c => `"${c}"`), ...aggCols].join(', ')

    // WHERE clause
    const whereClause = filters && filters.length > 0
      ? `WHERE ${filters.map(f => {
          const val = typeof f.value === 'string' ? `'${f.value}'` : f.value
          return `"${f.column}" ${f.operator} ${val}`
        }).join(' AND ')}`
      : ''

    // GROUP BY clause
    const groupByClause = pivotCols.length > 0
      ? `GROUP BY ${pivotCols.map(c => `"${c}"`).join(', ')}`
      : ''

    // ORDER BY clause
    const orderByClause = sort && sort.length > 0
      ? `ORDER BY ${sort.map(s =>
          `"${s.column}" ${s.direction.toUpperCase()}`
        ).join(', ')}`
      : ''

    return `
      SELECT ${selectCols}
      FROM "${source}"
      ${whereClause}
      ${groupByClause}
      ${orderByClause}
    `.trim()
  }

  /**
   * Update table with new data (incremental)
   */
  async update(tableId: string, data: any[]): Promise<void> {
    const node = this.nodes.get(tableId)
    if (!node) {
      throw new Error(`Table "${tableId}" does not exist`)
    }
    if (node.type !== 'table') {
      throw new Error(`Cannot update non-table node "${tableId}"`)
    }

    const db = await duckDBManager.getDB()
    const conn = await db.connect()

    const version = ++this.currentVersion
    const timestamp = new Date().toISOString()

    try {
      // Get schema
      const schema = await this.getTableSchema(tableId)
      const columnNames = Object.keys(schema)

      // Build INSERT statement for delta table
      const values = data.map((row, idx) => {
        const rowId = Date.now() + idx
        const cols = columnNames.map(col => {
          const val = row[col]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
          if (val instanceof Date) return `'${val.toISOString()}'`
          return val
        }).join(', ')
        return `(${rowId}, ${version}, '${timestamp}', 'INSERT', ${cols})`
      }).join(', ')

      // Column list for INSERT (metadata columns + user columns)
      const columnList = ['_row_id', '_version', '_timestamp', '_op', ...columnNames]
        .map(c => `"${c}"`)
        .join(', ')

      // Fast path: write to delta table
      await conn.query(`
        INSERT INTO "${tableId}_delta" (${columnList})
        VALUES ${values}
      `)

      console.log(`📊 Inserted ${data.length} rows to "${tableId}_delta" (version ${version})`)

      // Mark dependent nodes as dirty
      this.markDirty(tableId, data.map((_, idx) => Date.now() + idx))

      // Schedule incremental refresh
      this.scheduleIncrementalRefresh()

      // Notify subscribers
      this.notifyUpdate(tableId, {
        version,
        timestamp: new Date(),
        operations: data.map((row, idx) => ({
          rowId: Date.now() + idx,
          opType: 'INSERT',
          newValues: row
        }))
      })
    } catch (error) {
      console.error(`Failed to update table "${tableId}":`, error)
      throw error
    }
  }

  /**
   * Get table schema
   */
  private async getTableSchema(tableId: string): Promise<SchemaDefinition> {
    const db = await duckDBManager.getDB()
    const conn = await db.connect()

    const result = await conn.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${tableId}'
        AND column_name NOT LIKE '_%'
    `)

    const schema: SchemaDefinition = {}
    for (const row of result.toArray()) {
      schema[row.column_name] = row.data_type
    }

    return schema
  }

  /**
   * Mark node and its dependents as dirty (Perspective-style)
   */
  private markDirty(nodeId: string, rowIds: number[]): void {
    const node = this.nodes.get(nodeId)
    if (!node) return

    node.dirty = true
    rowIds.forEach(id => node.dirtyRows.add(id))

    // Recursively mark dependents
    for (const dependentId of node.dependents) {
      this.markDirty(dependentId, rowIds)
    }
  }

  /**
   * Schedule incremental refresh (batched)
   */
  private scheduleIncrementalRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Batch updates: wait 16ms (60 FPS)
    this.refreshTimer = setTimeout(() => {
      this.performIncrementalRefresh()
    }, 16)
  }

  /**
   * Perform incremental refresh
   */
  private async performIncrementalRefresh(): Promise<void> {
    const startTime = performance.now()

    try {
      // 1. Topological sort to get update order
      const updateOrder = this.topologicalSort()

      // 2. Refresh each dirty node
      for (const nodeId of updateOrder) {
        const node = this.nodes.get(nodeId)
        if (!node || !node.dirty) continue

        if (node.type === 'view') {
          await this.refreshView(node)
        }

        // Clear dirty flag
        node.dirty = false
        node.dirtyRows.clear()
      }

      const elapsed = performance.now() - startTime
      console.log(`⚡ Incremental refresh completed in ${elapsed.toFixed(2)}ms`)
    } catch (error) {
      console.error('Incremental refresh failed:', error)
    }
  }

  /**
   * Refresh a view incrementally
   */
  private async refreshView(node: GNodeDescriptor): Promise<void> {
    const config = node.viewConfig!
    const sourceId = config.source
    const sourceNode = this.nodes.get(sourceId)!

    const db = await duckDBManager.getDB()
    const conn = await db.connect()

    try {
      // Strategy: Full refresh for now (can optimize later)
      const sql = this.buildViewSQL(config)

      // Recreate cache table
      await conn.query(`DROP TABLE IF EXISTS "${node.duckdbTable}"`)
      await conn.query(`CREATE TABLE "${node.duckdbTable}" AS ${sql}`)

      if (node.incrementalState) {
        node.incrementalState.lastVersion = this.currentVersion
        node.incrementalState.needsRefresh = false
        node.incrementalState.lastRefreshTime = Date.now()
      }

      // Notify subscribers
      this.notifyUpdate(node.id, {
        version: this.currentVersion,
        timestamp: new Date(),
        operations: []
      })
    } catch (error) {
      console.error(`Failed to refresh view "${node.id}":`, error)
      throw error
    }
  }

  /**
   * Topological sort (Kahn's algorithm)
   */
  private topologicalSort(): string[] {
    const result: string[] = []
    const inDegree = new Map<string, number>()

    // Calculate in-degrees
    for (const [nodeId, node] of this.nodes) {
      inDegree.set(nodeId, node.dependencies.size)
    }

    // Find nodes with in-degree 0
    const queue: string[] = []
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId)
      }
    }

    // Process queue
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      result.push(nodeId)

      const node = this.nodes.get(nodeId)!
      for (const dependentId of node.dependents) {
        const newDegree = inDegree.get(dependentId)! - 1
        inDegree.set(dependentId, newDegree)
        if (newDegree === 0) {
          queue.push(dependentId)
        }
      }
    }

    // Check for cycles
    if (result.length !== this.nodes.size) {
      throw new Error('Dependency cycle detected')
    }

    return result
  }

  /**
   * Query a view
   */
  async query(nodeId: string): Promise<any[]> {
    const node = this.nodes.get(nodeId)
    if (!node) {
      throw new Error(`Node "${nodeId}" does not exist`)
    }

    const db = await duckDBManager.getDB()
    const conn = await db.connect()

    const result = await conn.query(`SELECT * FROM "${node.duckdbTable}"`)
    return result.toArray()
  }

  /**
   * Subscribe to updates
   */
  subscribe(nodeId: string, callback: UpdateCallback): () => void {
    if (!this.updateCallbacks.has(nodeId)) {
      this.updateCallbacks.set(nodeId, new Set())
    }

    this.updateCallbacks.get(nodeId)!.add(callback)

    return () => {
      this.updateCallbacks.get(nodeId)?.delete(callback)
    }
  }

  /**
   * Notify subscribers of update
   */
  private notifyUpdate(nodeId: string, delta: Delta): void {
    const callbacks = this.updateCallbacks.get(nodeId)
    if (!callbacks) return

    for (const callback of callbacks) {
      try {
        callback(delta)
      } catch (error) {
        console.error('Update callback error:', error)
      }
    }
  }

  /**
   * Get node info (for debugging)
   */
  getNode(nodeId: string): GNodeDescriptor | undefined {
    return this.nodes.get(nodeId)
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Map<string, GNodeDescriptor> {
    return this.nodes
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    this.updateCallbacks.clear()
  }
}
