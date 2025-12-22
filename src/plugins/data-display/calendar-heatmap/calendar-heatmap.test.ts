/**
 * Calendar Heatmap Component Tests
 *
 * Tests for date processing, color calculations, and metadata.
 */

import { describe, it, expect } from 'vitest'
import {
  calendarHeatmapRegistration,
  parseDate,
  formatDateKey,
  getColorForValue,
  generateDateRange
} from './definition'

describe('Calendar Heatmap Component', () => {
  describe('parseDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const date = parseDate('2024-06-15')
      expect(date).not.toBeNull()
      expect(date!.getFullYear()).toBe(2024)
      expect(date!.getMonth()).toBe(5) // 0-indexed
      expect(date!.getDate()).toBe(15)
    })

    it('should parse ISO format', () => {
      const date = parseDate('2024-06-15T10:30:00Z')
      expect(date).not.toBeNull()
      expect(date!.getFullYear()).toBe(2024)
    })

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull()
    })

    it('should return null for invalid date', () => {
      expect(parseDate('not-a-date')).toBeNull()
    })
  })

  describe('formatDateKey', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date(2024, 5, 15) // June 15, 2024
      expect(formatDateKey(date)).toBe('2024-06-15')
    })

    it('should pad single digit months and days', () => {
      const date = new Date(2024, 0, 5) // January 5, 2024
      expect(formatDateKey(date)).toBe('2024-01-05')
    })

    it('should handle December correctly', () => {
      const date = new Date(2024, 11, 31) // December 31, 2024
      expect(formatDateKey(date)).toBe('2024-12-31')
    })
  })

  describe('getColorForValue', () => {
    it('should return empty color for zero value', () => {
      const result = getColorForValue(0, 0, 100, 'green', 4, '#ebedf0')
      expect(result.color).toBe('#ebedf0')
      expect(result.level).toBe(0)
    })

    it('should return level 1 for low values', () => {
      const result = getColorForValue(10, 0, 100, 'green', 4)
      expect(result.level).toBeGreaterThanOrEqual(1)
      expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should return max level for high values', () => {
      const result = getColorForValue(100, 0, 100, 'green', 4)
      expect(result.level).toBe(4)
    })

    it('should work with different color schemes', () => {
      const schemes = ['green', 'blue', 'orange', 'purple', 'red', 'gray']

      for (const scheme of schemes) {
        const result = getColorForValue(50, 0, 100, scheme, 4)
        expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(result.level).toBeGreaterThan(0)
      }
    })

    it('should fall back to green for unknown scheme', () => {
      const result = getColorForValue(50, 0, 100, 'unknown', 4)
      expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should handle max value of 0', () => {
      const result = getColorForValue(0, 0, 0, 'green', 4, '#ebedf0')
      expect(result.color).toBe('#ebedf0')
      expect(result.level).toBe(0)
    })

    it('should handle different color levels', () => {
      const result2 = getColorForValue(100, 0, 100, 'green', 2)
      expect(result2.level).toBe(2)

      const result5 = getColorForValue(100, 0, 100, 'green', 5)
      expect(result5.level).toBe(5)
    })
  })

  describe('generateDateRange', () => {
    it('should generate all dates in range', () => {
      const start = new Date(2024, 0, 1) // Jan 1
      const end = new Date(2024, 0, 7) // Jan 7
      const dates = generateDateRange(start, end)

      expect(dates.length).toBe(7)
      expect(formatDateKey(dates[0])).toBe('2024-01-01')
      expect(formatDateKey(dates[6])).toBe('2024-01-07')
    })

    it('should handle single day range', () => {
      const date = new Date(2024, 5, 15)
      const dates = generateDateRange(date, date)

      expect(dates.length).toBe(1)
      expect(formatDateKey(dates[0])).toBe('2024-06-15')
    })

    it('should handle month boundaries', () => {
      const start = new Date(2024, 0, 30) // Jan 30
      const end = new Date(2024, 1, 2) // Feb 2
      const dates = generateDateRange(start, end)

      expect(dates.length).toBe(4)
      expect(formatDateKey(dates[0])).toBe('2024-01-30')
      expect(formatDateKey(dates[3])).toBe('2024-02-02')
    })

    it('should handle year boundaries', () => {
      const start = new Date(2023, 11, 30) // Dec 30
      const end = new Date(2024, 0, 2) // Jan 2
      const dates = generateDateRange(start, end)

      expect(dates.length).toBe(4)
      expect(formatDateKey(dates[0])).toBe('2023-12-30')
      expect(formatDateKey(dates[3])).toBe('2024-01-02')
    })
  })

  describe('Metadata', () => {
    it('should have correct component type', () => {
      expect(calendarHeatmapRegistration.metadata.type).toBe('data-viz')
    })

    it('should have correct language identifier', () => {
      expect(calendarHeatmapRegistration.metadata.language).toBe('calendar-heatmap')
    })

    it('should be categorized as chart', () => {
      expect(calendarHeatmapRegistration.metadata.category).toBe('chart')
    })

    it('should have correct display name', () => {
      expect(calendarHeatmapRegistration.metadata.displayName).toBe('Calendar Heatmap')
    })

    it('should have description', () => {
      expect(calendarHeatmapRegistration.metadata.description).toContain('calendar')
    })

    it('should have icon', () => {
      expect(calendarHeatmapRegistration.metadata.icon).toBe('📅')
    })

    it('should have tags', () => {
      expect(calendarHeatmapRegistration.metadata.tags).toContain('calendar')
      expect(calendarHeatmapRegistration.metadata.tags).toContain('heatmap')
    })
  })

  describe('Component Registration', () => {
    it('should have parser function', () => {
      expect(typeof calendarHeatmapRegistration.parser).toBe('function')
    })

    it('should have renderer function', () => {
      expect(typeof calendarHeatmapRegistration.renderer).toBe('function')
    })

    it('should have component reference', () => {
      expect(calendarHeatmapRegistration.component).toBeDefined()
    })
  })

  describe('Color Level Calculations', () => {
    it('should distribute values evenly across levels', () => {
      // With 4 levels and values from 0-100:
      // Level 1: 1-25, Level 2: 26-50, Level 3: 51-75, Level 4: 76-100
      const result25 = getColorForValue(25, 0, 100, 'green', 4)
      const result50 = getColorForValue(50, 0, 100, 'green', 4)
      const result75 = getColorForValue(75, 0, 100, 'green', 4)
      const result100 = getColorForValue(100, 0, 100, 'green', 4)

      expect(result25.level).toBe(1)
      expect(result50.level).toBe(2)
      expect(result75.level).toBe(3)
      expect(result100.level).toBe(4)
    })

    it('should handle min value offset', () => {
      // Values 50-100 with range normalization
      // (50-50)/50 = 0, but since value > 0, it gets at least level 1
      const result50 = getColorForValue(50, 50, 100, 'green', 4)
      const result100 = getColorForValue(100, 50, 100, 'green', 4)

      expect(result50.level).toBe(1) // Min positive value gets level 1
      expect(result100.level).toBe(4)
    })
  })
})
