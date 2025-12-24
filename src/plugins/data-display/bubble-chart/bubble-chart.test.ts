/**
 * BubbleChart Component Tests
 *
 * Tests for data validation, bubble building, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  bubbleChartRegistration,
  formatValue,
  validateBubbleChartData,
  buildBubbleChartData
} from './definition'
import { BubbleChartMetadata } from './metadata'
import type { BubbleChartConfig } from './types'

describe('BubbleChart Component', () => {
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
      expect(formatValue(75.5, 'percent')).toBe('75.5%')
      expect(formatValue(33.333, 'percent')).toBe('33.3%')
    })

    it('should use default format (number)', () => {
      expect(formatValue(42)).toBe('42')
    })
  })

  describe('validateBubbleChartData', () => {
    const baseConfig: BubbleChartConfig = {
      data: 'test',
      x: 'xCol',
      y: 'yCol',
      size: 'sizeCol'
    }

    it('should return null for empty data', () => {
      const result = validateBubbleChartData({ data: [] }, baseConfig)
      expect(result).toBeNull()
    })

    it('should return null for missing data', () => {
      const result = validateBubbleChartData({}, baseConfig)
      expect(result).toBeNull()
    })

    it('should return null if x column is missing', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        x: undefined as any
      }
      const result = validateBubbleChartData({ data: [{ a: 1 }] }, config)
      expect(result).toBeNull()
    })

    it('should return null if y column is missing', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        y: undefined as any
      }
      const result = validateBubbleChartData({ data: [{ a: 1 }] }, config)
      expect(result).toBeNull()
    })

    it('should return null if size column is missing', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        size: undefined as any
      }
      const result = validateBubbleChartData({ data: [{ a: 1 }] }, config)
      expect(result).toBeNull()
    })

    it('should return null if x column not found in data', () => {
      const result = validateBubbleChartData(
        { data: [{ yCol: 1, sizeCol: 1 }] },
        baseConfig
      )
      expect(result).toBeNull()
    })

    it('should return null if y column not found in data', () => {
      const result = validateBubbleChartData(
        { data: [{ xCol: 1, sizeCol: 1 }] },
        baseConfig
      )
      expect(result).toBeNull()
    })

    it('should return null if size column not found in data', () => {
      const result = validateBubbleChartData(
        { data: [{ xCol: 1, yCol: 1 }] },
        baseConfig
      )
      expect(result).toBeNull()
    })

    it('should return data if all columns exist', () => {
      const data = [{ xCol: 1, yCol: 2, sizeCol: 3 }]
      const result = validateBubbleChartData({ data }, baseConfig)
      expect(result).toEqual(data)
    })
  })

  describe('buildBubbleChartData', () => {
    const baseConfig: BubbleChartConfig = {
      data: 'test',
      x: 'xCol',
      y: 'yCol',
      size: 'sizeCol'
    }

    it('should build bubbles from basic data', () => {
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 30 },
        { xCol: 15, yCol: 25, sizeCol: 35 }
      ]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.bubbles).toHaveLength(2)
      expect(result.bubbles[0].x).toBe(10)
      expect(result.bubbles[0].y).toBe(20)
      expect(result.bubbles[0].size).toBe(30)
      expect(result.bubbles[1].x).toBe(15)
      expect(result.bubbles[1].y).toBe(25)
      expect(result.bubbles[1].size).toBe(35)
    })

    it('should extract unique groups', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        group: 'category'
      }
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 30, category: 'A' },
        { xCol: 15, yCol: 25, sizeCol: 35, category: 'B' },
        { xCol: 12, yCol: 22, sizeCol: 32, category: 'A' }
      ]
      const result = buildBubbleChartData(rows, config)

      expect(result.groups).toEqual(['A', 'B'])
    })

    it('should assign colors based on groups', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        group: 'category'
      }
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 30, category: 'A' },
        { xCol: 15, yCol: 25, sizeCol: 35, category: 'B' }
      ]
      const result = buildBubbleChartData(rows, config)

      expect(result.bubbles[0].color).toBe('#3B82F6') // First color
      expect(result.bubbles[1].color).toBe('#10B981') // Second color
    })

    it('should use default color when no groups', () => {
      const rows = [{ xCol: 10, yCol: 20, sizeCol: 30 }]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.bubbles[0].color).toBe('#3B82F6')
    })

    it('should calculate correct ranges', () => {
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 30 },
        { xCol: 50, yCol: 60, sizeCol: 70 }
      ]
      const result = buildBubbleChartData(rows, baseConfig)

      // Ranges should include padding (10%)
      expect(result.xRange[0]).toBeLessThan(10)
      expect(result.xRange[1]).toBeGreaterThan(50)
      expect(result.yRange[0]).toBeLessThan(20)
      expect(result.yRange[1]).toBeGreaterThan(60)
      expect(result.sizeRange).toEqual([30, 70])
    })

    it('should handle single data point', () => {
      const rows = [{ xCol: 10, yCol: 20, sizeCol: 30 }]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.bubbles).toHaveLength(1)
      expect(result.xRange).toHaveLength(2)
      expect(result.yRange).toHaveLength(2)
    })

    it('should calculate bubble radii based on size', () => {
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 10 },
        { xCol: 15, yCol: 25, sizeCol: 20 }
      ]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.bubbles[0].radius).toBe(10) // Min bubble size
      expect(result.bubbles[1].radius).toBe(50) // Max bubble size
    })

    it('should use custom min/max bubble sizes', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        minBubbleSize: 5,
        maxBubbleSize: 100
      }
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 10 },
        { xCol: 15, yCol: 25, sizeCol: 20 }
      ]
      const result = buildBubbleChartData(rows, config)

      expect(result.bubbles[0].radius).toBe(5)
      expect(result.bubbles[1].radius).toBe(100)
    })

    it('should handle equal size values', () => {
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 30 },
        { xCol: 15, yCol: 25, sizeCol: 30 }
      ]
      const result = buildBubbleChartData(rows, baseConfig)

      // When all sizes are equal, sizeMax is adjusted to sizeMin + 1
      expect(result.sizeRange[1]).toBe(result.sizeRange[0] + 1)
    })

    it('should format values based on config', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        valueFormat: 'currency',
        currencySymbol: '$'
      }
      const rows = [{ xCol: 1000, yCol: 2000, sizeCol: 3000 }]
      const result = buildBubbleChartData(rows, config)

      expect(result.bubbles[0].formatted.x).toBe('$1,000')
      expect(result.bubbles[0].formatted.y).toBe('$2,000')
      expect(result.bubbles[0].formatted.size).toBe('$3,000')
    })

    it('should add labels when label column provided', () => {
      const config: BubbleChartConfig = {
        ...baseConfig,
        label: 'name'
      }
      const rows = [{ xCol: 10, yCol: 20, sizeCol: 30, name: 'Point A' }]
      const result = buildBubbleChartData(rows, config)

      expect(result.bubbles[0].label).toBe('Point A')
    })

    it('should generate unique IDs for bubbles', () => {
      const rows = [
        { xCol: 10, yCol: 20, sizeCol: 30 },
        { xCol: 15, yCol: 25, sizeCol: 35 }
      ]
      const result = buildBubbleChartData(rows, baseConfig)

      const ids = result.bubbles.map(b => b.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should parse string numbers', () => {
      const rows = [{ xCol: '10', yCol: '20', sizeCol: '30' }]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.bubbles[0].x).toBe(10)
      expect(result.bubbles[0].y).toBe(20)
      expect(result.bubbles[0].size).toBe(30)
    })

    it('should handle invalid numbers as 0', () => {
      const rows = [{ xCol: 'invalid', yCol: 'text', sizeCol: 'NaN' }]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.bubbles[0].x).toBe(0)
      expect(result.bubbles[0].y).toBe(0)
      expect(result.bubbles[0].size).toBe(0)
    })

    it('should include config in result', () => {
      const rows = [{ xCol: 10, yCol: 20, sizeCol: 30 }]
      const result = buildBubbleChartData(rows, baseConfig)

      expect(result.config).toEqual(baseConfig)
    })
  })

  describe('BubbleChartMetadata', () => {
    it('should have correct type', () => {
      expect(BubbleChartMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(BubbleChartMetadata.language).toBe('bubble')
    })

    it('should have display name', () => {
      expect(BubbleChartMetadata.displayName).toBe('Bubble Chart')
    })

    it('should have description', () => {
      expect(BubbleChartMetadata.description).toContain('bubble')
    })

    it('should have required props defined', () => {
      const propNames = BubbleChartMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('x')
      expect(propNames).toContain('y')
      expect(propNames).toContain('size')
    })

    it('should have optional props', () => {
      const propNames = BubbleChartMetadata.props.map(p => p.name)
      expect(propNames).toContain('label')
      expect(propNames).toContain('group')
      expect(propNames).toContain('color')
    })

    it('should have examples', () => {
      expect(BubbleChartMetadata.examples).toBeDefined()
      expect(BubbleChartMetadata.examples!.length).toBeGreaterThan(0)
    })

    it('should have category as correlation', () => {
      expect(BubbleChartMetadata.category).toBe('correlation')
    })

    it('should have appropriate tags', () => {
      expect(BubbleChartMetadata.tags).toContain('bubble')
      expect(BubbleChartMetadata.tags).toContain('scatter')
    })

    it('should have icon', () => {
      expect(BubbleChartMetadata.icon).toBeDefined()
    })
  })

  describe('bubbleChartRegistration', () => {
    it('should have metadata', () => {
      expect(bubbleChartRegistration.metadata).toBeDefined()
      expect(bubbleChartRegistration.metadata.displayName).toBe('Bubble Chart')
    })

    it('should have correct language', () => {
      expect(bubbleChartRegistration.metadata.language).toBe('bubble')
    })

    it('should have description', () => {
      expect(bubbleChartRegistration.metadata.description).toContain('bubble')
    })

    it('should have tags', () => {
      expect(bubbleChartRegistration.metadata.tags).toContain('bubble')
      expect(bubbleChartRegistration.metadata.tags).toContain('scatter')
    })

    it('should have component reference', () => {
      expect(bubbleChartRegistration.component).toBeDefined()
    })
  })
})
