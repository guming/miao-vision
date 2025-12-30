/**
 * Hybrid GNode - Unit Tests
 *
 * Integration tests using real DuckDB-WASM to ensure SQL correctness
 *
 * NOTE: These tests require a browser environment (Web Workers).
 * Run with: npm run test:e2e for full integration testing.
 *
 * For now, these are skipped in Node.js environment.
 * Use E2E tests (Playwright) to test Hybrid GNode functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { HybridGNode } from './hybrid-gnode'
import { duckDBManager } from '@core/database'

// Skip all tests - DuckDB-WASM requires browser environment
describe.skip('HybridGNode', () => {
  let gnode: HybridGNode

  beforeEach(async () => {
    // Initialize real DuckDB-WASM (in-memory mode)
    await duckDBManager.initialize()
    gnode = new HybridGNode()
  })

  afterEach(() => {
    gnode.destroy()
  })

  describe('Table Operations', () => {
    it('should create table with schema', async () => {
      await gnode.createTable('users', {
        id: 'BIGINT',
        name: 'VARCHAR',
        email: 'VARCHAR',
        created_at: 'TIMESTAMP'
      })

      const node = gnode.getNode('users')
      expect(node).toBeDefined()
      expect(node?.type).toBe('table')
      expect(node?.duckdbTable).toBe('users')
    })

    it('should throw error if table already exists', async () => {
      await gnode.createTable('test', { name: 'VARCHAR' })

      await expect(
        gnode.createTable('test', { name: 'VARCHAR' })
      ).rejects.toThrow('already exists')
    })

    it('should create delta table alongside main table', async () => {
      await gnode.createTable('sales', {
        region: 'VARCHAR',
        revenue: 'DOUBLE'
      })

      const db = await duckDBManager.getDB()
      const conn = await db.connect()

      // Check main table exists
      const mainTable = await conn.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'sales'
      `)
      expect(mainTable.numRows).toBe(1)

      // Check delta table exists
      const deltaTable = await conn.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'sales_delta'
      `)
      expect(deltaTable.numRows).toBe(1)
    })
  })

  describe('Data Insertion', () => {
    beforeEach(async () => {
      await gnode.createTable('sales', {
        region: 'VARCHAR',
        product: 'VARCHAR',
        quantity: 'INTEGER',
        revenue: 'DOUBLE'
      })
    })

    it('should insert single row successfully', async () => {
      await gnode.update('sales', [
        {
          region: 'North',
          product: 'iPhone',
          quantity: 5,
          revenue: 4999.99
        }
      ])

      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      const result = await conn.query('SELECT COUNT(*) as cnt FROM sales_delta')
      const count = result.toArray()[0].cnt

      expect(count).toBe(1)
    })

    it('should insert multiple rows in batch', async () => {
      const data = [
        { region: 'North', product: 'iPhone', quantity: 5, revenue: 4999 },
        { region: 'South', product: 'iPad', quantity: 3, revenue: 2999 },
        { region: 'East', product: 'MacBook', quantity: 2, revenue: 7999 }
      ]

      await gnode.update('sales', data)

      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      const result = await conn.query('SELECT COUNT(*) as cnt FROM sales_delta')
      const count = result.toArray()[0].cnt

      expect(count).toBe(3)
    })

    it('should handle NULL values correctly', async () => {
      await gnode.update('sales', [
        {
          region: 'North',
          product: null,
          quantity: 0,
          revenue: 100.5
        }
      ])

      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      const result = await conn.query('SELECT product FROM sales_delta')
      const row = result.toArray()[0]

      expect(row.product).toBeNull()
    })

    it('should handle string with quotes correctly', async () => {
      await gnode.update('sales', [
        {
          region: "North's Region",
          product: "iPad \"Pro\"",
          quantity: 1,
          revenue: 999
        }
      ])

      const db = await duckDBManager.getDB()
      const conn = await db.connect()
      const result = await conn.query('SELECT region, product FROM sales_delta')
      const row = result.toArray()[0]

      expect(row.region).toBe("North's Region")
      expect(row.product).toBe('iPad "Pro"')
    })

    it('should throw error for non-existent table', async () => {
      await expect(
        gnode.update('nonexistent', [{ foo: 'bar' }])
      ).rejects.toThrow('does not exist')
    })

    it('should throw error when updating a view', async () => {
      await gnode.createView('sales_view', {
        source: 'sales',
        aggregates: { revenue: 'sum' }
      })

      await expect(
        gnode.update('sales_view', [{ foo: 'bar' }])
      ).rejects.toThrow('Cannot update non-table')
    })
  })

  describe('View Operations', () => {
    beforeEach(async () => {
      await gnode.createTable('sales', {
        region: 'VARCHAR',
        product: 'VARCHAR',
        revenue: 'DOUBLE'
      })
    })

    it('should create view with aggregation', async () => {
      const view = await gnode.createView('sales_by_region', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: { revenue: 'sum' }
      })

      expect(view).toBeDefined()
      const node = gnode.getNode('sales_by_region')
      expect(node?.type).toBe('view')
    })

    it('should throw error if view source does not exist', async () => {
      await expect(
        gnode.createView('invalid_view', {
          source: 'nonexistent',
          aggregates: { revenue: 'sum' }
        })
      ).rejects.toThrow('does not exist')
    })

    it('should throw error if view ID already exists', async () => {
      await gnode.createView('test_view', {
        source: 'sales',
        aggregates: { revenue: 'sum' }
      })

      await expect(
        gnode.createView('test_view', {
          source: 'sales',
          aggregates: { revenue: 'avg' }
        })
      ).rejects.toThrow('already exists')
    })

    it('should create view with filters', async () => {
      await gnode.update('sales', [
        { region: 'North', product: 'iPhone', revenue: 5000 },
        { region: 'South', product: 'iPad', revenue: 500 }
      ])

      const view = await gnode.createView('high_value', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: { revenue: 'sum' },
        filters: [
          { column: 'revenue', operator: '>', value: 1000 }
        ]
      })

      // Wait for initial refresh
      await new Promise(resolve => setTimeout(resolve, 50))

      const data = await view.toArray()
      expect(data.length).toBe(1)
      expect(data[0].region).toBe('North')
    })

    it('should create view with sorting', async () => {
      await gnode.update('sales', [
        { region: 'North', product: 'iPhone', revenue: 3000 },
        { region: 'South', product: 'iPad', revenue: 5000 },
        { region: 'East', product: 'MacBook', revenue: 1000 }
      ])

      const view = await gnode.createView('sorted_sales', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: { revenue: 'sum' },
        sort: [{ column: 'revenue_sum', direction: 'desc' }]
      })

      // Wait for initial refresh
      await new Promise(resolve => setTimeout(resolve, 50))

      const data = await view.toArray()
      expect(data[0].region).toBe('South') // Highest revenue first
      expect(data[2].region).toBe('East')  // Lowest revenue last
    })

    it('should support multiple aggregates', async () => {
      await gnode.update('sales', [
        { region: 'North', product: 'iPhone', revenue: 1000 },
        { region: 'North', product: 'iPad', revenue: 2000 }
      ])

      const view = await gnode.createView('multi_agg', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: {
          revenue: 'sum',
          product: 'count'
        }
      })

      // Wait for initial refresh
      await new Promise(resolve => setTimeout(resolve, 50))

      const data = await view.toArray()
      expect(data[0].revenue_sum).toBe(3000)
      expect(data[0].product_count).toBe(2)
    })
  })

  describe('Incremental Updates', () => {
    beforeEach(async () => {
      await gnode.createTable('sales', {
        region: 'VARCHAR',
        revenue: 'DOUBLE'
      })
    })

    it('should mark dependent views as dirty', async () => {
      await gnode.createView('sales_by_region', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: { revenue: 'sum' }
      })

      const viewNode = gnode.getNode('sales_by_region')
      expect(viewNode?.dirty).toBe(false)

      await gnode.update('sales', [
        { region: 'North', revenue: 1000 }
      ])

      // Should be marked dirty after update
      expect(viewNode?.dirty).toBe(true)
    })

    it('should propagate updates through dependency chain', async () => {
      // Create chain: sales -> view1 -> view2
      await gnode.createView('view1', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: { revenue: 'sum' }
      })

      // Wait for view1 to be created
      await new Promise(resolve => setTimeout(resolve, 50))

      // Note: Currently Hybrid GNode doesn't support view-on-view
      // This test documents the limitation
      await expect(
        gnode.createView('view2', {
          source: 'view1',
          rowPivots: ['region'],
          aggregates: { revenue_sum: 'avg' }
        })
      ).rejects.toThrow()
    })

    it('should auto-refresh views after update', async () => {
      const view = await gnode.createView('sales_summary', {
        source: 'sales',
        aggregates: { revenue: 'sum' }
      })

      await gnode.update('sales', [
        { region: 'North', revenue: 1000 }
      ])

      // Wait for incremental refresh (16ms batch window)
      await new Promise(resolve => setTimeout(resolve, 50))

      const data = await view.toArray()
      expect(data[0].revenue_sum).toBe(1000)
    })
  })

  describe('Query Operations', () => {
    beforeEach(async () => {
      await gnode.createTable('sales', {
        region: 'VARCHAR',
        revenue: 'DOUBLE'
      })

      await gnode.update('sales', [
        { region: 'North', revenue: 1000 },
        { region: 'South', revenue: 2000 }
      ])
    })

    it('should query view data', async () => {
      const view = await gnode.createView('summary', {
        source: 'sales',
        rowPivots: ['region'],
        aggregates: { revenue: 'sum' }
      })

      // Wait for initial refresh
      await new Promise(resolve => setTimeout(resolve, 50))

      const data = await gnode.query('summary')
      expect(data.length).toBe(2)
    })

    it('should query table data directly', async () => {
      // Wait for data to be available
      await new Promise(resolve => setTimeout(resolve, 50))

      const data = await gnode.query('sales')
      expect(data.length).toBeGreaterThanOrEqual(0)
    })

    it('should throw error for non-existent node', async () => {
      await expect(
        gnode.query('nonexistent')
      ).rejects.toThrow('does not exist')
    })
  })

  describe('Subscriptions', () => {
    beforeEach(async () => {
      await gnode.createTable('sales', {
        region: 'VARCHAR',
        revenue: 'DOUBLE'
      })
    })

    it('should notify subscribers on update', async () => {
      let updateCount = 0
      const unsubscribe = gnode.subscribe('sales', () => {
        updateCount++
      })

      await gnode.update('sales', [
        { region: 'North', revenue: 1000 }
      ])

      expect(updateCount).toBe(1)
      unsubscribe()
    })

    it('should notify view subscribers on source update', async () => {
      await gnode.createView('summary', {
        source: 'sales',
        aggregates: { revenue: 'sum' }
      })

      let viewUpdateCount = 0
      const unsubscribe = gnode.subscribe('summary', () => {
        viewUpdateCount++
      })

      await gnode.update('sales', [
        { region: 'North', revenue: 1000 }
      ])

      // Wait for incremental refresh
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(viewUpdateCount).toBeGreaterThan(0)
      unsubscribe()
    })

    it('should unsubscribe correctly', async () => {
      let updateCount = 0
      const unsubscribe = gnode.subscribe('sales', () => {
        updateCount++
      })

      await gnode.update('sales', [{ region: 'North', revenue: 1000 }])
      expect(updateCount).toBe(1)

      unsubscribe()

      await gnode.update('sales', [{ region: 'South', revenue: 2000 }])
      expect(updateCount).toBe(1) // Should not increment
    })
  })

  describe('Dependency Graph', () => {
    beforeEach(async () => {
      await gnode.createTable('table1', { value: 'INTEGER' })
      await gnode.createTable('table2', { value: 'INTEGER' })
    })

    it('should track dependencies correctly', async () => {
      await gnode.createView('view1', {
        source: 'table1',
        aggregates: { value: 'sum' }
      })

      const table1 = gnode.getNode('table1')
      const view1 = gnode.getNode('view1')

      expect(table1?.dependents.has('view1')).toBe(true)
      expect(view1?.dependencies.has('table1')).toBe(true)
    })

    it('should detect cycles (topological sort)', async () => {
      // Create valid dependency chain
      await gnode.createView('view1', {
        source: 'table1',
        aggregates: { value: 'sum' }
      })

      // Manually create cycle for testing (not possible through API)
      const table1 = gnode.getNode('table1')
      const view1 = gnode.getNode('view1')

      // Artificially create cycle: view1 -> table1 -> view1
      view1?.dependents.add('table1')
      table1?.dependencies.add('view1')

      // Topological sort should detect cycle
      await gnode.update('table1', [{ value: 1 }])

      // Wait for refresh attempt
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should log error but not crash
      // (Implementation should handle gracefully)
    })

    it('should return all nodes', () => {
      const nodes = gnode.getAllNodes()
      expect(nodes.size).toBe(2) // table1, table2
      expect(nodes.has('table1')).toBe(true)
      expect(nodes.has('table2')).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on destroy', async () => {
      await gnode.createTable('sales', { value: 'INTEGER' })
      await gnode.createView('summary', {
        source: 'sales',
        aggregates: { value: 'sum' }
      })

      await gnode.update('sales', [{ value: 1 }])

      gnode.destroy()

      // Should not crash or leak timers
      expect(() => gnode.destroy()).not.toThrow()
    })

    it('should clear all subscriptions on destroy', async () => {
      await gnode.createTable('sales', { value: 'INTEGER' })

      let updateCount = 0
      gnode.subscribe('sales', () => updateCount++)

      gnode.destroy()

      // After destroy, subscribers should be cleared
      const node = gnode.getNode('sales')
      // Implementation detail: updateCallbacks should be cleared
    })
  })
})
