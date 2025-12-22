/**
 * Delta Component Tests
 *
 * Tests for delta calculation, formatting, and metadata.
 */

import { describe, it, expect } from 'vitest'
import { deltaRegistration, formatDelta, calculateDelta } from './definition'

describe('Delta Component', () => {
  describe('formatDelta', () => {
    it('should format percent values correctly', () => {
      expect(formatDelta(20, 'percent', 1)).toBe('20.0%')
      expect(formatDelta(-15.5, 'percent', 1)).toBe('-15.5%')
      expect(formatDelta(0, 'percent', 1)).toBe('0.0%')
    })

    it('should format percent with different decimal places', () => {
      expect(formatDelta(23.456, 'percent', 0)).toBe('23%')
      expect(formatDelta(23.456, 'percent', 2)).toBe('23.46%')
      expect(formatDelta(23.456, 'percent', 3)).toBe('23.456%')
    })

    it('should format absolute values correctly', () => {
      expect(formatDelta(500, 'absolute', 0)).toBe('500')
      expect(formatDelta(-250, 'absolute', 0)).toBe('-250')
      expect(formatDelta(1234.5678, 'absolute', 2)).toBe('1,234.57')
    })

    it('should format large absolute values with commas', () => {
      expect(formatDelta(1000000, 'absolute', 0)).toBe('1,000,000')
      expect(formatDelta(-999999, 'absolute', 0)).toBe('-999,999')
    })
  })

  describe('calculateDelta', () => {
    describe('percent format', () => {
      it('should calculate positive percent delta', () => {
        const result = calculateDelta(120, 100, 'percent')
        expect(result).toBe(20) // (120-100)/100 * 100 = 20%
      })

      it('should calculate negative percent delta', () => {
        const result = calculateDelta(80, 100, 'percent')
        expect(result).toBe(-20) // (80-100)/100 * 100 = -20%
      })

      it('should calculate zero percent delta', () => {
        const result = calculateDelta(100, 100, 'percent')
        expect(result).toBe(0)
      })

      it('should handle division by zero (positive current)', () => {
        const result = calculateDelta(100, 0, 'percent')
        expect(result).toBe(100)
      })

      it('should handle division by zero (negative current)', () => {
        const result = calculateDelta(-50, 0, 'percent')
        expect(result).toBe(-100)
      })

      it('should handle both values zero', () => {
        const result = calculateDelta(0, 0, 'percent')
        expect(result).toBe(0)
      })

      it('should handle negative previous value', () => {
        const result = calculateDelta(-50, -100, 'percent')
        expect(result).toBe(50) // (-50-(-100))/|-100| * 100 = 50%
      })

      it('should handle current going from positive to negative', () => {
        const result = calculateDelta(-20, 100, 'percent')
        expect(result).toBe(-120) // (-20-100)/100 * 100 = -120%
      })
    })

    describe('absolute format', () => {
      it('should calculate positive absolute delta', () => {
        const result = calculateDelta(150, 100, 'absolute')
        expect(result).toBe(50) // 150 - 100 = 50
      })

      it('should calculate negative absolute delta', () => {
        const result = calculateDelta(75, 100, 'absolute')
        expect(result).toBe(-25) // 75 - 100 = -25
      })

      it('should calculate zero absolute delta', () => {
        const result = calculateDelta(100, 100, 'absolute')
        expect(result).toBe(0)
      })

      it('should handle large numbers', () => {
        const result = calculateDelta(1000000, 500000, 'absolute')
        expect(result).toBe(500000)
      })

      it('should handle decimals', () => {
        const result = calculateDelta(10.5, 5.25, 'absolute')
        expect(result).toBe(5.25)
      })
    })
  })

  describe('Metadata', () => {
    it('should have correct component type', () => {
      expect(deltaRegistration.metadata.type).toBe('data-viz')
    })

    it('should have correct language identifier', () => {
      expect(deltaRegistration.metadata.language).toBe('delta')
    })

    it('should be categorized as metric', () => {
      expect(deltaRegistration.metadata.category).toBe('metric')
    })

    it('should have correct display name', () => {
      expect(deltaRegistration.metadata.displayName).toBe('Delta')
    })

    it('should have description', () => {
      expect(deltaRegistration.metadata.description).toContain('comparison')
    })

    it('should have icon', () => {
      expect(deltaRegistration.metadata.icon).toBe('📈')
    })
  })

  describe('Component Registration', () => {
    it('should have parser function', () => {
      expect(typeof deltaRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof deltaRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(deltaRegistration.component).toBeDefined()
    })
  })
})
