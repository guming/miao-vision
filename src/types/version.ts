/**
 * Report Version Control - Type Definitions
 *
 * Types for version management, diff, and history tracking.
 *
 * Design Principles:
 * - Immutable version records
 * - Clear separation of concerns
 * - Easy to test (pure types)
 * - AI-friendly with comprehensive documentation
 * - Extensible for future features
 *
 * @module types/version
 */

/**
 * Report version record stored in IndexedDB
 *
 * Represents a single version snapshot of a report.
 */
export interface ReportVersion {
  /** Unique version identifier (UUID) */
  id: string

  /** Report identifier this version belongs to */
  reportId: string

  /** Sequential version number (1, 2, 3...) */
  version: number

  /** When this version was created */
  timestamp: Date

  /** Complete Markdown content at this version */
  content: string

  /** Version metadata */
  metadata: VersionMetadata

  /** Parent version ID for building version tree (optional) */
  parentId?: string

  /** Whether this is an auto-save or manual save */
  isAutoSave: boolean

  /** Content hash for quick comparison (SHA-256) */
  contentHash: string
}

/**
 * Version metadata
 *
 * Additional information about the version
 */
export interface VersionMetadata {
  /** User-provided description (e.g., "Added sales chart") */
  description?: string

  /** Author name (for future collaboration features) */
  author?: string

  /** Version tags/labels (e.g., "stable", "draft", "published") */
  tags?: string[]

  /** Report title at this version */
  title?: string

  /** Number of characters in content */
  contentLength: number

  /** File attachment hashes at this version */
  fileHashes?: Record<string, string>

  /** Custom metadata (extensible) */
  custom?: Record<string, any>
}

/**
 * Version collection for a single report
 *
 * Used for import/export and bulk operations
 */
export interface VersionCollection {
  /** Report ID */
  reportId: string

  /** All versions for this report */
  versions: ReportVersion[]

  /** When this collection was exported */
  exportedAt?: Date

  /** Collection metadata */
  metadata?: {
    reportTitle?: string
    totalVersions: number
    dateRange: {
      earliest: Date
      latest: Date
    }
  }
}

/**
 * Diff operation type
 *
 * Based on diff-match-patch library convention
 */
export enum DiffOperation {
  /** Content deleted (-1) */
  Delete = -1,

  /** Content unchanged (0) */
  Equal = 0,

  /** Content inserted (1) */
  Insert = 1
}

/**
 * Single diff chunk
 *
 * Represents one piece of changed/unchanged text
 */
export interface DiffChunk {
  /** Operation type */
  operation: DiffOperation

  /** Text content */
  text: string

  /** Line number in original (for line-level diff) */
  lineNumber?: number
}

/**
 * Complete diff result between two versions
 */
export interface DiffResult {
  /** Version being compared from (older) */
  fromVersion: ReportVersion

  /** Version being compared to (newer) */
  toVersion: ReportVersion

  /** Array of diff chunks */
  chunks: DiffChunk[]

  /** Statistics */
  stats: DiffStats

  /** Generated timestamp */
  timestamp: Date
}

/**
 * Diff statistics
 */
export interface DiffStats {
  /** Number of insertions */
  insertions: number

  /** Number of deletions */
  deletions: number

  /** Number of unchanged chunks */
  unchanged: number

  /** Total lines changed */
  linesChanged: number

  /** Percentage changed (0-100) */
  changePercentage: number
}

/**
 * Structured Markdown diff
 *
 * Diff at AST level for better semantic understanding
 */
export interface MarkdownDiff {
  /** Heading changes */
  headings: {
    added: Array<{ level: number; text: string }>
    removed: Array<{ level: number; text: string }>
    modified: Array<{ level: number; oldText: string; newText: string }>
  }

  /** Code block changes (SQL queries) */
  codeBlocks: {
    added: Array<{ lang: string; code: string }>
    removed: Array<{ lang: string; code: string }>
    modified: Array<{ lang: string; oldCode: string; newCode: string }>
  }

  /** Component changes */
  components: {
    added: string[]
    removed: string[]
    modified: Array<{ name: string; propChanges: string[] }>
  }

  /** Overall structure changes */
  structure: {
    addedSections: number
    removedSections: number
    reordered: boolean
  }
}

/**
 * Version comparison options
 */
export interface CompareOptions {
  /** Include Markdown AST diff */
  includeStructuralDiff?: boolean

  /** Semantic cleanup for better readability */
  semanticCleanup?: boolean

  /** Ignore whitespace changes */
  ignoreWhitespace?: boolean

  /** Context lines around changes */
  contextLines?: number
}

/**
 * Version restore options
 */
export interface RestoreOptions {
  /** Create a new version or overwrite current */
  mode: 'new-version' | 'overwrite'

  /** Description for the restored version */
  description?: string

  /** Create backup before restore */
  createBackup?: boolean
}

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  /** Enable auto-save */
  enabled: boolean

  /** Interval in milliseconds (default: 5 minutes) */
  interval: number

  /** Minimum change threshold (characters changed) */
  changeThreshold: number

  /** Maximum versions to keep (0 = unlimited) */
  maxVersions: number

  /** Auto-delete versions older than N days (0 = never) */
  retentionDays: number
}

/**
 * Version filter options
 */
export interface VersionFilterOptions {
  /** Filter by date range */
  dateRange?: {
    start: Date
    end: Date
  }

  /** Filter by tags */
  tags?: string[]

  /** Filter by author */
  author?: string

  /** Include/exclude auto-saves */
  includeAutoSaves?: boolean

  /** Search in description */
  searchQuery?: string

  /** Sort by field */
  sortBy?: 'timestamp' | 'version' | 'description'

  /** Sort direction */
  sortDirection?: 'asc' | 'desc'

  /** Limit results */
  limit?: number
}

/**
 * Version validation result
 */
export interface VersionValidationResult {
  /** Whether version is valid */
  valid: boolean

  /** Validation errors */
  errors: Array<{
    field: string
    message: string
    severity: 'error' | 'warning'
  }>
}

/**
 * Type guard to check if value is a valid ReportVersion
 */
export function isReportVersion(value: unknown): value is ReportVersion {
  if (!value || typeof value !== 'object') return false

  const v = value as Partial<ReportVersion>

  return (
    typeof v.id === 'string' &&
    typeof v.reportId === 'string' &&
    typeof v.version === 'number' &&
    v.timestamp instanceof Date &&
    typeof v.content === 'string' &&
    typeof v.isAutoSave === 'boolean' &&
    typeof v.contentHash === 'string' &&
    v.metadata !== undefined &&
    typeof v.metadata === 'object'
  )
}

/**
 * Helper to create content hash
 */
export async function createContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Helper to generate unique version ID
 */
export function generateVersionId(): string {
  return `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate diff statistics
 */
export function calculateDiffStats(chunks: DiffChunk[]): DiffStats {
  let insertions = 0
  let deletions = 0
  let unchanged = 0

  for (const chunk of chunks) {
    const lines = chunk.text.split('\n').length - 1 || 1

    switch (chunk.operation) {
      case DiffOperation.Insert:
        insertions += lines
        break
      case DiffOperation.Delete:
        deletions += lines
        break
      case DiffOperation.Equal:
        unchanged += lines
        break
    }
  }

  const total = insertions + deletions + unchanged
  const linesChanged = insertions + deletions
  const changePercentage = total > 0 ? (linesChanged / total) * 100 : 0

  return {
    insertions,
    deletions,
    unchanged,
    linesChanged,
    changePercentage: Math.round(changePercentage * 100) / 100
  }
}

/**
 * Default auto-save configuration
 */
export const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  interval: 5 * 60 * 1000, // 5 minutes
  changeThreshold: 100, // 100 characters
  maxVersions: 50, // Keep last 50 versions
  retentionDays: 90 // Keep versions for 90 days
}
