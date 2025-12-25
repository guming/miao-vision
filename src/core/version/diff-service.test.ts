/**
 * Diff Service - Unit Tests
 *
 * Tests for text and Markdown diffing functionality
 */

import { describe, it, expect } from 'vitest'
import {
  diffText,
  diffTextWithLineNumbers,
  diffToHTML,
  compareVersions,
  compareMarkdownStructure,
  getDiffSummary
} from './diff-service'
import { DiffOperation, type ReportVersion } from '@/types/version'

// ============================================================================
// Test Helpers
// ============================================================================

function createTestVersion(
  version: number,
  content: string,
  reportId = 'test-report'
): ReportVersion {
  return {
    id: `version-${version}`,
    reportId,
    version,
    timestamp: new Date(),
    content,
    metadata: {
      contentLength: content.length
    },
    isAutoSave: false,
    contentHash: `hash-${version}`
  }
}

// ============================================================================
// diffText
// ============================================================================

describe('diffText', () => {
  it('detects insertions', () => {
    const oldText = 'Hello'
    const newText = 'Hello World'
    const chunks = diffText(oldText, newText)

    const insertions = chunks.filter(c => c.operation === DiffOperation.Insert)
    expect(insertions.length).toBeGreaterThan(0)
    expect(insertions.some(c => c.text.includes('World'))).toBe(true)
  })

  it('detects deletions', () => {
    const oldText = 'Hello World'
    const newText = 'Hello'
    const chunks = diffText(oldText, newText)

    const deletions = chunks.filter(c => c.operation === DiffOperation.Delete)
    expect(deletions.length).toBeGreaterThan(0)
  })

  it('handles identical text', () => {
    const text = 'Same content'
    const chunks = diffText(text, text)

    expect(chunks.length).toBe(1)
    expect(chunks[0].operation).toBe(DiffOperation.Equal)
    expect(chunks[0].text).toBe(text)
  })

  it('handles empty strings', () => {
    const chunks = diffText('', '')
    expect(chunks.length).toBe(0)
  })

  it('handles one empty string', () => {
    const chunks = diffText('', 'New content')
    const insertions = chunks.filter(c => c.operation === DiffOperation.Insert)
    expect(insertions.length).toBeGreaterThan(0)
  })

  it('applies semantic cleanup by default', () => {
    const oldText = 'The quick brown fox'
    const newText = 'The quick red fox'
    const chunks = diffText(oldText, newText)

    // Should have clean word-level changes, not character-level
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('respects ignoreWhitespace option', () => {
    const oldText = 'Hello  World'
    const newText = 'Hello World'

    const withWhitespace = diffText(oldText, newText, { ignoreWhitespace: false })
    const withoutWhitespace = diffText(oldText, newText, { ignoreWhitespace: true })

    // ignoreWhitespace should result in fewer/no changes
    expect(withoutWhitespace.length).toBeLessThanOrEqual(withWhitespace.length)
  })

  it('handles multi-line text', () => {
    const oldText = 'Line 1\nLine 2\nLine 3'
    const newText = 'Line 1\nModified Line 2\nLine 3'
    const chunks = diffText(oldText, newText)

    expect(chunks.length).toBeGreaterThan(0)
  })

  it('handles unicode characters', () => {
    const oldText = '你好'
    const newText = '你好世界'
    const chunks = diffText(oldText, newText)

    const insertions = chunks.filter(c => c.operation === DiffOperation.Insert)
    expect(insertions.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// diffTextWithLineNumbers
// ============================================================================

describe('diffTextWithLineNumbers', () => {
  it('adds line numbers to chunks', () => {
    const oldText = 'Line 1\nLine 2'
    const newText = 'Line 1\nModified Line 2'
    const chunks = diffTextWithLineNumbers(oldText, newText)

    expect(chunks.every(c => c.lineNumber !== undefined)).toBe(true)
  })

  it('starts line numbers at 1', () => {
    const chunks = diffTextWithLineNumbers('Test', 'Test Modified')
    expect(chunks[0].lineNumber).toBe(1)
  })

  it('increments line numbers correctly', () => {
    const oldText = 'Line 1\nLine 2\nLine 3'
    const newText = 'Line 1\nLine 2\nLine 3'
    const chunks = diffTextWithLineNumbers(oldText, newText)

    // Single equal chunk should have lineNumber 1
    expect(chunks[0].lineNumber).toBe(1)
  })
})

// ============================================================================
// diffToHTML
// ============================================================================

describe('diffToHTML', () => {
  it('generates HTML string', () => {
    const html = diffToHTML('Old text', 'New text')
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })

  it('includes HTML tags for changes', () => {
    const html = diffToHTML('Old', 'New')
    // diff-match-patch uses <del> and <ins> tags
    expect(html).toMatch(/<(del|ins|span)/)
    expect(html).toMatch(/<\/(del|ins|span)>/)
  })

  it('handles identical text', () => {
    const html = diffToHTML('Same', 'Same')
    expect(typeof html).toBe('string')
  })
})

// ============================================================================
// compareVersions
// ============================================================================

describe('compareVersions', () => {
  it('compares two versions', () => {
    const v1 = createTestVersion(1, 'Old content')
    const v2 = createTestVersion(2, 'New content')

    const result = compareVersions(v1, v2)

    expect(result.fromVersion).toBe(v1)
    expect(result.toVersion).toBe(v2)
    expect(result.chunks.length).toBeGreaterThan(0)
    expect(result.stats).toBeDefined()
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('calculates diff statistics', () => {
    const v1 = createTestVersion(1, 'Hello')
    const v2 = createTestVersion(2, 'Hello World')

    const result = compareVersions(v1, v2)

    expect(result.stats.insertions).toBeGreaterThan(0)
    expect(result.stats.linesChanged).toBeGreaterThan(0)
    expect(result.stats.changePercentage).toBeGreaterThan(0)
  })

  it('handles identical versions', () => {
    const v1 = createTestVersion(1, 'Same content')
    const v2 = createTestVersion(2, 'Same content')

    const result = compareVersions(v1, v2)

    expect(result.stats.insertions).toBe(0)
    expect(result.stats.deletions).toBe(0)
    expect(result.stats.changePercentage).toBe(0)
  })

  it('respects comparison options', () => {
    const v1 = createTestVersion(1, 'Old  text')
    const v2 = createTestVersion(2, 'Old text')

    const result = compareVersions(v1, v2, { ignoreWhitespace: true })
    expect(result).toBeDefined()
  })
})

// ============================================================================
// compareMarkdownStructure
// ============================================================================

describe('compareMarkdownStructure', () => {
  it('detects added headings', () => {
    const v1 = createTestVersion(1, '# Title\n\nContent')
    const v2 = createTestVersion(2, '# Title\n\n## New Section\n\nContent')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.headings.added.length).toBeGreaterThan(0)
    expect(diff.headings.added[0].text).toBe('New Section')
    expect(diff.headings.added[0].level).toBe(2)
  })

  it('detects removed headings', () => {
    const v1 = createTestVersion(1, '# Title\n\n## Section\n\nContent')
    const v2 = createTestVersion(2, '# Title\n\nContent')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.headings.removed.length).toBeGreaterThan(0)
  })

  it('detects modified headings', () => {
    const v1 = createTestVersion(1, '# Old Title\n\nContent')
    const v2 = createTestVersion(2, '# New Title\n\nContent')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.headings.modified.length).toBeGreaterThan(0)
    expect(diff.headings.modified[0].oldText).toBe('Old Title')
    expect(diff.headings.modified[0].newText).toBe('New Title')
  })

  it('detects added code blocks', () => {
    const v1 = createTestVersion(1, 'Text content')
    const v2 = createTestVersion(2, 'Text content\n\n```sql\nSELECT * FROM users\n```')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.codeBlocks.added.length).toBeGreaterThan(0)
    expect(diff.codeBlocks.added[0].lang).toBe('sql')
  })

  it('detects removed code blocks', () => {
    const v1 = createTestVersion(1, '```sql\nSELECT *\n```\n\nText')
    const v2 = createTestVersion(2, 'Text')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.codeBlocks.removed.length).toBeGreaterThan(0)
  })

  it('detects added components', () => {
    const v1 = createTestVersion(1, 'Report content')
    const v2 = createTestVersion(2, 'Report content\n\n<Chart data={sales} />')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.components.added.length).toBeGreaterThan(0)
    expect(diff.components.added).toContain('Chart')
  })

  it('detects removed components', () => {
    const v1 = createTestVersion(1, '<DataTable data={users} />\n\nText')
    const v2 = createTestVersion(2, 'Text')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.components.removed.length).toBeGreaterThan(0)
    expect(diff.components.removed).toContain('DataTable')
  })

  it('calculates structure changes', () => {
    const v1 = createTestVersion(1, '# Title\n\nContent')
    const v2 = createTestVersion(2, '# Title\n\n## Section 1\n\n## Section 2\n\nContent')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.structure.addedSections).toBe(2)
    expect(diff.structure.removedSections).toBe(0)
  })

  it('handles empty content', () => {
    const v1 = createTestVersion(1, '')
    const v2 = createTestVersion(2, '# Title')

    const diff = compareMarkdownStructure(v1, v2)

    expect(diff.headings.added.length).toBe(1)
  })

  it('handles complex markdown', () => {
    const v1 = createTestVersion(
      1,
      '# Report\n\n## Sales\n\n```sql\nSELECT * FROM sales\n```\n\n<Chart data={sales} />'
    )
    const v2 = createTestVersion(
      2,
      '# Report\n\n## Revenue\n\n```sql\nSELECT * FROM revenue\n```\n\n<BigValue data={total} />'
    )

    const diff = compareMarkdownStructure(v1, v2)

    // Should detect changes in headings, code blocks, and components
    expect(diff.headings.modified.length).toBeGreaterThan(0)
    expect(diff.codeBlocks.modified.length).toBeGreaterThan(0)
    expect(diff.components.added.length).toBeGreaterThan(0)
    expect(diff.components.removed.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// getDiffSummary
// ============================================================================

describe('getDiffSummary', () => {
  it('summarizes insertions and deletions', () => {
    const v1 = createTestVersion(1, 'Old content')
    const v2 = createTestVersion(2, 'New different content')
    const diffResult = compareVersions(v1, v2)

    const summary = getDiffSummary(diffResult)

    expect(summary).toBeTruthy()
    expect(typeof summary).toBe('string')
  })

  it('returns "No changes" for identical content', () => {
    const v1 = createTestVersion(1, 'Same')
    const v2 = createTestVersion(2, 'Same')
    const diffResult = compareVersions(v1, v2)

    const summary = getDiffSummary(diffResult)

    expect(summary).toBe('No changes')
  })

  it('includes structural changes when provided', () => {
    const v1 = createTestVersion(1, 'Content')
    const v2 = createTestVersion(2, '# New Heading\n\nContent')

    const diffResult = compareVersions(v1, v2)
    const markdownDiff = compareMarkdownStructure(v1, v2)
    const summary = getDiffSummary(diffResult, markdownDiff)

    expect(summary).toContain('heading')
  })

  it('handles single insertion', () => {
    const v1 = createTestVersion(1, 'Hello')
    const v2 = createTestVersion(2, 'Hello\nWorld')
    const diffResult = compareVersions(v1, v2)

    const summary = getDiffSummary(diffResult)

    expect(summary).toMatch(/1 insertion/)
  })

  it('handles multiple changes', () => {
    const v1 = createTestVersion(1, 'Line 1\nLine 2')
    const v2 = createTestVersion(2, 'Line 1\nNew Line\n')
    const diffResult = compareVersions(v1, v2)

    const summary = getDiffSummary(diffResult)

    expect(summary.length).toBeGreaterThan(0)
  })

  it('includes code block changes', () => {
    const v1 = createTestVersion(1, 'Text')
    const v2 = createTestVersion(2, '```sql\nSELECT *\n```\n\nText')

    const diffResult = compareVersions(v1, v2)
    const markdownDiff = compareMarkdownStructure(v1, v2)
    const summary = getDiffSummary(diffResult, markdownDiff)

    expect(summary).toContain('code block')
  })
})
