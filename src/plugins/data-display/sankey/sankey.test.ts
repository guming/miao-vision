/**
 * Sankey Diagram Component Tests
 *
 * Tests for layout algorithm, color schemes, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  sankeyRegistration,
  formatValue,
  getNodeColor,
  computeSankeyLayout
} from './definition'
import type { SankeyConfig } from './types'

describe('Sankey Diagram Component', () => {
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
  })

  describe('getNodeColor', () => {
    it('should return colors from default scheme', () => {
      const color = getNodeColor(0, 'default')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should cycle through colors', () => {
      const colors = new Set<string>()
      for (let i = 0; i < 8; i++) {
        colors.add(getNodeColor(i, 'default'))
      }
      // Should have 8 unique colors in default scheme
      expect(colors.size).toBe(8)
    })

    it('should work with different color schemes', () => {
      const schemes = ['default', 'category', 'blue', 'green', 'warm', 'cool']

      for (const scheme of schemes) {
        const color = getNodeColor(0, scheme)
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('should fall back to default for unknown scheme', () => {
      const color = getNodeColor(0, 'unknown')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  describe('computeSankeyLayout', () => {
    const defaultConfig: SankeyConfig = {
      data: 'test',
      sourceColumn: 'from',
      targetColumn: 'to',
      valueColumn: 'value',
      nodePadding: 10,
      colorScheme: 'default'
    }

    it('should compute nodes from links', () => {
      const rawLinks = [
        { source: 'A', target: 'B', value: 100 },
        { source: 'A', target: 'C', value: 50 }
      ]

      const { nodes, links } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      expect(nodes.length).toBe(3) // A, B, C
      expect(links.length).toBe(2)

      const nodeNames = nodes.map(n => n.name)
      expect(nodeNames).toContain('A')
      expect(nodeNames).toContain('B')
      expect(nodeNames).toContain('C')
    })

    it('should assign layers correctly', () => {
      const rawLinks = [
        { source: 'A', target: 'B', value: 100 },
        { source: 'B', target: 'C', value: 100 }
      ]

      const { nodes } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      const nodeA = nodes.find(n => n.name === 'A')!
      const nodeB = nodes.find(n => n.name === 'B')!
      const nodeC = nodes.find(n => n.name === 'C')!

      expect(nodeA.layer).toBe(0)
      expect(nodeB.layer).toBe(1)
      expect(nodeC.layer).toBe(2)
    })

    it('should compute node values correctly', () => {
      const rawLinks = [
        { source: 'A', target: 'B', value: 100 },
        { source: 'A', target: 'C', value: 50 }
      ]

      const { nodes } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      const nodeA = nodes.find(n => n.name === 'A')!
      expect(nodeA.value).toBe(150) // 100 + 50 outgoing
    })

    it('should assign colors to nodes', () => {
      const rawLinks = [
        { source: 'A', target: 'B', value: 100 }
      ]

      const { nodes } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      for (const node of nodes) {
        expect(node.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('should compute link widths', () => {
      const rawLinks = [
        { source: 'A', target: 'B', value: 100 }
      ]

      const { links } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      expect(links.length).toBe(1)
      expect(links[0].width).toBeGreaterThanOrEqual(1)
    })

    it('should handle single link', () => {
      const rawLinks = [
        { source: 'Source', target: 'Target', value: 500 }
      ]

      const { nodes, links } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      expect(nodes.length).toBe(2)
      expect(links.length).toBe(1)
      expect(links[0].formattedValue).toBe('500')
    })

    it('should handle multiple inputs to one node', () => {
      const rawLinks = [
        { source: 'A', target: 'C', value: 100 },
        { source: 'B', target: 'C', value: 100 }
      ]

      const { nodes } = computeSankeyLayout(rawLinks, defaultConfig, 400)

      const nodeA = nodes.find(n => n.name === 'A')!
      const nodeB = nodes.find(n => n.name === 'B')!

      expect(nodeA.layer).toBe(0)
      expect(nodeB.layer).toBe(0)
    })

    it('should format values with currency', () => {
      const rawLinks = [
        { source: 'A', target: 'B', value: 1000 }
      ]

      const config: SankeyConfig = {
        ...defaultConfig,
        valueFormat: 'currency',
        currencySymbol: '$'
      }

      const { links } = computeSankeyLayout(rawLinks, config, 400)

      expect(links[0].formattedValue).toBe('$1,000')
    })
  })

  describe('Metadata', () => {
    it('should have correct component type', () => {
      expect(sankeyRegistration.metadata.type).toBe('data-viz')
    })

    it('should have correct language identifier', () => {
      expect(sankeyRegistration.metadata.language).toBe('sankey')
    })

    it('should be categorized as chart', () => {
      expect(sankeyRegistration.metadata.category).toBe('chart')
    })

    it('should have correct display name', () => {
      expect(sankeyRegistration.metadata.displayName).toBe('Sankey Diagram')
    })

    it('should have description', () => {
      expect(sankeyRegistration.metadata.description).toContain('flow')
    })

    it('should have icon', () => {
      expect(sankeyRegistration.metadata.icon).toBe('🔀')
    })

    it('should have tags', () => {
      expect(sankeyRegistration.metadata.tags).toContain('sankey')
      expect(sankeyRegistration.metadata.tags).toContain('flow')
    })
  })

  describe('Component Registration', () => {
    it('should have parser function', () => {
      expect(typeof sankeyRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof sankeyRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(sankeyRegistration.component).toBeDefined()
    })
  })
})
