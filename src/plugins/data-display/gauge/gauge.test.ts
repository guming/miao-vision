/**
 * Gauge Component Tests
 *
 * Tests for percentage calculation, formatting, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  gaugeRegistration,
  formatValue,
  calculatePercent,
  getColorForValue
} from './definition'
import { GaugeMetadata } from './metadata'
import { GaugeSchema } from './schema'
import type { GaugeThreshold } from './types'

describe('Gauge Component', () => {
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
      expect(formatValue(75, 'percent')).toBe('75%')
      expect(formatValue(33.5, 'percent', '$', 1)).toBe('33.5%')
    })

    it('should handle zero values', () => {
      expect(formatValue(0, 'number')).toBe('0')
      expect(formatValue(0, 'currency', '$')).toBe('$0')
    })

    it('should respect decimal places', () => {
      expect(formatValue(75.567, 'number', '$', 2)).toBe('75.57')
      expect(formatValue(75.567, 'number', '$', 0)).toBe('76')
    })
  })

  describe('calculatePercent', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercent(50, 0, 100)).toBe(50)
      expect(calculatePercent(75, 0, 100)).toBe(75)
    })

    it('should handle min value', () => {
      expect(calculatePercent(0, 0, 100)).toBe(0)
    })

    it('should handle max value', () => {
      expect(calculatePercent(100, 0, 100)).toBe(100)
    })

    it('should clamp values below min', () => {
      expect(calculatePercent(-10, 0, 100)).toBe(0)
    })

    it('should clamp values above max', () => {
      expect(calculatePercent(150, 0, 100)).toBe(100)
    })

    it('should handle custom range', () => {
      expect(calculatePercent(50, 0, 200)).toBe(25)
      expect(calculatePercent(150, 100, 200)).toBe(50)
    })

    it('should handle negative ranges', () => {
      expect(calculatePercent(0, -100, 100)).toBe(50)
      expect(calculatePercent(-50, -100, 0)).toBe(50)
    })

    it('should return 0 when min equals max', () => {
      expect(calculatePercent(50, 50, 50)).toBe(0)
    })
  })

  describe('getColorForValue', () => {
    const thresholds: GaugeThreshold[] = [
      { value: 0, color: 'red' },
      { value: 50, color: 'yellow' },
      { value: 80, color: 'green' }
    ]

    it('should return default color when no thresholds', () => {
      expect(getColorForValue(50, undefined, 'blue')).toBe('blue')
      expect(getColorForValue(50, [], 'blue')).toBe('blue')
    })

    it('should return first threshold color for low values', () => {
      expect(getColorForValue(25, thresholds, 'blue')).toBe('red')
    })

    it('should return middle threshold color', () => {
      expect(getColorForValue(60, thresholds, 'blue')).toBe('yellow')
    })

    it('should return highest threshold color for high values', () => {
      expect(getColorForValue(90, thresholds, 'blue')).toBe('green')
    })

    it('should return exact threshold color', () => {
      expect(getColorForValue(50, thresholds, 'blue')).toBe('yellow')
      expect(getColorForValue(80, thresholds, 'blue')).toBe('green')
    })

    it('should handle unsorted thresholds', () => {
      const unsorted: GaugeThreshold[] = [
        { value: 80, color: 'green' },
        { value: 0, color: 'red' },
        { value: 50, color: 'yellow' }
      ]
      expect(getColorForValue(60, unsorted, 'blue')).toBe('yellow')
    })

    it('should use default color for values below all thresholds', () => {
      const highThresholds: GaugeThreshold[] = [
        { value: 50, color: 'yellow' }
      ]
      expect(getColorForValue(25, highThresholds, 'blue')).toBe('blue')
    })
  })

  describe('GaugeMetadata', () => {
    it('should have correct type', () => {
      expect(GaugeMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(GaugeMetadata.language).toBe('gauge')
    })

    it('should have display name', () => {
      expect(GaugeMetadata.displayName).toBe('Gauge')
    })

    it('should have description', () => {
      expect(GaugeMetadata.description).toContain('circular')
    })

    it('should have required props defined', () => {
      const propNames = GaugeMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('valueColumn')
    })

    it('should have examples', () => {
      expect(GaugeMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(GaugeMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(GaugeMetadata.tags).toContain('gauge')
      expect(GaugeMetadata.tags).toContain('meter')
    })
  })

  describe('GaugeSchema', () => {
    it('should have data field as required', () => {
      const dataField = GaugeSchema.fields.find(f => f.name === 'data')
      expect(dataField).toBeDefined()
      expect(dataField?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have min with default', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'min')
      expect(field).toBeDefined()
      expect(field?.default).toBe(0)
    })

    it('should have max with default', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'max')
      expect(field).toBeDefined()
      expect(field?.default).toBe(100)
    })

    it('should have size with default', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'size')
      expect(field).toBeDefined()
      expect(field?.default).toBe(200)
    })

    it('should have type enum', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'type')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('full')
      expect(field?.enum).toContain('half')
      expect(field?.enum).toContain('quarter')
    })

    it('should have color with default', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'color')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#3B82F6')
    })

    it('should have thickness with default', () => {
      const field = GaugeSchema.fields.find(f => f.name === 'thickness')
      expect(field).toBeDefined()
      expect(field?.default).toBe(20)
    })
  })

  describe('gaugeRegistration', () => {
    it('should have metadata', () => {
      expect(gaugeRegistration.metadata).toBeDefined()
      expect(gaugeRegistration.metadata.displayName).toBe('Gauge')
    })

    it('should have correct language', () => {
      expect(gaugeRegistration.metadata.language).toBe('gauge')
    })

    it('should have description', () => {
      expect(gaugeRegistration.metadata.description).toContain('circular')
    })

    it('should have tags', () => {
      expect(gaugeRegistration.metadata.tags).toContain('gauge')
      expect(gaugeRegistration.metadata.tags).toContain('kpi')
    })

    it('should have parser function', () => {
      expect(typeof gaugeRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof gaugeRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(gaugeRegistration.component).toBeDefined()
    })
  })
})
