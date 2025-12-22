/**
 * BoxPlot Component Tests
 *
 * Tests for statistics calculation, quartiles, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  boxPlotRegistration,
  formatValue,
  percentile,
  calculateBoxStats
} from './definition'
import { BoxPlotMetadata } from './metadata'
import { BoxPlotSchema } from './schema'

describe('BoxPlot Component', () => {
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
  })

  describe('percentile', () => {
    it('should return 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0)
    })

    it('should return the value for single element', () => {
      expect(percentile([5], 50)).toBe(5)
      expect(percentile([5], 25)).toBe(5)
      expect(percentile([5], 75)).toBe(5)
    })

    it('should calculate median (50th percentile)', () => {
      const sorted = [1, 2, 3, 4, 5]
      expect(percentile(sorted, 50)).toBe(3)
    })

    it('should calculate 25th percentile (Q1)', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const q1 = percentile(sorted, 25)
      expect(q1).toBeCloseTo(3, 0)
    })

    it('should calculate 75th percentile (Q3)', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const q3 = percentile(sorted, 75)
      expect(q3).toBeCloseTo(7, 0)
    })

    it('should interpolate between values', () => {
      const sorted = [1, 2, 3, 4]
      const p50 = percentile(sorted, 50)
      expect(p50).toBe(2.5)
    })

    it('should handle 0th percentile (min)', () => {
      const sorted = [1, 2, 3, 4, 5]
      expect(percentile(sorted, 0)).toBe(1)
    })

    it('should handle 100th percentile (max)', () => {
      const sorted = [1, 2, 3, 4, 5]
      expect(percentile(sorted, 100)).toBe(5)
    })
  })

  describe('calculateBoxStats', () => {
    it('should return zeros for empty array', () => {
      const stats = calculateBoxStats('test', [])
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(0)
      expect(stats.median).toBe(0)
      expect(stats.count).toBe(0)
    })

    it('should handle single value', () => {
      const stats = calculateBoxStats('test', [5])
      expect(stats.min).toBe(5)
      expect(stats.max).toBe(5)
      expect(stats.median).toBe(5)
      expect(stats.q1).toBe(5)
      expect(stats.q3).toBe(5)
      expect(stats.mean).toBe(5)
      expect(stats.count).toBe(1)
    })

    it('should calculate quartiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const stats = calculateBoxStats('test', values)
      expect(stats.q1).toBeCloseTo(3, 0)
      expect(stats.median).toBe(5)
      expect(stats.q3).toBeCloseTo(7, 0)
    })

    it('should calculate IQR correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const stats = calculateBoxStats('test', values)
      expect(stats.iqr).toBeCloseTo(4, 0)
    })

    it('should calculate mean correctly', () => {
      const values = [2, 4, 6, 8, 10]
      const stats = calculateBoxStats('test', values)
      expect(stats.mean).toBe(6)
    })

    it('should identify lower outliers', () => {
      const values = [1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      const stats = calculateBoxStats('test', values, 1.5)
      expect(stats.lowerOutliers).toContain(1)
    })

    it('should identify upper outliers', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 50]
      const stats = calculateBoxStats('test', values, 1.5)
      expect(stats.upperOutliers).toContain(50)
    })

    it('should calculate fences correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const stats = calculateBoxStats('test', values, 1.5)
      expect(stats.lowerFence).toBe(stats.q1 - 1.5 * stats.iqr)
      expect(stats.upperFence).toBe(stats.q3 + 1.5 * stats.iqr)
    })

    it('should use custom outlier multiplier', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const stats1 = calculateBoxStats('test', values, 1.5)
      const stats2 = calculateBoxStats('test', values, 3.0)
      expect(stats2.upperFence).toBeGreaterThan(stats1.upperFence)
    })

    it('should set whiskers to non-outlier min/max', () => {
      const values = [1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100]
      const stats = calculateBoxStats('test', values, 1.5)
      expect(stats.min).toBeGreaterThan(1)
      expect(stats.max).toBeLessThan(100)
    })

    it('should preserve group name', () => {
      const stats = calculateBoxStats('Category A', [1, 2, 3])
      expect(stats.group).toBe('Category A')
    })

    it('should count values correctly', () => {
      const values = [1, 2, 3, 4, 5]
      const stats = calculateBoxStats('test', values)
      expect(stats.count).toBe(5)
    })
  })

  describe('BoxPlotMetadata', () => {
    it('should have correct type', () => {
      expect(BoxPlotMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(BoxPlotMetadata.language).toBe('boxplot')
    })

    it('should have display name', () => {
      expect(BoxPlotMetadata.displayName).toBe('Box Plot')
    })

    it('should have description', () => {
      expect(BoxPlotMetadata.description).toContain('quartiles')
    })

    it('should have required props defined', () => {
      const propNames = BoxPlotMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('valueColumn')
    })

    it('should have examples', () => {
      expect(BoxPlotMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(BoxPlotMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(BoxPlotMetadata.tags).toContain('boxplot')
      expect(BoxPlotMetadata.tags).toContain('statistics')
    })
  })

  describe('BoxPlotSchema', () => {
    it('should have data field as required', () => {
      const dataField = BoxPlotSchema.fields.find(f => f.name === 'data')
      expect(dataField).toBeDefined()
      expect(dataField?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = BoxPlotSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have height with default', () => {
      const field = BoxPlotSchema.fields.find(f => f.name === 'height')
      expect(field).toBeDefined()
      expect(field?.default).toBe(300)
    })

    it('should have color with default', () => {
      const field = BoxPlotSchema.fields.find(f => f.name === 'color')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#3B82F6')
    })

    it('should have showOutliers with default', () => {
      const field = BoxPlotSchema.fields.find(f => f.name === 'showOutliers')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have outlierMultiplier with default', () => {
      const field = BoxPlotSchema.fields.find(f => f.name === 'outlierMultiplier')
      expect(field).toBeDefined()
      expect(field?.default).toBe(1.5)
    })

    it('should have orientation enum', () => {
      const field = BoxPlotSchema.fields.find(f => f.name === 'orientation')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('vertical')
      expect(field?.enum).toContain('horizontal')
    })
  })

  describe('boxPlotRegistration', () => {
    it('should have metadata', () => {
      expect(boxPlotRegistration.metadata).toBeDefined()
      expect(boxPlotRegistration.metadata.displayName).toBe('Box Plot')
    })

    it('should have correct language', () => {
      expect(boxPlotRegistration.metadata.language).toBe('boxplot')
    })

    it('should have description', () => {
      expect(boxPlotRegistration.metadata.description).toContain('quartiles')
    })

    it('should have tags', () => {
      expect(boxPlotRegistration.metadata.tags).toContain('boxplot')
      expect(boxPlotRegistration.metadata.tags).toContain('outliers')
    })

    it('should have parser function', () => {
      expect(typeof boxPlotRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof boxPlotRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(boxPlotRegistration.component).toBeDefined()
    })
  })
})
