/**
 * Diff Service - Version Comparison
 *
 * Provides text diffing and Markdown structural diffing for version comparison.
 *
 * Design Principles:
 * - Pure functions where possible
 * - Type-safe with comprehensive error handling
 * - Easy to test (no side effects)
 * - AI-friendly with clear documentation
 * - Extensible for future features
 *
 * @module core/version/diff-service
 */

import DiffMatchPatch from 'diff-match-patch'
import type {
  DiffResult,
  DiffChunk,
  DiffOperation,
  DiffStats,
  CompareOptions,
  ReportVersion,
  MarkdownDiff
} from '@/types/version'
import { calculateDiffStats } from '@/types/version'

/**
 * Create diff-match-patch instance with optimized settings
 */
function createDMP(): DiffMatchPatch {
  const dmp = new DiffMatchPatch()

  // Timeout for diff computation (1 second)
  dmp.Diff_Timeout = 1.0

  // Edit cost for semantic cleanup
  dmp.Diff_EditCost = 4

  return dmp
}

/**
 * Convert diff-match-patch diff array to our DiffChunk format
 *
 * @param dmpDiff - diff-match-patch diff array
 * @returns Array of DiffChunk
 */
function convertDMPDiff(dmpDiff: Array<[number, string]>): DiffChunk[] {
  return dmpDiff.map(([operation, text]) => ({
    operation: operation as DiffOperation,
    text
  }))
}

// ============================================================================
// Text Diff
// ============================================================================

/**
 * Compare two text strings
 *
 * @param oldText - Original text
 * @param newText - New text
 * @param options - Comparison options
 * @returns Array of diff chunks
 */
export function diffText(
  oldText: string,
  newText: string,
  options: CompareOptions = {}
): DiffChunk[] {
  const dmp = createDMP()

  // Perform diff
  let diff = dmp.diff_main(oldText, newText)

  // Apply semantic cleanup for better readability
  if (options.semanticCleanup !== false) {
    dmp.diff_cleanupSemantic(diff)
  }

  // Convert to our format
  let chunks = convertDMPDiff(diff)

  // Ignore whitespace if requested
  if (options.ignoreWhitespace) {
    chunks = chunks.filter((chunk) => {
      if (chunk.operation === 0) return true // Keep equal chunks
      // Remove chunks that are only whitespace
      return chunk.text.trim().length > 0
    })
  }

  return chunks
}

/**
 * Compare two text strings with line numbers
 *
 * Useful for displaying diffs in editors
 *
 * @param oldText - Original text
 * @param newText - New text
 * @param options - Comparison options
 * @returns Array of diff chunks with line numbers
 */
export function diffTextWithLineNumbers(
  oldText: string,
  newText: string,
  options: CompareOptions = {}
): DiffChunk[] {
  const chunks = diffText(oldText, newText, options)

  // Add line numbers
  let lineNumber = 1
  return chunks.map((chunk) => {
    const chunkWithLine = { ...chunk, lineNumber }

    // Update line number for next chunk
    const lines = chunk.text.split('\n')
    lineNumber += lines.length - 1

    return chunkWithLine
  })
}

/**
 * Generate HTML diff
 *
 * Returns HTML string with changes highlighted
 *
 * @param oldText - Original text
 * @param newText - New text
 * @returns HTML string
 */
export function diffToHTML(oldText: string, newText: string): string {
  const dmp = createDMP()
  const diff = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diff)
  return dmp.diff_prettyHtml(diff)
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Compare two report versions
 *
 * @param fromVersion - Older version
 * @param toVersion - Newer version
 * @param options - Comparison options
 * @returns Complete diff result
 */
export function compareVersions(
  fromVersion: ReportVersion,
  toVersion: ReportVersion,
  options: CompareOptions = {}
): DiffResult {
  // Perform text diff
  const chunks = diffText(fromVersion.content, toVersion.content, options)

  // Calculate statistics
  const stats = calculateDiffStats(chunks)

  return {
    fromVersion,
    toVersion,
    chunks,
    stats,
    timestamp: new Date()
  }
}

// ============================================================================
// Markdown Structural Diff
// ============================================================================

/**
 * Extract headings from Markdown content
 *
 * @param content - Markdown content
 * @returns Array of headings with level and text
 */
function extractHeadings(content: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Match ATX headings (# Heading)
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim()
      })
    }
  }

  return headings
}

/**
 * Extract code blocks from Markdown content
 *
 * @param content - Markdown content
 * @returns Array of code blocks with language and code
 */
function extractCodeBlocks(content: string): Array<{ lang: string; code: string }> {
  const blocks: Array<{ lang: string; code: string }> = []
  const lines = content.split('\n')

  let inBlock = false
  let currentLang = ''
  let currentCode: string[] = []

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inBlock) {
        // End of block
        blocks.push({
          lang: currentLang,
          code: currentCode.join('\n')
        })
        inBlock = false
        currentCode = []
      } else {
        // Start of block
        inBlock = true
        currentLang = line.slice(3).trim()
      }
    } else if (inBlock) {
      currentCode.push(line)
    }
  }

  return blocks
}

/**
 * Extract Evidence.dev components from Markdown content
 *
 * Matches component tags like <Chart>, <DataTable>, etc.
 *
 * @param content - Markdown content
 * @returns Array of component names
 */
function extractComponents(content: string): string[] {
  const components: string[] = []
  // Match opening tags like <ComponentName ...>
  const regex = /<([A-Z][A-Za-z0-9]*)/g
  let match

  while ((match = regex.exec(content)) !== null) {
    components.push(match[1])
  }

  return [...new Set(components)] // Remove duplicates
}

/**
 * Compare array items and categorize as added/removed/modified
 *
 * @param oldItems - Old array
 * @param newItems - New array
 * @param compareFn - Function to compare two items for equality
 * @returns Object with added, removed, and unchanged items
 */
function compareArrays<T>(
  oldItems: T[],
  newItems: T[],
  compareFn: (a: T, b: T) => boolean
): {
  added: T[]
  removed: T[]
  unchanged: T[]
} {
  const added: T[] = []
  const removed: T[] = []
  const unchanged: T[] = []

  // Find removed items
  for (const oldItem of oldItems) {
    if (!newItems.some((newItem) => compareFn(oldItem, newItem))) {
      removed.push(oldItem)
    } else {
      unchanged.push(oldItem)
    }
  }

  // Find added items
  for (const newItem of newItems) {
    if (!oldItems.some((oldItem) => compareFn(oldItem, newItem))) {
      added.push(newItem)
    }
  }

  return { added, removed, unchanged }
}

/**
 * Compare Markdown structure between two versions
 *
 * Provides high-level diff of document structure:
 * - Heading changes
 * - Code block changes (SQL queries)
 * - Component changes
 *
 * @param fromVersion - Older version
 * @param toVersion - Newer version
 * @returns Markdown structural diff
 */
export function compareMarkdownStructure(
  fromVersion: ReportVersion,
  toVersion: ReportVersion
): MarkdownDiff {
  const oldContent = fromVersion.content
  const newContent = toVersion.content

  // Extract headings
  const oldHeadings = extractHeadings(oldContent)
  const newHeadings = extractHeadings(newContent)

  const headingComparison = compareArrays(
    oldHeadings,
    newHeadings,
    (a, b) => a.level === b.level && a.text === b.text
  )

  // Extract code blocks
  const oldCodeBlocks = extractCodeBlocks(oldContent)
  const newCodeBlocks = extractCodeBlocks(newContent)

  const codeBlockComparison = compareArrays(
    oldCodeBlocks,
    newCodeBlocks,
    (a, b) => a.lang === b.lang && a.code === b.code
  )

  // Extract components
  const oldComponents = extractComponents(oldContent)
  const newComponents = extractComponents(newContent)

  const componentComparison = compareArrays(
    oldComponents,
    newComponents,
    (a, b) => a === b
  )

  // Detect heading modifications (same level, different text)
  const modifiedHeadings: Array<{ level: number; oldText: string; newText: string }> =
    []
  for (let i = 0; i < Math.min(oldHeadings.length, newHeadings.length); i++) {
    if (
      oldHeadings[i].level === newHeadings[i].level &&
      oldHeadings[i].text !== newHeadings[i].text
    ) {
      modifiedHeadings.push({
        level: oldHeadings[i].level,
        oldText: oldHeadings[i].text,
        newText: newHeadings[i].text
      })
    }
  }

  // Detect code block modifications
  const modifiedCodeBlocks: Array<{ lang: string; oldCode: string; newCode: string }> =
    []
  for (let i = 0; i < Math.min(oldCodeBlocks.length, newCodeBlocks.length); i++) {
    if (
      oldCodeBlocks[i].lang === newCodeBlocks[i].lang &&
      oldCodeBlocks[i].code !== newCodeBlocks[i].code
    ) {
      modifiedCodeBlocks.push({
        lang: oldCodeBlocks[i].lang,
        oldCode: oldCodeBlocks[i].code,
        newCode: newCodeBlocks[i].code
      })
    }
  }

  // Structure changes
  const structure = {
    addedSections: headingComparison.added.length,
    removedSections: headingComparison.removed.length,
    reordered: false // TODO: Detect reordering
  }

  return {
    headings: {
      added: headingComparison.added,
      removed: headingComparison.removed,
      modified: modifiedHeadings
    },
    codeBlocks: {
      added: codeBlockComparison.added,
      removed: codeBlockComparison.removed,
      modified: modifiedCodeBlocks
    },
    components: {
      added: componentComparison.added,
      removed: componentComparison.removed,
      modified: [] // TODO: Detect prop changes
    },
    structure
  }
}

/**
 * Get summary of changes from diff result
 *
 * Returns human-readable summary like:
 * - "2 insertions, 1 deletion"
 * - "Modified 3 headings, added 1 code block"
 *
 * @param diffResult - Diff result
 * @param markdownDiff - Optional markdown structural diff
 * @returns Summary string
 */
export function getDiffSummary(
  diffResult: DiffResult,
  markdownDiff?: MarkdownDiff
): string {
  const parts: string[] = []

  // Text-level changes
  if (diffResult.stats.insertions > 0) {
    parts.push(`${diffResult.stats.insertions} insertion${diffResult.stats.insertions > 1 ? 's' : ''}`)
  }
  if (diffResult.stats.deletions > 0) {
    parts.push(`${diffResult.stats.deletions} deletion${diffResult.stats.deletions > 1 ? 's' : ''}`)
  }

  // Structural changes
  if (markdownDiff) {
    if (markdownDiff.headings.added.length > 0) {
      parts.push(`${markdownDiff.headings.added.length} heading${markdownDiff.headings.added.length > 1 ? 's' : ''} added`)
    }
    if (markdownDiff.headings.removed.length > 0) {
      parts.push(`${markdownDiff.headings.removed.length} heading${markdownDiff.headings.removed.length > 1 ? 's' : ''} removed`)
    }
    if (markdownDiff.codeBlocks.added.length > 0) {
      parts.push(`${markdownDiff.codeBlocks.added.length} code block${markdownDiff.codeBlocks.added.length > 1 ? 's' : ''} added`)
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes'
}
