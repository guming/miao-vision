/**
 * Waterfall Chart Component Tests
 *
 * Tests for bar building, formatting, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  waterfallRegistration,
  formatValue,
  getBarColor,
  getBarType,
  buildWaterfallBars
} from './definition'
import { WaterfallMetadata } from './metadata'
import { WaterfallSchema } from './schema'
import type { WaterfallConfig } from './types'

describe('Waterfall Component', () => {
  describe('formatValue', () => {
    it('should format numbers with positive sign', () => {
      expect(formatValue(1000, 'number')).toBe('+1,000')
      expect(formatValue(1234, 'number')).toBe('+1,234')
    })

    it('should format numbers with negative sign', () => {
      expect(formatValue(-500, 'number')).toBe('-500')
      expect(formatValue(-1234, 'number')).toBe('-1,234')
    })

    it('should format zero without sign', () => {
      expect(formatValue(0, 'number')).toBe('0')
    })

    it('should format currency correctly', () => {
      expect(formatValue(1000, 'currency', '$')).toBe('+$1,000')
      expect(formatValue(-500, 'currency', '€')).toBe('-€500')
    })

    it('should format percent correctly', () => {
      expect(formatValue(75, 'percent')).toBe('+75.0%')
      expect(formatValue(-25.5, 'percent')).toBe('-25.5%')
    })

    it('should use default currency symbol', () => {
      expect(formatValue(100, 'currency')).toBe('+$100')
    })
  })

  describe('getBarColor', () => {
    it('should return positive color for increase', () => {
      expect(getBarColor('increase', '#green', '#red', '#blue')).toBe('#green')
    })

    it('should return negative color for decrease', () => {
      expect(getBarColor('decrease', '#green', '#red', '#blue')).toBe('#red')
    })

    it('should return total color for total', () => {
      expect(getBarColor('total', '#green', '#red', '#blue')).toBe('#blue')
    })
  })

  describe('getBarType', () => {
    it('should return total for isTotal true', () => {
      expect(getBarType(100, true)).toBe('total')
      expect(getBarType(-100, true)).toBe('total')
    })

    it('should return increase for positive values', () => {
      expect(getBarType(100, false)).toBe('increase')
      expect(getBarType(1, false)).toBe('increase')
    })

    it('should return decrease for negative values', () => {
      expect(getBarType(-100, false)).toBe('decrease')
      expect(getBarType(-1, false)).toBe('decrease')
    })

    it('should return increase for zero', () => {
      expect(getBarType(0, false)).toBe('increase')
    })
  })

  describe('buildWaterfallBars', () => {
    const baseConfig: WaterfallConfig = {
      data: 'test',
      labelColumn: 'label',
      valueColumn: 'value'
    }

    it('should build bars with cumulative positions', () => {
      const items = [
        { label: 'Start', value: 100, isTotal: false },
        { label: 'Add', value: 50, isTotal: false },
        { label: 'Subtract', value: -30, isTotal: false }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars).toHaveLength(3)
      expect(bars[0].start).toBe(0)
      expect(bars[0].end).toBe(100)
      expect(bars[1].start).toBe(100)
      expect(bars[1].end).toBe(150)
      expect(bars[2].start).toBe(150)
      expect(bars[2].end).toBe(120)
    })

    it('should handle total bars starting from 0', () => {
      const items = [
        { label: 'A', value: 100, isTotal: false },
        { label: 'B', value: 50, isTotal: false },
        { label: 'Total', value: 0, isTotal: true }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars[2].type).toBe('total')
      expect(bars[2].start).toBe(0)
      expect(bars[2].end).toBe(150) // cumulative
    })

    it('should assign correct types', () => {
      const items = [
        { label: 'Up', value: 100, isTotal: false },
        { label: 'Down', value: -50, isTotal: false },
        { label: 'Sum', value: 0, isTotal: true }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars[0].type).toBe('increase')
      expect(bars[1].type).toBe('decrease')
      expect(bars[2].type).toBe('total')
    })

    it('should use custom colors', () => {
      const config: WaterfallConfig = {
        ...baseConfig,
        positiveColor: '#custom-green',
        negativeColor: '#custom-red',
        totalColor: '#custom-blue'
      }

      const items = [
        { label: 'Up', value: 100, isTotal: false },
        { label: 'Down', value: -50, isTotal: false },
        { label: 'Sum', value: 0, isTotal: true }
      ]

      const bars = buildWaterfallBars(items, config)

      expect(bars[0].color).toBe('#custom-green')
      expect(bars[1].color).toBe('#custom-red')
      expect(bars[2].color).toBe('#custom-blue')
    })

    it('should use default colors', () => {
      const items = [
        { label: 'Up', value: 100, isTotal: false },
        { label: 'Down', value: -50, isTotal: false },
        { label: 'Sum', value: 0, isTotal: true }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars[0].color).toBe('#22c55e')
      expect(bars[1].color).toBe('#ef4444')
      expect(bars[2].color).toBe('#3b82f6')
    })

    it('should format values correctly', () => {
      const config: WaterfallConfig = {
        ...baseConfig,
        valueFormat: 'currency',
        currencySymbol: '€'
      }

      const items = [
        { label: 'Revenue', value: 1000, isTotal: false }
      ]

      const bars = buildWaterfallBars(items, config)

      expect(bars[0].formattedValue).toBe('+€1,000')
    })

    it('should generate unique ids', () => {
      const items = [
        { label: 'A', value: 100, isTotal: false },
        { label: 'B', value: 50, isTotal: false },
        { label: 'C', value: 25, isTotal: false }
      ]

      const bars = buildWaterfallBars(items, baseConfig)
      const ids = bars.map(b => b.id)

      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should preserve labels', () => {
      const items = [
        { label: 'First Item', value: 100, isTotal: false },
        { label: 'Second Item', value: -50, isTotal: false }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars[0].label).toBe('First Item')
      expect(bars[1].label).toBe('Second Item')
    })

    it('should preserve original values', () => {
      const items = [
        { label: 'A', value: 100, isTotal: false },
        { label: 'B', value: -50, isTotal: false }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars[0].value).toBe(100)
      expect(bars[1].value).toBe(-50)
    })

    it('should format total value as cumulative', () => {
      const items = [
        { label: 'A', value: 100, isTotal: false },
        { label: 'B', value: 50, isTotal: false },
        { label: 'Total', value: 0, isTotal: true }
      ]

      const bars = buildWaterfallBars(items, baseConfig)

      // Total should display cumulative (150), not original value (0)
      expect(bars[2].formattedValue).toBe('+150')
    })

    it('should handle empty array', () => {
      const bars = buildWaterfallBars([], baseConfig)
      expect(bars).toEqual([])
    })

    it('should handle single item', () => {
      const items = [{ label: 'Only', value: 100, isTotal: false }]
      const bars = buildWaterfallBars(items, baseConfig)

      expect(bars).toHaveLength(1)
      expect(bars[0].start).toBe(0)
      expect(bars[0].end).toBe(100)
    })
  })

  describe('WaterfallMetadata', () => {
    it('should have correct type', () => {
      expect(WaterfallMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(WaterfallMetadata.language).toBe('waterfall')
    })

    it('should have display name', () => {
      expect(WaterfallMetadata.displayName).toBe('Waterfall Chart')
    })

    it('should have description', () => {
      expect(WaterfallMetadata.description).toContain('incremental')
    })

    it('should have required props defined', () => {
      const propNames = WaterfallMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('labelColumn')
      expect(propNames).toContain('valueColumn')
    })

    it('should have optional totalColumn', () => {
      const prop = WaterfallMetadata.props.find(p => p.name === 'totalColumn')
      expect(prop).toBeDefined()
      expect(prop?.required).toBe(false)
    })

    it('should have examples', () => {
      expect(WaterfallMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(WaterfallMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(WaterfallMetadata.tags).toContain('waterfall')
      expect(WaterfallMetadata.tags).toContain('bridge')
    })

    it('should have icon', () => {
      expect(WaterfallMetadata.icon).toBeDefined()
    })
  })

  describe('WaterfallSchema', () => {
    it('should have data field as required', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'data')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have labelColumn as required', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'labelColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have totalColumn as optional', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'totalColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBeFalsy()
    })

    it('should have height with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'height')
      expect(field).toBeDefined()
      expect(field?.default).toBe(400)
    })

    it('should have positiveColor with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'positiveColor')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#22c55e')
    })

    it('should have negativeColor with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'negativeColor')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#ef4444')
    })

    it('should have totalColor with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'totalColor')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#3b82f6')
    })

    it('should have valueFormat enum', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'valueFormat')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('number')
      expect(field?.enum).toContain('currency')
      expect(field?.enum).toContain('percent')
    })

    it('should have orientation enum', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'orientation')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('vertical')
      expect(field?.enum).toContain('horizontal')
    })

    it('should have showLabels with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'showLabels')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have showConnectors with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'showConnectors')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have currencySymbol with default', () => {
      const field = WaterfallSchema.fields.find(f => f.name === 'currencySymbol')
      expect(field).toBeDefined()
      expect(field?.default).toBe('$')
    })
  })

  describe('waterfallRegistration', () => {
    it('should have metadata', () => {
      expect(waterfallRegistration.metadata).toBeDefined()
      expect(waterfallRegistration.metadata.displayName).toBe('Waterfall Chart')
    })

    it('should have correct language', () => {
      expect(waterfallRegistration.metadata.language).toBe('waterfall')
    })

    it('should have description', () => {
      expect(waterfallRegistration.metadata.description).toContain('incremental')
    })

    it('should have tags', () => {
      expect(waterfallRegistration.metadata.tags).toContain('waterfall')
      expect(waterfallRegistration.metadata.tags).toContain('financial')
    })

    it('should have parser function', () => {
      expect(typeof waterfallRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof waterfallRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(waterfallRegistration.component).toBeDefined()
    })
  })
})
