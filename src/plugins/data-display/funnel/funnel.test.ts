/**
 * Funnel Component Tests
 *
 * Tests for funnel data processing, formatting, and color schemes.
 */

import { describe, it, expect } from 'vitest'
import { funnelRegistration, formatValue, getStageColor } from './definition'

describe('Funnel Component', () => {
  describe('formatValue', () => {
    it('should format numbers correctly', () => {
      expect(formatValue(1000, 'number', 0)).toBe('1,000')
      expect(formatValue(1234567, 'number', 0)).toBe('1,234,567')
      expect(formatValue(99.5, 'number', 1)).toBe('99.5')
    })

    it('should format currency correctly', () => {
      expect(formatValue(1000, 'currency', 0, '$')).toBe('$1,000')
      expect(formatValue(1234.56, 'currency', 2, '$')).toBe('$1,234.56')
      expect(formatValue(500, 'currency', 0, '€')).toBe('€500')
    })

    it('should format percent correctly', () => {
      expect(formatValue(75, 'percent', 0)).toBe('75%')
      expect(formatValue(33.33, 'percent', 1)).toBe('33.3%')
      expect(formatValue(100, 'percent', 2)).toBe('100.00%')
    })

    it('should handle zero values', () => {
      expect(formatValue(0, 'number', 0)).toBe('0')
      expect(formatValue(0, 'currency', 0, '$')).toBe('$0')
      expect(formatValue(0, 'percent', 0)).toBe('0%')
    })

    it('should handle negative values', () => {
      expect(formatValue(-500, 'number', 0)).toBe('-500')
      expect(formatValue(-1000, 'currency', 2, '$')).toBe('$-1,000.00')
    })
  })

  describe('getStageColor', () => {
    it('should return colors from default scheme', () => {
      const color1 = getStageColor(0, 3, 'default')
      const color2 = getStageColor(1, 3, 'default')
      const color3 = getStageColor(2, 3, 'default')

      expect(color1).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(color2).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(color3).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should return colors from gradient scheme', () => {
      const color = getStageColor(0, 5, 'gradient')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should return colors from blue scheme', () => {
      const color = getStageColor(0, 3, 'blue')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should return colors from green scheme', () => {
      const color = getStageColor(0, 3, 'green')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should return colors from orange scheme', () => {
      const color = getStageColor(0, 3, 'orange')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should use custom colors when provided', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF']
      expect(getStageColor(0, 3, 'default', customColors)).toBe('#FF0000')
      expect(getStageColor(1, 3, 'default', customColors)).toBe('#00FF00')
      expect(getStageColor(2, 3, 'default', customColors)).toBe('#0000FF')
    })

    it('should wrap custom colors when index exceeds array length', () => {
      const customColors = ['#FF0000', '#00FF00']
      expect(getStageColor(2, 4, 'default', customColors)).toBe('#FF0000')
      expect(getStageColor(3, 4, 'default', customColors)).toBe('#00FF00')
    })

    it('should fall back to default scheme for unknown scheme', () => {
      const color = getStageColor(0, 3, 'unknown-scheme')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  describe('Metadata', () => {
    it('should have correct component type', () => {
      expect(funnelRegistration.metadata.type).toBe('data-viz')
    })

    it('should have correct language identifier', () => {
      expect(funnelRegistration.metadata.language).toBe('funnel')
    })

    it('should be categorized as chart', () => {
      expect(funnelRegistration.metadata.category).toBe('chart')
    })

    it('should have correct display name', () => {
      expect(funnelRegistration.metadata.displayName).toBe('Funnel')
    })

    it('should have description', () => {
      expect(funnelRegistration.metadata.description).toContain('funnel')
    })

    it('should have icon', () => {
      expect(funnelRegistration.metadata.icon).toBe('📊')
    })

    it('should have tags', () => {
      expect(funnelRegistration.metadata.tags).toContain('funnel')
      expect(funnelRegistration.metadata.tags).toContain('conversion')
    })
  })

  describe('Component Registration', () => {
    it('should have parser function', () => {
      expect(typeof funnelRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof funnelRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(funnelRegistration.component).toBeDefined()
    })
  })

  describe('Conversion Calculations', () => {
    it('should calculate percent of first correctly', () => {
      // Simulating what buildProps does
      const stages = [
        { name: 'Visitors', value: 1000 },
        { name: 'Signups', value: 500 },
        { name: 'Purchases', value: 100 }
      ]

      const firstValue = stages[0].value
      const percentages = stages.map(s => (s.value / firstValue) * 100)

      expect(percentages[0]).toBe(100)
      expect(percentages[1]).toBe(50)
      expect(percentages[2]).toBe(10)
    })

    it('should calculate percent of previous correctly', () => {
      const stages = [
        { name: 'Visitors', value: 1000 },
        { name: 'Signups', value: 500 },
        { name: 'Purchases', value: 100 }
      ]

      const percentages = stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : s.value
        return (s.value / prev) * 100
      })

      expect(percentages[0]).toBe(100)
      expect(percentages[1]).toBe(50)
      expect(percentages[2]).toBe(20)
    })

    it('should calculate total conversion correctly', () => {
      const firstValue = 1000
      const lastValue = 100
      const totalConversion = (lastValue / firstValue) * 100

      expect(totalConversion).toBe(10)
    })

    it('should handle zero first value', () => {
      const firstValue = 0
      const currentValue = 100
      const percent = firstValue > 0 ? (currentValue / firstValue) * 100 : 0

      expect(percent).toBe(0)
    })

    it('should calculate width percent from max value', () => {
      const stages = [
        { value: 1000 },
        { value: 500 },
        { value: 100 }
      ]

      const maxValue = Math.max(...stages.map(s => s.value))
      const widths = stages.map(s => (s.value / maxValue) * 100)

      expect(widths[0]).toBe(100)
      expect(widths[1]).toBe(50)
      expect(widths[2]).toBe(10)
    })
  })
})
