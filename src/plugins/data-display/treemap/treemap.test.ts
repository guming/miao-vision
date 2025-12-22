/**
 * Treemap Component Tests
 *
 * Tests for layout algorithm, color schemes, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  treemapRegistration,
  formatValue,
  getTileColor,
  squarify
} from './definition'
import { TreemapMetadata } from './metadata'
import { TreemapSchema } from './schema'

describe('Treemap Component', () => {
  describe('formatValue', () => {
    it('should format numbers correctly', () => {
      expect(formatValue(1000, 'number')).toBe('1,000')
      expect(formatValue(1234567, 'number')).toBe('1,234,567')
    })

    it('should format currency correctly', () => {
      expect(formatValue(1000, 'currency', '$')).toBe('$1,000')
      expect(formatValue(500, 'currency', '€')).toBe('€500')
    })

    it('should format percent correctly', () => {
      expect(formatValue(75, 'percent')).toBe('75.0%')
      expect(formatValue(33.33, 'percent')).toBe('33.3%')
    })

    it('should handle zero values', () => {
      expect(formatValue(0, 'number')).toBe('0')
      expect(formatValue(0, 'currency', '$')).toBe('$0')
    })

    it('should handle decimal values', () => {
      expect(formatValue(1234.56, 'number')).toBe('1,234.56')
    })
  })

  describe('getTileColor', () => {
    it('should return colors from default scheme', () => {
      const color = getTileColor(0, 'default')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should cycle through colors', () => {
      const colors = new Set<string>()
      for (let i = 0; i < 8; i++) {
        colors.add(getTileColor(i, 'default'))
      }
      expect(colors.size).toBe(8)
    })

    it('should work with different color schemes', () => {
      const schemes = ['default', 'category', 'blue', 'green', 'warm', 'cool', 'mono']
      for (const scheme of schemes) {
        const color = getTileColor(0, scheme)
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('should fallback to default for unknown scheme', () => {
      const unknownColor = getTileColor(0, 'unknown-scheme')
      const defaultColor = getTileColor(0, 'default')
      expect(unknownColor).toBe(defaultColor)
    })

    it('should wrap around for large indices', () => {
      const color0 = getTileColor(0, 'default')
      const color8 = getTileColor(8, 'default')
      expect(color0).toBe(color8)
    })

    it('should return different colors for different indices', () => {
      const color0 = getTileColor(0, 'default')
      const color1 = getTileColor(1, 'default')
      expect(color0).not.toBe(color1)
    })
  })

  describe('squarify layout algorithm', () => {
    it('should return empty array for empty input', () => {
      const result = squarify([], { x: 0, y: 0, width: 600, height: 400 }, 0)
      expect(result).toEqual([])
    })

    it('should return empty array for zero total value', () => {
      const items = [{ label: 'A', value: 0 }]
      const result = squarify(items, { x: 0, y: 0, width: 600, height: 400 }, 0)
      expect(result).toEqual([])
    })

    it('should layout single item', () => {
      const items = [{ label: 'A', value: 100 }]
      const result = squarify(items, { x: 0, y: 0, width: 600, height: 400 }, 100)
      expect(result.length).toBe(1)
      expect(result[0].label).toBe('A')
    })

    it('should layout multiple items', () => {
      const items = [
        { label: 'A', value: 500 },
        { label: 'B', value: 300 },
        { label: 'C', value: 200 }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 600, height: 400 }, 1000)
      expect(result.length).toBe(3)
    })

    it('should preserve labels', () => {
      const items = [
        { label: 'First', value: 50 },
        { label: 'Second', value: 50 }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 200, height: 100 }, 100)
      const labels = result.map(t => t.label)
      expect(labels).toContain('First')
      expect(labels).toContain('Second')
    })

    it('should preserve group information', () => {
      const items = [
        { label: 'A', value: 100, group: 'Group1' }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 200, height: 100 }, 100)
      expect(result[0].group).toBe('Group1')
    })

    it('should create tiles with non-negative dimensions', () => {
      const items = [
        { label: 'A', value: 500 },
        { label: 'B', value: 300 },
        { label: 'C', value: 200 }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 600, height: 400 }, 1000, 2)
      for (const tile of result) {
        expect(tile.width).toBeGreaterThanOrEqual(0)
        expect(tile.height).toBeGreaterThanOrEqual(0)
      }
    })

    it('should apply padding between tiles', () => {
      const items = [{ label: 'A', value: 100 }]
      const withPadding = squarify(items, { x: 0, y: 0, width: 100, height: 100 }, 100, 10)
      const withoutPadding = squarify(items, { x: 0, y: 0, width: 100, height: 100 }, 100, 0)
      expect(withPadding[0].width).toBeLessThan(withoutPadding[0].width)
    })

    it('should allocate larger area to larger values', () => {
      const items = [
        { label: 'Small', value: 10 },
        { label: 'Large', value: 100 },
        { label: 'Medium', value: 50 }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 600, height: 400 }, 160, 0)
      const large = result.find(t => t.label === 'Large')!
      const small = result.find(t => t.label === 'Small')!
      const largeArea = large.width * large.height
      const smallArea = small.width * small.height
      expect(largeArea).toBeGreaterThan(smallArea)
    })

    it('should handle equal values', () => {
      const items = [
        { label: 'A', value: 50 },
        { label: 'B', value: 50 },
        { label: 'C', value: 50 },
        { label: 'D', value: 50 }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 200, height: 200 }, 200, 0)
      expect(result.length).toBe(4)
      const areas = result.map(t => t.width * t.height)
      const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length
      for (const area of areas) {
        expect(Math.abs(area - avgArea) / avgArea).toBeLessThan(0.5)
      }
    })

    it('should handle very small values', () => {
      const items = [
        { label: 'Big', value: 1000 },
        { label: 'Tiny', value: 1 }
      ]
      const result = squarify(items, { x: 0, y: 0, width: 600, height: 400 }, 1001)
      expect(result.length).toBe(2)
    })

    it('should position tiles within bounds', () => {
      const items = [
        { label: 'A', value: 300 },
        { label: 'B', value: 200 },
        { label: 'C', value: 100 }
      ]
      const rect = { x: 10, y: 20, width: 500, height: 300 }
      const result = squarify(items, rect, 600, 2)
      for (const tile of result) {
        expect(tile.x).toBeGreaterThanOrEqual(rect.x)
        expect(tile.y).toBeGreaterThanOrEqual(rect.y)
        expect(tile.x + tile.width).toBeLessThanOrEqual(rect.x + rect.width + 1)
        expect(tile.y + tile.height).toBeLessThanOrEqual(rect.y + rect.height + 1)
      }
    })

    it('should handle many items', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        label: `Item ${i}`,
        value: Math.random() * 100 + 10
      }))
      const totalValue = items.reduce((sum, item) => sum + item.value, 0)
      const result = squarify(items, { x: 0, y: 0, width: 800, height: 600 }, totalValue)
      expect(result.length).toBe(20)
    })
  })

  describe('TreemapMetadata', () => {
    it('should have correct type', () => {
      expect(TreemapMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(TreemapMetadata.language).toBe('treemap')
    })

    it('should have display name', () => {
      expect(TreemapMetadata.displayName).toBe('Treemap')
    })

    it('should have description', () => {
      expect(TreemapMetadata.description).toContain('hierarchical')
    })

    it('should have required props defined', () => {
      const propNames = TreemapMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('labelColumn')
      expect(propNames).toContain('valueColumn')
    })

    it('should have examples', () => {
      expect(TreemapMetadata.examples.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(TreemapMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(TreemapMetadata.tags).toContain('treemap')
      expect(TreemapMetadata.tags).toContain('hierarchy')
    })
  })

  describe('TreemapSchema', () => {
    it('should have data field as required', () => {
      const dataField = TreemapSchema.fields.find(f => f.name === 'data')
      expect(dataField).toBeDefined()
      expect(dataField?.required).toBe(true)
    })

    it('should have labelColumn as required', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'labelColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have height with default', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'height')
      expect(field).toBeDefined()
      expect(field?.default).toBe(400)
    })

    it('should have colorScheme enum', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'colorScheme')
      expect(field).toBeDefined()
      expect(field?.type).toBe('enum')
      expect(field?.enum).toContain('default')
      expect(field?.enum).toContain('blue')
    })

    it('should have valueFormat enum', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'valueFormat')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('number')
      expect(field?.enum).toContain('currency')
      expect(field?.enum).toContain('percent')
    })

    it('should have tilePadding with default', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'tilePadding')
      expect(field).toBeDefined()
      expect(field?.default).toBe(2)
    })

    it('should have borderRadius with default', () => {
      const field = TreemapSchema.fields.find(f => f.name === 'borderRadius')
      expect(field).toBeDefined()
      expect(field?.default).toBe(4)
    })
  })

  describe('treemapRegistration', () => {
    it('should have metadata', () => {
      expect(treemapRegistration.metadata).toBeDefined()
      expect(treemapRegistration.metadata.displayName).toBe('Treemap')
    })

    it('should have correct language', () => {
      expect(treemapRegistration.metadata.language).toBe('treemap')
    })

    it('should have description', () => {
      expect(treemapRegistration.metadata.description).toContain('hierarchical')
    })

    it('should have icon', () => {
      expect(treemapRegistration.metadata.icon).toBe('🗺️')
    })

    it('should have tags', () => {
      expect(treemapRegistration.metadata.tags).toContain('treemap')
      expect(treemapRegistration.metadata.tags).toContain('hierarchy')
    })

    it('should have parser function', () => {
      expect(typeof treemapRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof treemapRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(treemapRegistration.component).toBeDefined()
    })
  })
})
