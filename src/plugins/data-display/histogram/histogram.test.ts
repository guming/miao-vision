/**
 * Histogram Component Tests
 *
 * Tests for binning algorithm, statistics, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  histogramRegistration,
  formatValue,
  createBins,
  calculateStats
} from './definition'
import { HistogramMetadata } from './metadata'
import { HistogramSchema } from './schema'

describe('Histogram Component', () => {
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

  describe('createBins', () => {
    it('should return empty array for empty input', () => {
      const bins = createBins([], 10)
      expect(bins).toEqual([])
    })

    it('should return empty array for zero bins', () => {
      const bins = createBins([1, 2, 3], 0)
      expect(bins).toEqual([])
    })

    it('should create correct number of bins', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const bins = createBins(values, 5)
      expect(bins.length).toBe(5)
    })

    it('should count values in bins correctly', () => {
      const values = [1, 2, 3, 4, 5]
      const bins = createBins(values, 5)
      const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0)
      expect(totalCount).toBe(5)
    })

    it('should handle single value', () => {
      const values = [5]
      const bins = createBins(values, 10)
      expect(bins.length).toBe(1)
      expect(bins[0].count).toBe(1)
    })

    it('should handle identical values', () => {
      const values = [5, 5, 5, 5, 5]
      const bins = createBins(values, 10)
      expect(bins.length).toBe(1)
      expect(bins[0].count).toBe(5)
    })

    it('should set min and max values correctly', () => {
      const values = [0, 10, 20, 30, 40, 50]
      const bins = createBins(values, 5)
      expect(bins[0].min).toBe(0)
      expect(bins[bins.length - 1].max).toBe(50)
    })

    it('should calculate percentages correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const bins = createBins(values, 2)
      const totalPercent = bins.reduce((sum, bin) => sum + bin.percent, 0)
      expect(totalPercent).toBeCloseTo(100, 1)
    })

    it('should set heightPercent based on max count', () => {
      const values = [1, 1, 1, 2, 2, 3]
      const bins = createBins(values, 3)
      const maxHeightBin = bins.find(b => b.heightPercent === 100)
      expect(maxHeightBin).toBeDefined()
    })

    it('should create labels with formatted values', () => {
      const values = [100, 200, 300]
      const bins = createBins(values, 2, 'currency', '$')
      expect(bins[0].label).toContain('$')
    })

    it('should handle large datasets', () => {
      const values = Array.from({ length: 1000 }, () => Math.random() * 100)
      const bins = createBins(values, 20)
      expect(bins.length).toBe(20)
      const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0)
      expect(totalCount).toBe(1000)
    })

    it('should handle negative values', () => {
      const values = [-10, -5, 0, 5, 10]
      const bins = createBins(values, 4)
      expect(bins.length).toBe(4)
      expect(bins[0].min).toBe(-10)
    })
  })

  describe('calculateStats', () => {
    it('should return zeros for empty array', () => {
      const stats = calculateStats([])
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(0)
      expect(stats.mean).toBe(0)
      expect(stats.median).toBe(0)
      expect(stats.stdDev).toBe(0)
    })

    it('should calculate min correctly', () => {
      const stats = calculateStats([5, 2, 8, 1, 9])
      expect(stats.min).toBe(1)
    })

    it('should calculate max correctly', () => {
      const stats = calculateStats([5, 2, 8, 1, 9])
      expect(stats.max).toBe(9)
    })

    it('should calculate mean correctly', () => {
      const stats = calculateStats([2, 4, 6, 8, 10])
      expect(stats.mean).toBe(6)
    })

    it('should calculate median correctly for odd count', () => {
      const stats = calculateStats([1, 2, 3, 4, 5])
      expect(stats.median).toBe(3)
    })

    it('should calculate median correctly for even count', () => {
      const stats = calculateStats([1, 2, 3, 4])
      expect(stats.median).toBe(2.5)
    })

    it('should calculate standard deviation correctly', () => {
      const stats = calculateStats([2, 4, 4, 4, 5, 5, 7, 9])
      expect(stats.stdDev).toBeCloseTo(2, 0)
    })

    it('should handle single value', () => {
      const stats = calculateStats([5])
      expect(stats.min).toBe(5)
      expect(stats.max).toBe(5)
      expect(stats.mean).toBe(5)
      expect(stats.median).toBe(5)
      expect(stats.stdDev).toBe(0)
    })
  })

  describe('HistogramMetadata', () => {
    it('should have correct type', () => {
      expect(HistogramMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(HistogramMetadata.language).toBe('histogram')
    })

    it('should have display name', () => {
      expect(HistogramMetadata.displayName).toBe('Histogram')
    })

    it('should have description', () => {
      expect(HistogramMetadata.description).toContain('distribution')
    })

    it('should have required props defined', () => {
      const propNames = HistogramMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('valueColumn')
    })

    it('should have examples', () => {
      expect(HistogramMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(HistogramMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(HistogramMetadata.tags).toContain('histogram')
      expect(HistogramMetadata.tags).toContain('distribution')
    })
  })

  describe('HistogramSchema', () => {
    it('should have data field as required', () => {
      const dataField = HistogramSchema.fields.find(f => f.name === 'data')
      expect(dataField).toBeDefined()
      expect(dataField?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = HistogramSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have bins with default', () => {
      const field = HistogramSchema.fields.find(f => f.name === 'bins')
      expect(field).toBeDefined()
      expect(field?.default).toBe(10)
    })

    it('should have height with default', () => {
      const field = HistogramSchema.fields.find(f => f.name === 'height')
      expect(field).toBeDefined()
      expect(field?.default).toBe(300)
    })

    it('should have color with default', () => {
      const field = HistogramSchema.fields.find(f => f.name === 'color')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#3B82F6')
    })

    it('should have valueFormat enum', () => {
      const field = HistogramSchema.fields.find(f => f.name === 'valueFormat')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('number')
      expect(field?.enum).toContain('currency')
      expect(field?.enum).toContain('percent')
    })

    it('should have showLabels with default', () => {
      const field = HistogramSchema.fields.find(f => f.name === 'showLabels')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })
  })

  describe('histogramRegistration', () => {
    it('should have metadata', () => {
      expect(histogramRegistration.metadata).toBeDefined()
      expect(histogramRegistration.metadata.displayName).toBe('Histogram')
    })

    it('should have correct language', () => {
      expect(histogramRegistration.metadata.language).toBe('histogram')
    })

    it('should have description', () => {
      expect(histogramRegistration.metadata.description).toContain('distribution')
    })

    it('should have tags', () => {
      expect(histogramRegistration.metadata.tags).toContain('histogram')
      expect(histogramRegistration.metadata.tags).toContain('bins')
    })

    it('should have parser function', () => {
      expect(typeof histogramRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof histogramRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(histogramRegistration.component).toBeDefined()
    })
  })
})
