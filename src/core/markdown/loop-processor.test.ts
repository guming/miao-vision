/**
 * Loop Processor Tests
 *
 * Tests for {#each} loop block processing
 */

import { describe, it, expect } from 'vitest'
import {
  processLoops,
  hasLoopBlocks,
  getLoopDataSources,
  type LoopContext
} from './loop-processor'

describe('loop-processor', () => {
  describe('hasLoopBlocks', () => {
    it('should detect {#each} blocks', () => {
      expect(hasLoopBlocks('Some text {#each items as item} content {/each}')).toBe(true)
      expect(hasLoopBlocks('No loop blocks here')).toBe(false)
    })
  })

  describe('getLoopDataSources', () => {
    it('should extract data source names', () => {
      const content = `
        {#each sales as row}
        content
        {/each}

        {#each customers as c}
        more content
        {/each}
      `
      const sources = getLoopDataSources(content)
      expect(sources).toEqual(['sales', 'customers'])
    })

    it('should not duplicate data sources', () => {
      const content = `
        {#each items as a}a{/each}
        {#each items as b}b{/each}
      `
      const sources = getLoopDataSources(content)
      expect(sources).toEqual(['items'])
    })
  })

  describe('processLoops', () => {
    const createContext = (data: Record<string, any[]>): LoopContext => ({
      queries: new Map(
        Object.entries(data).map(([name, rows]) => [
          name,
          { data: rows, columns: rows.length > 0 ? Object.keys(rows[0]) : [] }
        ])
      ),
      inputs: {},
      metadata: {}
    })

    it('should iterate over query results', () => {
      const content = `# Products
{#each products as p}
- \${p.name}: $\${p.price}
{/each}`
      const context = createContext({
        products: [
          { name: 'Apple', price: 1.50 },
          { name: 'Banana', price: 0.75 },
          { name: 'Cherry', price: 3.00 }
        ]
      })

      const result = processLoops(content, context)

      expect(result).toContain('- Apple: $1.5')
      expect(result).toContain('- Banana: $0.75')
      expect(result).toContain('- Cherry: $3')
    })

    it('should support index variable', () => {
      const content = '{#each items as item, i}\${i + 1}. \${item.name}\n{/each}'
      const context = createContext({
        items: [
          { name: 'First' },
          { name: 'Second' },
          { name: 'Third' }
        ]
      })

      const result = processLoops(content, context)

      expect(result).toContain('1. First')
      expect(result).toContain('2. Second')
      expect(result).toContain('3. Third')
    })

    it('should handle {:else} for empty data', () => {
      const content = `{#each empty_data as row}
- \${row.name}
{:else}
No data available.
{/each}`
      const context = createContext({
        empty_data: []
      })

      const result = processLoops(content, context)

      expect(result.trim()).toBe('No data available.')
    })

    it('should handle missing data source gracefully', () => {
      const content = `{#each nonexistent as row}
- \${row.name}
{:else}
No data found.
{/each}`
      const context = createContext({})

      const result = processLoops(content, context)

      expect(result.trim()).toBe('No data found.')
    })

    it('should handle nested properties', () => {
      const content = `{#each orders as order}
Order: \${order.id} - \${order.customer} - $\${order.total}
{/each}`
      const context = createContext({
        orders: [
          { id: 'ORD-001', customer: 'John Doe', total: 150.00 },
          { id: 'ORD-002', customer: 'Jane Smith', total: 275.50 }
        ]
      })

      const result = processLoops(content, context)

      expect(result).toContain('Order: ORD-001 - John Doe - $150')
      expect(result).toContain('Order: ORD-002 - Jane Smith - $275.5')
    })

    it('should handle null/undefined values', () => {
      const content = `{#each items as item}
Value: \${item.value}
{/each}`
      const context = createContext({
        items: [
          { value: 'present' },
          { value: null },
          { value: undefined },
          { value: 0 },
          { value: '' }
        ]
      })

      const result = processLoops(content, context)

      expect(result).toContain('Value: present')
      expect(result).toContain('Value: 0')
    })

    it('should preserve content outside loops', () => {
      const content = `# Report Header

Some intro text.

{#each items as item}
- \${item.name}
{/each}

Footer text here.`
      const context = createContext({
        items: [{ name: 'Item 1' }, { name: 'Item 2' }]
      })

      const result = processLoops(content, context)

      expect(result).toContain('# Report Header')
      expect(result).toContain('Some intro text.')
      expect(result).toContain('- Item 1')
      expect(result).toContain('- Item 2')
      expect(result).toContain('Footer text here.')
    })

    it('should handle multiple loops in same content', () => {
      const content = `## Categories
{#each categories as cat}
### \${cat.name}
{/each}

## Products
{#each products as prod}
- \${prod.name}
{/each}`
      const context = createContext({
        categories: [{ name: 'Electronics' }, { name: 'Clothing' }],
        products: [{ name: 'Phone' }, { name: 'Shirt' }]
      })

      const result = processLoops(content, context)

      expect(result).toContain('### Electronics')
      expect(result).toContain('### Clothing')
      expect(result).toContain('- Phone')
      expect(result).toContain('- Shirt')
    })

    it('should handle index expressions', () => {
      const content = `{#each items as item, idx}
Row \${idx + 1} of 3: \${item.name}
{/each}`
      const context = createContext({
        items: [
          { name: 'A' },
          { name: 'B' },
          { name: 'C' }
        ]
      })

      const result = processLoops(content, context)

      expect(result).toContain('Row 1 of 3: A')
      expect(result).toContain('Row 2 of 3: B')
      expect(result).toContain('Row 3 of 3: C')
    })

    it('should handle nested loops', () => {
      const content = `{#each outer as o}
## \${o.title}
{#each inner as i}
- \${i.name}
{/each}
{/each}`
      const context = createContext({
        outer: [{ title: 'Section 1' }, { title: 'Section 2' }],
        inner: [{ name: 'Item A' }, { name: 'Item B' }]
      })

      const result = processLoops(content, context)

      // Both sections should appear with inner items repeated
      expect(result).toContain('## Section 1')
      expect(result).toContain('## Section 2')
      expect(result).toContain('- Item A')
      expect(result).toContain('- Item B')
    })
  })
})
