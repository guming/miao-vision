/**
 * ConfigParser - Unified Configuration Parsing Layer
 *
 * Eliminates duplicate YAML-like parsing logic across all component parsers.
 * Provides schema-driven parsing with validation.
 */

import type { ParsedCodeBlock } from '@/types/report'

/**
 * Field types supported by the parser
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'enum'

/**
 * Field schema definition
 */
export interface FieldSchema {
  /** Field name */
  name: string
  /** Field type */
  type: FieldType
  /** Is this field required? */
  required?: boolean
  /** Default value if not provided */
  default?: unknown
  /** Valid enum values (for enum type) */
  enum?: string[]
  /** Array item separator (default: ',') */
  arrayItemSeparator?: string
}

/**
 * Section schema for nested structures (like columns:, options:)
 */
export interface SectionSchema {
  /** Section name (e.g., 'columns', 'options') */
  name: string
  /** Field schemas for items within the section */
  itemFields: FieldSchema[]
}

/**
 * Complete configuration schema
 */
export interface ConfigSchema {
  /** Top-level field definitions */
  fields: FieldSchema[]
  /** Nested section definitions */
  sections?: SectionSchema[]
}

/**
 * Parse result with success/error information
 */
export interface ParseResult<T> {
  /** Whether parsing succeeded */
  success: boolean
  /** Parsed data (null if failed) */
  data: T | null
  /** Error messages */
  errors: string[]
}

/**
 * ConfigParser class - handles YAML-like configuration parsing
 */
export class ConfigParser {
  /**
   * Parse configuration content using a schema
   */
  parse<T>(content: string, schema: ConfigSchema): ParseResult<T> {
    const errors: string[] = []
    const result: Record<string, unknown> = {}
    const sections: Record<string, Record<string, unknown>[]> = {}

    const lines = content.split('\n')
    let currentSection: string | null = null
    let currentItem: Record<string, unknown> | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue

      // Check for section start (e.g., columns:, options:)
      const sectionMatch = this.matchSection(trimmed, schema.sections)
      if (sectionMatch) {
        // Save previous item if exists
        if (currentSection && currentItem && Object.keys(currentItem).length > 0) {
          sections[currentSection] = sections[currentSection] || []
          sections[currentSection].push(currentItem)
        }
        currentSection = sectionMatch
        currentItem = null
        continue
      }

      // List item within section (starts with - or •)
      if (currentSection && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
        // Save previous item
        if (currentItem && Object.keys(currentItem).length > 0) {
          sections[currentSection] = sections[currentSection] || []
          sections[currentSection].push(currentItem)
        }
        currentItem = this.parseListItem(trimmed, schema.sections, currentSection)
        continue
      }

      // Property within section item (indented)
      if (currentSection && currentItem && this.isIndented(line)) {
        const [key, value] = this.parseKeyValue(trimmed)
        if (key && value !== undefined) {
          const fieldType = this.findFieldType(key, schema.sections, currentSection)
          currentItem[key] = this.coerceValue(value, fieldType)
        }
        continue
      }

      // Top-level field (not indented, or after section ends)
      if (!currentSection || !this.isIndented(line)) {
        // Exit section mode
        if (currentSection && currentItem && Object.keys(currentItem).length > 0) {
          sections[currentSection] = sections[currentSection] || []
          sections[currentSection].push(currentItem)
          currentItem = null
        }
        currentSection = null

        const [key, value] = this.parseKeyValue(trimmed)
        if (key && value !== undefined) {
          const fieldSchema = schema.fields.find((f) => f.name === key)
          result[key] = this.coerceValue(value, fieldSchema?.type || 'string', fieldSchema)
        }
      }
    }

    // Save last item if exists
    if (currentSection && currentItem && Object.keys(currentItem).length > 0) {
      sections[currentSection] = sections[currentSection] || []
      sections[currentSection].push(currentItem)
    }

    // Merge sections into result
    for (const [name, items] of Object.entries(sections)) {
      result[name] = items
    }

    // Apply default values
    for (const field of schema.fields) {
      if (result[field.name] === undefined && field.default !== undefined) {
        result[field.name] = field.default
      }
    }

    // Validate required fields
    for (const field of schema.fields) {
      if (field.required && result[field.name] === undefined) {
        console.log(`[ConfigParser] Field "${field.name}" required=${field.required}, value=${result[field.name]}`)
        errors.push(`Missing required field: ${field.name}`)
      }
    }

    // Validate enum values
    for (const field of schema.fields) {
      if (field.enum && result[field.name] !== undefined) {
        if (!field.enum.includes(result[field.name] as string)) {
          errors.push(
            `Invalid value for ${field.name}: "${result[field.name]}". Expected one of: ${field.enum.join(', ')}`
          )
        }
      }
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? (result as T) : null,
      errors
    }
  }

  /**
   * Parse configuration from a ParsedCodeBlock
   * Prefers metadata (frontmatter) over content parsing
   */
  parseBlock<T>(block: ParsedCodeBlock, schema: ConfigSchema): ParseResult<T> {
    // Prefer metadata if available (already parsed frontmatter)
    if (block.metadata && Object.keys(block.metadata).length > 0) {
      console.log(`[ConfigParser.parseBlock] Using validateMetadata for ${block.language}, metadata keys:`, Object.keys(block.metadata))
      return this.validateMetadata<T>(block.metadata as Record<string, unknown>, schema)
    }

    // Otherwise parse content
    console.log(`[ConfigParser.parseBlock] Using parse() for ${block.language}, schema fields:`, schema.fields.map(f => `${f.name}:${f.required}`))
    return this.parse<T>(block.content, schema)
  }

  /**
   * Validate existing metadata object against schema
   */
  private validateMetadata<T>(
    metadata: Record<string, unknown>,
    schema: ConfigSchema
  ): ParseResult<T> {
    const errors: string[] = []
    const result = { ...metadata }

    // Apply defaults and validate
    for (const field of schema.fields) {
      if (result[field.name] === undefined && field.default !== undefined) {
        result[field.name] = field.default
      }
      if (field.required && result[field.name] === undefined) {
        console.log(`[ConfigParser.validateMetadata] Field "${field.name}" required=${field.required}`)
        errors.push(`Missing required field: ${field.name}`)
      }
      if (
        field.enum &&
        result[field.name] !== undefined &&
        !field.enum.includes(result[field.name] as string)
      ) {
        errors.push(
          `Invalid value for ${field.name}: "${result[field.name]}". Expected one of: ${field.enum.join(', ')}`
        )
      }
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? (result as T) : null,
      errors
    }
  }

  // === Private helper methods ===

  /**
   * Parse a key:value pair from a line
   */
  private parseKeyValue(line: string): [string | null, string | undefined] {
    const colonIndex = line.indexOf(':')
    if (colonIndex <= 0) return [null, undefined]

    const key = line.substring(0, colonIndex).trim()
    const value = line.substring(colonIndex + 1).trim()
    return [key, value || undefined]
  }

  /**
   * Coerce string value to the appropriate type
   */
  private coerceValue(
    value: string,
    type: FieldType = 'string',
    schema?: FieldSchema
  ): unknown {
    switch (type) {
      case 'boolean':
        return value === 'true'
      case 'number': {
        const num = parseFloat(value)
        return isNaN(num) ? 0 : num
      }
      case 'array': {
        const separator = schema?.arrayItemSeparator || ','
        return value
          .split(separator)
          .map((v) => v.trim())
          .filter(Boolean)
      }
      case 'enum':
      case 'string':
      default:
        // Remove surrounding quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          return value.slice(1, -1)
        }
        return value
    }
  }

  /**
   * Check if a line is indented
   */
  private isIndented(line: string): boolean {
    return line.startsWith(' ') || line.startsWith('\t')
  }

  /**
   * Match a line to a section definition
   */
  private matchSection(line: string, sections?: SectionSchema[]): string | null {
    if (!sections) return null
    for (const section of sections) {
      if (line === `${section.name}:`) {
        return section.name
      }
    }
    return null
  }

  /**
   * Parse a list item line
   */
  private parseListItem(
    line: string,
    sections?: SectionSchema[],
    currentSection?: string
  ): Record<string, unknown> {
    const content = line.replace(/^[-•]\s*/, '').trim()

    // Handle "- key: value" format (inline definition)
    if (content.includes(':')) {
      const colonIndex = content.indexOf(':')
      const firstKey = content.substring(0, colonIndex).trim()
      const firstValue = content.substring(colonIndex + 1).trim()

      // Check if it's a known field
      if (sections && currentSection) {
        const section = sections.find((s) => s.name === currentSection)
        const field = section?.itemFields.find((f) => f.name === firstKey)
        if (field) {
          return { [firstKey]: this.coerceValue(firstValue, field.type, field) }
        }
      }

      return { [firstKey]: firstValue }
    }

    // Handle "- value" format (simple list)
    // For options, treat as value:label pair
    return { value: content, label: content }
  }

  /**
   * Find field type from section schema
   */
  private findFieldType(
    key: string,
    sections?: SectionSchema[],
    currentSection?: string
  ): FieldType {
    if (!sections || !currentSection) return 'string'
    const section = sections.find((s) => s.name === currentSection)
    const field = section?.itemFields.find((f) => f.name === key)
    return field?.type || 'string'
  }
}

/**
 * Singleton instance
 */
export const configParser = new ConfigParser()
