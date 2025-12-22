/**
 * Heatmap Component Tests
 *
 * Tests for color interpolation, cell building, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  heatmapRegistration,
  hexToRgb,
  rgbToHex,
  interpolateColor,
  getColorForValue,
  formatValue,
  normalizeValue,
  buildHeatmapCells
} from './definition'
import { HeatmapMetadata } from './metadata'
import { HeatmapSchema } from './schema'
import type { HeatmapConfig } from './types'

describe('Heatmap Component', () => {
  describe('hexToRgb', () => {
    it('should parse hex colors correctly', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
    })

    it('should handle hex without hash', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should handle black and white', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should return black for invalid hex', () => {
      expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 })
    })
  })

  describe('rgbToHex', () => {
    it('should convert RGB to hex correctly', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
    })

    it('should handle black and white', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    })

    it('should clamp values', () => {
      expect(rgbToHex(-10, 300, 128)).toBe('#00ff80')
    })
  })

  describe('interpolateColor', () => {
    it('should return first color at t=0', () => {
      expect(interpolateColor('#ff0000', '#0000ff', 0)).toBe('#ff0000')
    })

    it('should return second color at t=1', () => {
      expect(interpolateColor('#ff0000', '#0000ff', 1)).toBe('#0000ff')
    })

    it('should interpolate at midpoint', () => {
      expect(interpolateColor('#000000', '#ffffff', 0.5)).toBe('#808080')
    })

    it('should handle same colors', () => {
      expect(interpolateColor('#abcdef', '#abcdef', 0.5)).toBe('#abcdef')
    })
  })

  describe('getColorForValue', () => {
    it('should return min color for value 0', () => {
      expect(getColorForValue(0, '#ffffff', '#000000')).toBe('#ffffff')
    })

    it('should return max color for value 1', () => {
      expect(getColorForValue(1, '#ffffff', '#000000')).toBe('#000000')
    })

    it('should interpolate without midColor', () => {
      const result = getColorForValue(0.5, '#000000', '#ffffff')
      expect(result).toBe('#808080')
    })

    it('should use midColor for diverging gradient', () => {
      // At 0.5, should return midColor
      const result = getColorForValue(0.5, '#ff0000', '#0000ff', '#ffffff')
      expect(result).toBe('#ffffff')
    })

    it('should interpolate first half with midColor', () => {
      // At 0.25, should be halfway between min and mid
      const result = getColorForValue(0.25, '#000000', '#ffffff', '#808080')
      expect(result).toBe('#404040')
    })

    it('should interpolate second half with midColor', () => {
      // At 0.75, should be halfway between mid and max
      const result = getColorForValue(0.75, '#000000', '#ffffff', '#808080')
      expect(result).toBe('#c0c0c0')
    })
  })

  describe('formatValue', () => {
    it('should format numbers correctly', () => {
      expect(formatValue(1000, 'number', '$', 0)).toBe('1,000')
    })

    it('should format currency correctly', () => {
      expect(formatValue(1000, 'currency', '$', 2)).toBe('$1,000.00')
      expect(formatValue(500, 'currency', '€', 1)).toBe('€500.0')
    })

    it('should format percent correctly', () => {
      expect(formatValue(75.5, 'percent', '$', 1)).toBe('75.5%')
      expect(formatValue(33.33, 'percent', '$', 2)).toBe('33.33%')
    })

    it('should handle decimal places', () => {
      expect(formatValue(1.2345, 'number', '$', 2)).toBe('1.23')
      expect(formatValue(1.2345, 'number', '$', 0)).toBe('1')
    })
  })

  describe('normalizeValue', () => {
    it('should normalize to 0-1 range', () => {
      expect(normalizeValue(50, 0, 100)).toBe(0.5)
      expect(normalizeValue(0, 0, 100)).toBe(0)
      expect(normalizeValue(100, 0, 100)).toBe(1)
    })

    it('should handle non-zero minimum', () => {
      expect(normalizeValue(75, 50, 100)).toBe(0.5)
      expect(normalizeValue(50, 50, 100)).toBe(0)
    })

    it('should clamp to 0-1', () => {
      expect(normalizeValue(-10, 0, 100)).toBe(0)
      expect(normalizeValue(150, 0, 100)).toBe(1)
    })

    it('should return 0.5 when min equals max', () => {
      expect(normalizeValue(50, 50, 50)).toBe(0.5)
    })
  })

  describe('buildHeatmapCells', () => {
    const baseConfig: HeatmapConfig = {
      data: 'test',
      xColumn: 'x',
      yColumn: 'y',
      valueColumn: 'value'
    }

    it('should build correct number of cells', () => {
      const items = [
        { xLabel: 'A', yLabel: 'X', value: 10 },
        { xLabel: 'B', yLabel: 'X', value: 20 },
        { xLabel: 'A', yLabel: 'Y', value: 30 },
        { xLabel: 'B', yLabel: 'Y', value: 40 }
      ]
      const cells = buildHeatmapCells(items, ['A', 'B'], ['X', 'Y'], baseConfig, 10, 40)
      expect(cells).toHaveLength(4)
    })

    it('should assign correct positions', () => {
      const items = [
        { xLabel: 'A', yLabel: 'X', value: 10 },
        { xLabel: 'B', yLabel: 'Y', value: 20 }
      ]
      const cells = buildHeatmapCells(items, ['A', 'B'], ['X', 'Y'], baseConfig, 10, 20)

      const cellAX = cells.find(c => c.xLabel === 'A' && c.yLabel === 'X')
      expect(cellAX?.row).toBe(0)
      expect(cellAX?.col).toBe(0)

      const cellBY = cells.find(c => c.xLabel === 'B' && c.yLabel === 'Y')
      expect(cellBY?.row).toBe(1)
      expect(cellBY?.col).toBe(1)
    })

    it('should preserve values', () => {
      const items = [{ xLabel: 'A', yLabel: 'X', value: 42 }]
      const cells = buildHeatmapCells(items, ['A'], ['X'], baseConfig, 0, 100)
      expect(cells[0].value).toBe(42)
    })

    it('should normalize values correctly', () => {
      const items = [
        { xLabel: 'A', yLabel: 'X', value: 0 },
        { xLabel: 'B', yLabel: 'X', value: 100 }
      ]
      const cells = buildHeatmapCells(items, ['A', 'B'], ['X'], baseConfig, 0, 100)

      const cellA = cells.find(c => c.xLabel === 'A')
      const cellB = cells.find(c => c.xLabel === 'B')
      expect(cellA?.normalizedValue).toBe(0)
      expect(cellB?.normalizedValue).toBe(1)
    })

    it('should assign colors based on value', () => {
      const config: HeatmapConfig = {
        ...baseConfig,
        minColor: '#ffffff',
        maxColor: '#000000'
      }
      const items = [
        { xLabel: 'A', yLabel: 'X', value: 0 },
        { xLabel: 'B', yLabel: 'X', value: 100 }
      ]
      const cells = buildHeatmapCells(items, ['A', 'B'], ['X'], config, 0, 100)

      const cellA = cells.find(c => c.xLabel === 'A')
      const cellB = cells.find(c => c.xLabel === 'B')
      expect(cellA?.color).toBe('#ffffff')
      expect(cellB?.color).toBe('#000000')
    })

    it('should format values according to config', () => {
      const config: HeatmapConfig = {
        ...baseConfig,
        valueFormat: 'percent',
        decimals: 0
      }
      const items = [{ xLabel: 'A', yLabel: 'X', value: 75 }]
      const cells = buildHeatmapCells(items, ['A'], ['X'], config, 0, 100)
      expect(cells[0].formattedValue).toBe('75%')
    })

    it('should generate unique ids', () => {
      const items = [
        { xLabel: 'A', yLabel: 'X', value: 10 },
        { xLabel: 'B', yLabel: 'X', value: 20 },
        { xLabel: 'A', yLabel: 'Y', value: 30 }
      ]
      const cells = buildHeatmapCells(items, ['A', 'B'], ['X', 'Y'], baseConfig, 10, 30)
      const ids = cells.map(c => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should handle missing combinations', () => {
      const items = [{ xLabel: 'A', yLabel: 'X', value: 50 }]
      const cells = buildHeatmapCells(items, ['A', 'B'], ['X', 'Y'], baseConfig, 0, 100)

      // Should have cells for all combinations
      expect(cells).toHaveLength(4)

      // Missing values should default to 0
      const cellBY = cells.find(c => c.xLabel === 'B' && c.yLabel === 'Y')
      expect(cellBY?.value).toBe(0)
    })
  })

  describe('HeatmapMetadata', () => {
    it('should have correct type', () => {
      expect(HeatmapMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(HeatmapMetadata.language).toBe('heatmap')
    })

    it('should have display name', () => {
      expect(HeatmapMetadata.displayName).toBe('Heatmap')
    })

    it('should have description', () => {
      expect(HeatmapMetadata.description).toContain('matrix')
    })

    it('should have required props defined', () => {
      const propNames = HeatmapMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('xColumn')
      expect(propNames).toContain('yColumn')
      expect(propNames).toContain('valueColumn')
    })

    it('should have optional color props', () => {
      const propNames = HeatmapMetadata.props.map(p => p.name)
      expect(propNames).toContain('minColor')
      expect(propNames).toContain('maxColor')
      expect(propNames).toContain('midColor')
    })

    it('should have examples', () => {
      expect(HeatmapMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(HeatmapMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(HeatmapMetadata.tags).toContain('heatmap')
      expect(HeatmapMetadata.tags).toContain('matrix')
    })

    it('should have icon', () => {
      expect(HeatmapMetadata.icon).toBeDefined()
    })
  })

  describe('HeatmapSchema', () => {
    it('should have data field as required', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'data')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have xColumn as required', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'xColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have yColumn as required', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'yColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have cellWidth with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'cellWidth')
      expect(field).toBeDefined()
      expect(field?.default).toBe(40)
    })

    it('should have cellHeight with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'cellHeight')
      expect(field).toBeDefined()
      expect(field?.default).toBe(40)
    })

    it('should have minColor with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'minColor')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#f0f9ff')
    })

    it('should have maxColor with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'maxColor')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#1e40af')
    })

    it('should have showValues with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'showValues')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have showLegend with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'showLegend')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have roundedCorners with default', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'roundedCorners')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have valueFormat enum', () => {
      const field = HeatmapSchema.fields.find(f => f.name === 'valueFormat')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('number')
      expect(field?.enum).toContain('currency')
      expect(field?.enum).toContain('percent')
    })
  })

  describe('heatmapRegistration', () => {
    it('should have metadata', () => {
      expect(heatmapRegistration.metadata).toBeDefined()
      expect(heatmapRegistration.metadata.displayName).toBe('Heatmap')
    })

    it('should have correct language', () => {
      expect(heatmapRegistration.metadata.language).toBe('heatmap')
    })

    it('should have description', () => {
      expect(heatmapRegistration.metadata.description).toContain('matrix')
    })

    it('should have tags', () => {
      expect(heatmapRegistration.metadata.tags).toContain('heatmap')
      expect(heatmapRegistration.metadata.tags).toContain('correlation')
    })

    it('should have parser function', () => {
      expect(typeof heatmapRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof heatmapRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(heatmapRegistration.component).toBeDefined()
    })
  })
})
