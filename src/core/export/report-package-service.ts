/**
 * Report Package Service
 *
 * Handles import/export of MVR (MiaoVision Report) format files.
 * MVR is a portable format that bundles markdown, queries, and data.
 *
 * @module core/export/report-package-service
 */

import * as yaml from 'yaml'
import type {
  MVRReport,
  MVRMetadata,
  MVRDataBlock,
  MVRInputConfig,
  MVRExportOptions,
  MVRImportOptions,
  MVRParseResult,
  MVRImportResult,
  MVRColumnMeta
} from './mvr-types'
import { MVR_VERSION } from './mvr-types'
import type { Report, ReportBlock } from '@/types/report'

/**
 * Report Package Service
 * Singleton service for MVR import/export operations
 */
class ReportPackageService {
  private static instance: ReportPackageService

  static getInstance(): ReportPackageService {
    if (!ReportPackageService.instance) {
      ReportPackageService.instance = new ReportPackageService()
    }
    return ReportPackageService.instance
  }

  /**
   * Export a report to MVR format
   */
  async exportToMVR(
    report: Report,
    queryResults: Map<string, Record<string, unknown>[]>,
    options: MVRExportOptions = {}
  ): Promise<string> {
    const {
      includeSql = true,
      includeData = true,
      compressData = false,
      maxRowsPerBlock = 10000,
      includeColumnMeta = true
    } = options

    // Build metadata
    const metadata: MVRMetadata = {
      name: report.name,
      description: report.metadata?.description,
      version: MVR_VERSION,
      created: new Date().toISOString(),
      tags: report.metadata?.tags || []
    }

    // Extract inputs from report
    const inputs = this.extractInputConfigs(report)

    // Build data blocks
    const dataBlocks: MVRDataBlock[] = []
    if (includeData) {
      for (const [name, data] of queryResults.entries()) {
        const truncatedData = data.slice(0, maxRowsPerBlock)
        const block: MVRDataBlock = {
          name,
          data: truncatedData,
          capturedAt: new Date().toISOString()
        }

        if (includeColumnMeta && truncatedData.length > 0) {
          block.columns = this.inferColumnMeta(truncatedData[0])
        }

        // Find original SQL if available
        if (includeSql) {
          const sqlBlock = report.blocks?.find(
            (b: ReportBlock) => b.type === 'sql' && b.metadata?.name === name
          )
          if (sqlBlock) {
            block.sql = sqlBlock.content
          }
        }

        dataBlocks.push(block)
      }
    }

    // Build MVR content
    return this.serializeMVR({
      metadata,
      inputs,
      content: report.content,
      data: dataBlocks
    }, compressData)
  }

  /**
   * Parse MVR format content
   */
  parseMVR(mvrContent: string): MVRParseResult {
    try {
      const errors: string[] = []

      // Extract YAML frontmatter
      const frontmatterMatch = mvrContent.match(/^---\n([\s\S]*?)\n---\n/)
      if (!frontmatterMatch) {
        return {
          success: false,
          errors: ['Missing YAML frontmatter']
        }
      }

      const frontmatter = yaml.parse(frontmatterMatch[1])
      const metadata: MVRMetadata = {
        name: frontmatter.name || 'Untitled Report',
        description: frontmatter.description,
        version: frontmatter.version || '1.0',
        created: frontmatter.created || new Date().toISOString(),
        modified: frontmatter.modified,
        author: frontmatter.author,
        tags: frontmatter.tags || []
      }

      // Extract inputs from frontmatter
      const inputs: MVRInputConfig[] = []
      if (frontmatter.inputs) {
        for (const [name, config] of Object.entries(frontmatter.inputs)) {
          const inputConfig = config as Record<string, unknown>
          inputs.push({
            name,
            type: (inputConfig.type as MVRInputConfig['type']) || 'textinput',
            label: inputConfig.label as string,
            defaultValue: inputConfig.default as string | number | boolean,
            options: inputConfig.options as string[]
          })
        }
      }

      // Extract content (after frontmatter, before data blocks)
      let content = mvrContent.slice(frontmatterMatch[0].length)

      // Extract embedded data blocks
      const dataBlocks: MVRDataBlock[] = []
      const dataBlockPattern = /<!--\s*@data:(\w+)\s*-->\s*```json\n([\s\S]*?)\n```\s*<!--\s*@end:\1\s*-->/g

      let match
      while ((match = dataBlockPattern.exec(content)) !== null) {
        const name = match[1]
        const jsonContent = match[2]

        try {
          const data = JSON.parse(jsonContent)
          dataBlocks.push({
            name,
            data: Array.isArray(data) ? data : [data],
            capturedAt: new Date().toISOString()
          })
        } catch (e) {
          errors.push(`Failed to parse data block '${name}': ${e}`)
        }
      }

      // Remove data blocks from content
      content = content.replace(dataBlockPattern, '').trim()

      return {
        success: true,
        report: {
          metadata,
          inputs,
          content,
          data: dataBlocks
        },
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Parse error: ${error}`]
      }
    }
  }

  /**
   * Import MVR file and optionally load data into DuckDB
   */
  async importMVR(
    mvrContent: string,
    options: MVRImportOptions = {},
    databaseManager?: { execute: (sql: string) => Promise<void> }
  ): Promise<MVRImportResult> {
    const {
      loadDataToTables = true,
      tablePrefix = 'mvr_',
      overwriteTables = false
    } = options

    const parseResult = this.parseMVR(mvrContent)
    if (!parseResult.success || !parseResult.report) {
      return {
        success: false,
        errors: parseResult.errors
      }
    }

    const tablesCreated: string[] = []
    const warnings: string[] = []

    // Load data into DuckDB tables if requested
    if (loadDataToTables && databaseManager && parseResult.report.data.length > 0) {
      for (const dataBlock of parseResult.report.data) {
        const tableName = `${tablePrefix}${dataBlock.name}`

        try {
          if (overwriteTables) {
            await databaseManager.execute(`DROP TABLE IF EXISTS "${tableName}"`)
          }

          // Create table from data
          if (dataBlock.data.length > 0) {
            const columns = Object.keys(dataBlock.data[0])
            const createSQL = this.generateCreateTableSQL(tableName, dataBlock.data[0])
            await databaseManager.execute(createSQL)

            // Insert data
            for (const row of dataBlock.data) {
              const values = columns.map(col => this.formatSQLValue(row[col]))
              const insertSQL = `INSERT INTO "${tableName}" VALUES (${values.join(', ')})`
              await databaseManager.execute(insertSQL)
            }

            tablesCreated.push(tableName)
          }
        } catch (error) {
          warnings.push(`Failed to create table '${tableName}': ${error}`)
        }
      }
    }

    return {
      success: true,
      report: parseResult.report,
      tablesCreated,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Convert MVR report to internal Report format
   */
  mvrToReport(mvrReport: MVRReport): Report {
    return {
      id: crypto.randomUUID(),
      name: mvrReport.metadata.name,
      type: 'single',
      content: mvrReport.content,
      createdAt: new Date(mvrReport.metadata.created),
      lastModified: mvrReport.metadata.modified
        ? new Date(mvrReport.metadata.modified)
        : new Date(),
      blocks: [],
      metadata: {
        description: mvrReport.metadata.description,
        author: mvrReport.metadata.author,
        tags: mvrReport.metadata.tags
      }
    }
  }

  /**
   * Serialize MVR report to string
   */
  private serializeMVR(report: MVRReport, compress: boolean): string {
    // Build YAML frontmatter
    const frontmatter: Record<string, unknown> = {
      name: report.metadata.name,
      version: report.metadata.version,
      created: report.metadata.created
    }

    if (report.metadata.description) {
      frontmatter.description = report.metadata.description
    }

    if (report.metadata.author) {
      frontmatter.author = report.metadata.author
    }

    if (report.metadata.tags && report.metadata.tags.length > 0) {
      frontmatter.tags = report.metadata.tags
    }

    // Add inputs to frontmatter
    if (report.inputs.length > 0) {
      const inputsObj: Record<string, Record<string, unknown>> = {}
      for (const input of report.inputs) {
        inputsObj[input.name] = {
          type: input.type,
          default: input.defaultValue
        }
        if (input.options) {
          inputsObj[input.name].options = input.options
        }
        if (input.label) {
          inputsObj[input.name].label = input.label
        }
      }
      frontmatter.inputs = inputsObj
    }

    // Build output
    let output = '---\n'
    output += yaml.stringify(frontmatter)
    output += '---\n\n'

    // Add markdown content
    output += report.content
    output += '\n\n'

    // Add embedded data blocks
    for (const dataBlock of report.data) {
      output += `<!-- @data:${dataBlock.name} -->\n`
      output += '```json\n'
      output += compress
        ? JSON.stringify(dataBlock.data)
        : JSON.stringify(dataBlock.data, null, 2)
      output += '\n```\n'
      output += `<!-- @end:${dataBlock.name} -->\n\n`
    }

    return output.trim()
  }

  /**
   * Extract input configurations from report content
   * Note: Since blocks are ReportBlock type which doesn't have language,
   * we parse inputs from markdown content instead
   */
  private extractInputConfigs(_report: Report): MVRInputConfig[] {
    // For now, return empty array as input extraction requires parsing markdown
    // Full implementation would parse the report.content for input blocks
    return []
  }

  /**
   * Infer column metadata from a data row
   */
  private inferColumnMeta(row: Record<string, unknown>): MVRColumnMeta[] {
    return Object.entries(row).map(([name, value]) => ({
      name,
      type: this.inferType(value),
      nullable: value === null || value === undefined
    }))
  }

  /**
   * Infer type from value
   */
  private inferType(value: unknown): MVRColumnMeta['type'] {
    if (value === null || value === undefined) return 'unknown'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'string') {
      // Check for date patterns
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'datetime'
      return 'string'
    }
    return 'unknown'
  }

  /**
   * Generate CREATE TABLE SQL from sample row
   */
  private generateCreateTableSQL(tableName: string, sampleRow: Record<string, unknown>): string {
    const columns = Object.entries(sampleRow).map(([name, value]) => {
      const sqlType = this.valueToSQLType(value)
      return `"${name}" ${sqlType}`
    })

    return `CREATE TABLE "${tableName}" (${columns.join(', ')})`
  }

  /**
   * Convert value to SQL type
   */
  private valueToSQLType(value: unknown): string {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'DOUBLE'
    }
    if (typeof value === 'boolean') return 'BOOLEAN'
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'DATE'
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'TIMESTAMP'
      return 'VARCHAR'
    }
    return 'VARCHAR'
  }

  /**
   * Format value for SQL INSERT
   */
  private formatSQLValue(value: unknown): string {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`
    }
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  }
}

// Export singleton instance
export const reportPackageService = ReportPackageService.getInstance()

// Export convenience functions
export function exportToMVR(
  report: Report,
  queryResults: Map<string, Record<string, unknown>[]>,
  options?: MVRExportOptions
): Promise<string> {
  return reportPackageService.exportToMVR(report, queryResults, options)
}

export function parseMVR(mvrContent: string): MVRParseResult {
  return reportPackageService.parseMVR(mvrContent)
}

export function importMVR(
  mvrContent: string,
  options?: MVRImportOptions,
  databaseManager?: { execute: (sql: string) => Promise<void> }
): Promise<MVRImportResult> {
  return reportPackageService.importMVR(mvrContent, options, databaseManager)
}

export function mvrToReport(mvrReport: MVRReport): Report {
  return reportPackageService.mvrToReport(mvrReport)
}
