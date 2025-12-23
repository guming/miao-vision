/**
 * Data Processor for AreaMap
 */

import type { AreaData } from './types'

export interface ProcessorConfig {
  areaIdField: string
  areaNameField: string
  valueField: string
  formatType: string
}

/**
 * Create area data processor
 */
export function createAreaDataProcessor(config: ProcessorConfig) {
  const { areaIdField, areaNameField, valueField } = config

  return {
    /**
     * Process raw data into AreaData map
     */
    process(data: ReadonlyArray<Record<string, unknown>>): Map<string, Omit<AreaData, 'color'>> {
      const map = new Map<string, Omit<AreaData, 'color'>>()

      data.forEach((row) => {
        const id = String(row[areaIdField])
        const name = String(row[areaNameField])
        const value = Number(row[valueField])

        if (id && !isNaN(value)) {
          map.set(id, {
            id,
            name,
            value,
            formatted: String(value) // Will be formatted by component
          })
        }
      })

      return map
    },

    /**
     * Extract all values for range calculation
     */
    extractValues(data: ReadonlyArray<Record<string, unknown>>): number[] {
      return data
        .map((row) => Number(row[valueField]))
        .filter((val) => !isNaN(val))
    },

    /**
     * Calculate value statistics
     */
    calculateStats(values: number[]) {
      if (values.length === 0) {
        return { min: 0, max: 0, mean: 0, median: 0 }
      }

      const sorted = [...values].sort((a, b) => a - b)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const mean = sorted.reduce((sum, val) => sum + val, 0) / sorted.length
      const median = sorted[Math.floor(sorted.length / 2)]

      return { min, max, mean, median }
    }
  }
}
