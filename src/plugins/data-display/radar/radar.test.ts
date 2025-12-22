/**
 * Radar Chart Component Tests
 *
 * Tests for axis/grid building, series calculations, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  radarRegistration,
  formatValue,
  calculateAxisAngle,
  polarToCartesian,
  buildAxes,
  buildGridLevels,
  normalizeValue,
  buildSeries
} from './definition'
import { RadarMetadata } from './metadata'
import { RadarSchema } from './schema'
import type { RadarAxis } from './types'

describe('Radar Component', () => {
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

    it('should use default currency symbol', () => {
      expect(formatValue(100, 'currency')).toBe('$100')
    })
  })

  describe('calculateAxisAngle', () => {
    it('should start from top (-90 degrees)', () => {
      const angle = calculateAxisAngle(0, 4)
      expect(angle).toBeCloseTo(-Math.PI / 2)
    })

    it('should distribute evenly around circle', () => {
      const angles = [0, 1, 2, 3].map(i => calculateAxisAngle(i, 4))
      // 4 axes should be 90 degrees apart
      expect(angles[1] - angles[0]).toBeCloseTo(Math.PI / 2)
      expect(angles[2] - angles[1]).toBeCloseTo(Math.PI / 2)
      expect(angles[3] - angles[2]).toBeCloseTo(Math.PI / 2)
    })

    it('should handle different axis counts', () => {
      const angles3 = [0, 1, 2].map(i => calculateAxisAngle(i, 3))
      const step = (Math.PI * 2) / 3
      expect(angles3[1] - angles3[0]).toBeCloseTo(step)
      expect(angles3[2] - angles3[1]).toBeCloseTo(step)
    })
  })

  describe('polarToCartesian', () => {
    it('should convert 0 angle to right', () => {
      const pos = polarToCartesian(0, 100)
      expect(pos.x).toBeCloseTo(100)
      expect(pos.y).toBeCloseTo(0)
    })

    it('should convert 90 degrees to bottom', () => {
      const pos = polarToCartesian(Math.PI / 2, 100)
      expect(pos.x).toBeCloseTo(0)
      expect(pos.y).toBeCloseTo(100)
    })

    it('should convert 180 degrees to left', () => {
      const pos = polarToCartesian(Math.PI, 100)
      expect(pos.x).toBeCloseTo(-100)
      expect(pos.y).toBeCloseTo(0)
    })

    it('should convert -90 degrees to top', () => {
      const pos = polarToCartesian(-Math.PI / 2, 100)
      expect(pos.x).toBeCloseTo(0)
      expect(pos.y).toBeCloseTo(-100)
    })

    it('should handle zero radius', () => {
      const pos = polarToCartesian(Math.PI / 4, 0)
      expect(pos.x).toBe(0)
      expect(pos.y).toBe(0)
    })
  })

  describe('buildAxes', () => {
    it('should build correct number of axes', () => {
      const axes = buildAxes(['A', 'B', 'C'], 100)
      expect(axes).toHaveLength(3)
    })

    it('should assign labels correctly', () => {
      const axes = buildAxes(['Speed', 'Power', 'Agility'], 100)
      expect(axes[0].label).toBe('Speed')
      expect(axes[1].label).toBe('Power')
      expect(axes[2].label).toBe('Agility')
    })

    it('should generate unique ids', () => {
      const axes = buildAxes(['A', 'B', 'C', 'D'], 100)
      const ids = axes.map(a => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should position first axis at top', () => {
      const axes = buildAxes(['Top'], 100)
      // Label should be above center (negative y)
      expect(axes[0].labelY).toBeLessThan(0)
      expect(axes[0].labelX).toBeCloseTo(0, 0)
    })

    it('should set correct text anchors', () => {
      const axes = buildAxes(['Top', 'Right', 'Bottom', 'Left'], 100)
      // Top should be middle
      expect(axes[0].anchor).toBe('middle')
      // Right should be start
      expect(axes[1].anchor).toBe('start')
      // Bottom should be middle
      expect(axes[2].anchor).toBe('middle')
      // Left should be end
      expect(axes[3].anchor).toBe('end')
    })
  })

  describe('buildGridLevels', () => {
    const axes: RadarAxis[] = [
      { id: 'a1', label: 'A', angle: -Math.PI / 2, labelX: 0, labelY: -100, anchor: 'middle' },
      { id: 'a2', label: 'B', angle: Math.PI / 6, labelX: 86.6, labelY: 50, anchor: 'start' },
      { id: 'a3', label: 'C', angle: 5 * Math.PI / 6, labelX: -86.6, labelY: 50, anchor: 'end' }
    ]

    it('should build correct number of levels', () => {
      const levels = buildGridLevels(axes, 5, 100, 0, 100, 'number', '$')
      expect(levels).toHaveLength(5)
    })

    it('should have increasing radii', () => {
      const levels = buildGridLevels(axes, 4, 100, 0, 100, 'number', '$')
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].radius).toBeGreaterThan(levels[i - 1].radius)
      }
    })

    it('should have increasing values', () => {
      const levels = buildGridLevels(axes, 4, 100, 0, 200, 'number', '$')
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].value).toBeGreaterThan(levels[i - 1].value)
      }
    })

    it('should format values correctly', () => {
      const levels = buildGridLevels(axes, 2, 100, 0, 100, 'currency', '€')
      expect(levels[0].formattedValue).toContain('€')
    })

    it('should generate valid SVG paths', () => {
      const levels = buildGridLevels(axes, 3, 100, 0, 100, 'number', '$')
      for (const level of levels) {
        expect(level.path).toMatch(/^M .* Z$/)
      }
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

    it('should return 0 when min equals max', () => {
      expect(normalizeValue(50, 50, 50)).toBe(0)
    })
  })

  describe('buildSeries', () => {
    const axes: RadarAxis[] = [
      { id: 'a1', label: 'A', angle: -Math.PI / 2, labelX: 0, labelY: -100, anchor: 'middle' },
      { id: 'a2', label: 'B', angle: Math.PI / 6, labelX: 86.6, labelY: 50, anchor: 'start' },
      { id: 'a3', label: 'C', angle: 5 * Math.PI / 6, labelX: -86.6, labelY: 50, anchor: 'end' }
    ]

    it('should build series with correct name', () => {
      const series = buildSeries('Test', [50, 50, 50], axes, 100, 0, 100, '#blue', 'number', '$', 0)
      expect(series.name).toBe('Test')
    })

    it('should build correct number of points', () => {
      const series = buildSeries('Test', [50, 75, 100], axes, 100, 0, 100, '#blue', 'number', '$', 0)
      expect(series.points).toHaveLength(3)
    })

    it('should preserve values in points', () => {
      const series = buildSeries('Test', [30, 60, 90], axes, 100, 0, 100, '#blue', 'number', '$', 0)
      expect(series.points[0].value).toBe(30)
      expect(series.points[1].value).toBe(60)
      expect(series.points[2].value).toBe(90)
    })

    it('should normalize values correctly', () => {
      const series = buildSeries('Test', [50, 100, 0], axes, 100, 0, 100, '#blue', 'number', '$', 0)
      expect(series.points[0].normalizedValue).toBe(0.5)
      expect(series.points[1].normalizedValue).toBe(1)
      expect(series.points[2].normalizedValue).toBe(0)
    })

    it('should assign color', () => {
      const series = buildSeries('Test', [50], axes.slice(0, 1), 100, 0, 100, '#ff0000', 'number', '$', 0)
      expect(series.color).toBe('#ff0000')
    })

    it('should generate unique ids', () => {
      const s1 = buildSeries('A', [50], axes.slice(0, 1), 100, 0, 100, '#blue', 'number', '$', 0)
      const s2 = buildSeries('B', [50], axes.slice(0, 1), 100, 0, 100, '#red', 'number', '$', 1)
      expect(s1.id).not.toBe(s2.id)
    })

    it('should format values', () => {
      const series = buildSeries('Test', [1000], axes.slice(0, 1), 100, 0, 2000, '#blue', 'currency', '€', 0)
      expect(series.points[0].formattedValue).toBe('€1,000')
    })

    it('should generate valid SVG path', () => {
      const series = buildSeries('Test', [50, 75, 100], axes, 100, 0, 100, '#blue', 'number', '$', 0)
      expect(series.path).toMatch(/^M .* Z$/)
    })

    it('should handle missing values', () => {
      const series = buildSeries('Test', [50], axes, 100, 0, 100, '#blue', 'number', '$', 0)
      // Missing values should default to 0
      expect(series.points[1].value).toBe(0)
      expect(series.points[2].value).toBe(0)
    })
  })

  describe('RadarMetadata', () => {
    it('should have correct type', () => {
      expect(RadarMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(RadarMetadata.language).toBe('radar')
    })

    it('should have display name', () => {
      expect(RadarMetadata.displayName).toBe('Radar Chart')
    })

    it('should have description', () => {
      expect(RadarMetadata.description).toContain('multi-dimensional')
    })

    it('should have required props defined', () => {
      const propNames = RadarMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('labelColumn')
      expect(propNames).toContain('valueColumn')
    })

    it('should have optional seriesColumn', () => {
      const prop = RadarMetadata.props.find(p => p.name === 'seriesColumn')
      expect(prop).toBeDefined()
      expect(prop?.required).toBe(false)
    })

    it('should have examples', () => {
      expect(RadarMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(RadarMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(RadarMetadata.tags).toContain('radar')
      expect(RadarMetadata.tags).toContain('spider')
    })

    it('should have icon', () => {
      expect(RadarMetadata.icon).toBeDefined()
    })
  })

  describe('RadarSchema', () => {
    it('should have data field as required', () => {
      const field = RadarSchema.fields.find(f => f.name === 'data')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have labelColumn as required', () => {
      const field = RadarSchema.fields.find(f => f.name === 'labelColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = RadarSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have seriesColumn as optional', () => {
      const field = RadarSchema.fields.find(f => f.name === 'seriesColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBeFalsy()
    })

    it('should have height with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'height')
      expect(field).toBeDefined()
      expect(field?.default).toBe(400)
    })

    it('should have levels with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'levels')
      expect(field).toBeDefined()
      expect(field?.default).toBe(5)
    })

    it('should have fill with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'fill')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have fillOpacity with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'fillOpacity')
      expect(field).toBeDefined()
      expect(field?.default).toBe(0.2)
    })

    it('should have showDots with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'showDots')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have showLabels with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'showLabels')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have showGrid with default', () => {
      const field = RadarSchema.fields.find(f => f.name === 'showGrid')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have valueFormat enum', () => {
      const field = RadarSchema.fields.find(f => f.name === 'valueFormat')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('number')
      expect(field?.enum).toContain('currency')
      expect(field?.enum).toContain('percent')
    })
  })

  describe('radarRegistration', () => {
    it('should have metadata', () => {
      expect(radarRegistration.metadata).toBeDefined()
      expect(radarRegistration.metadata.displayName).toBe('Radar Chart')
    })

    it('should have correct language', () => {
      expect(radarRegistration.metadata.language).toBe('radar')
    })

    it('should have description', () => {
      expect(radarRegistration.metadata.description).toContain('multi-dimensional')
    })

    it('should have tags', () => {
      expect(radarRegistration.metadata.tags).toContain('radar')
      expect(radarRegistration.metadata.tags).toContain('comparison')
    })

    it('should have parser function', () => {
      expect(typeof radarRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof radarRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(radarRegistration.component).toBeDefined()
    })
  })
})
