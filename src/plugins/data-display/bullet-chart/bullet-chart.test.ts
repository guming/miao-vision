/**
 * BulletChart Component Tests
 *
 * Tests for value calculation, formatting, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  bulletChartRegistration,
  formatValue,
  calculatePercent
} from './definition'
import { BulletChartMetadata } from './metadata'
import { BulletChartSchema } from './schema'

describe('BulletChart Component', () => {
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

    it('should handle values above max', () => {
      expect(calculatePercent(150, 0, 100)).toBe(150)
    })

    it('should handle values below min', () => {
      expect(calculatePercent(-50, 0, 100)).toBe(-50)
    })
  })

  describe('BulletChartMetadata', () => {
    it('should have correct type', () => {
      expect(BulletChartMetadata.type).toBe('data-viz')
    })

    it('should have correct language', () => {
      expect(BulletChartMetadata.language).toBe('bullet')
    })

    it('should have display name', () => {
      expect(BulletChartMetadata.displayName).toBe('Bullet Chart')
    })

    it('should have description', () => {
      expect(BulletChartMetadata.description).toContain('target')
    })

    it('should have required props defined', () => {
      const propNames = BulletChartMetadata.props.map(p => p.name)
      expect(propNames).toContain('data')
      expect(propNames).toContain('valueColumn')
    })

    it('should have optional target column', () => {
      const propNames = BulletChartMetadata.props.map(p => p.name)
      expect(propNames).toContain('targetColumn')
    })

    it('should have examples', () => {
      expect(BulletChartMetadata.examples?.length).toBeGreaterThan(0)
    })

    it('should have category as chart', () => {
      expect(BulletChartMetadata.category).toBe('chart')
    })

    it('should have appropriate tags', () => {
      expect(BulletChartMetadata.tags).toContain('bullet')
      expect(BulletChartMetadata.tags).toContain('target')
    })
  })

  describe('BulletChartSchema', () => {
    it('should have data field as required', () => {
      const dataField = BulletChartSchema.fields.find(f => f.name === 'data')
      expect(dataField).toBeDefined()
      expect(dataField?.required).toBe(true)
    })

    it('should have valueColumn as required', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'valueColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
    })

    it('should have targetColumn as optional', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'targetColumn')
      expect(field).toBeDefined()
      expect(field?.required).toBeFalsy()
    })

    it('should have min with default', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'min')
      expect(field).toBeDefined()
      expect(field?.default).toBe(0)
    })

    it('should have height with default', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'height')
      expect(field).toBeDefined()
      expect(field?.default).toBe(300)
    })

    it('should have orientation enum', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'orientation')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('horizontal')
      expect(field?.enum).toContain('vertical')
    })

    it('should have valueFormat enum', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'valueFormat')
      expect(field).toBeDefined()
      expect(field?.enum).toContain('number')
      expect(field?.enum).toContain('currency')
      expect(field?.enum).toContain('percent')
    })

    it('should have showTarget with default', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'showTarget')
      expect(field).toBeDefined()
      expect(field?.default).toBe(true)
    })

    it('should have color with default', () => {
      const field = BulletChartSchema.fields.find(f => f.name === 'color')
      expect(field).toBeDefined()
      expect(field?.default).toBe('#1f2937')
    })
  })

  describe('bulletChartRegistration', () => {
    it('should have metadata', () => {
      expect(bulletChartRegistration.metadata).toBeDefined()
      expect(bulletChartRegistration.metadata.displayName).toBe('Bullet Chart')
    })

    it('should have correct language', () => {
      expect(bulletChartRegistration.metadata.language).toBe('bullet')
    })

    it('should have description', () => {
      expect(bulletChartRegistration.metadata.description).toContain('target')
    })

    it('should have tags', () => {
      expect(bulletChartRegistration.metadata.tags).toContain('bullet')
      expect(bulletChartRegistration.metadata.tags).toContain('comparison')
    })

    it('should have parser function', () => {
      expect(typeof bulletChartRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof bulletChartRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(bulletChartRegistration.component).toBeDefined()
    })
  })
})
