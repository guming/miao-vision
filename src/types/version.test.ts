/**
 * Version Control Helper Functions - Unit Tests
 *
 * Tests for pure utility functions in version.ts
 */

import { describe, it, expect } from 'vitest'
import {
  isReportVersion,
  createContentHash,
  generateVersionId,
  calculateDiffStats,
  DEFAULT_AUTO_SAVE_CONFIG,
  DiffOperation,
  type ReportVersion,
  type DiffChunk,
  type AutoSaveConfig
} from './version'

// ============================================================================
// isReportVersion
// ============================================================================

describe('isReportVersion', () => {
  it('returns true for valid ReportVersion', () => {
    const version: ReportVersion = {
      id: 'version-1',
      reportId: 'report-1',
      version: 1,
      timestamp: new Date(),
      content: 'Test content',
      metadata: {
        contentLength: 12
      },
      isAutoSave: false,
      contentHash: 'abc123'
    }

    expect(isReportVersion(version)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isReportVersion(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isReportVersion(undefined)).toBe(false)
  })

  it('returns false for non-object', () => {
    expect(isReportVersion('string')).toBe(false)
    expect(isReportVersion(123)).toBe(false)
    expect(isReportVersion(true)).toBe(false)
  })

  it('returns false for missing required fields', () => {
    const invalid = {
      id: 'version-1',
      reportId: 'report-1'
      // missing other required fields
    }
    expect(isReportVersion(invalid)).toBe(false)
  })

  it('returns false for wrong field types', () => {
    const invalid = {
      id: 123, // should be string
      reportId: 'report-1',
      version: 1,
      timestamp: new Date(),
      content: 'Test',
      metadata: { contentLength: 4 },
      isAutoSave: false,
      contentHash: 'abc'
    }
    expect(isReportVersion(invalid)).toBe(false)
  })

  it('returns false for invalid timestamp', () => {
    const invalid = {
      id: 'version-1',
      reportId: 'report-1',
      version: 1,
      timestamp: 'not a date', // should be Date
      content: 'Test',
      metadata: { contentLength: 4 },
      isAutoSave: false,
      contentHash: 'abc'
    }
    expect(isReportVersion(invalid)).toBe(false)
  })

  it('accepts version with optional parentId', () => {
    const version: ReportVersion = {
      id: 'version-2',
      reportId: 'report-1',
      version: 2,
      timestamp: new Date(),
      content: 'Test content v2',
      metadata: { contentLength: 15 },
      parentId: 'version-1',
      isAutoSave: false,
      contentHash: 'def456'
    }
    expect(isReportVersion(version)).toBe(true)
  })
})

// ============================================================================
// createContentHash
// ============================================================================

describe('createContentHash', () => {
  it('creates hash for simple content', async () => {
    const content = 'Hello World'
    const hash = await createContentHash(content)

    expect(hash).toBeTruthy()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBe(64) // SHA-256 produces 64 hex chars
  })

  it('creates consistent hash for same content', async () => {
    const content = 'Test content'
    const hash1 = await createContentHash(content)
    const hash2 = await createContentHash(content)

    expect(hash1).toBe(hash2)
  })

  it('creates different hash for different content', async () => {
    const content1 = 'Content A'
    const content2 = 'Content B'
    const hash1 = await createContentHash(content1)
    const hash2 = await createContentHash(content2)

    expect(hash1).not.toBe(hash2)
  })

  it('handles empty string', async () => {
    const hash = await createContentHash('')
    expect(hash).toBeTruthy()
    expect(hash.length).toBe(64)
  })

  it('handles unicode characters', async () => {
    const content = '你好世界 🌍'
    const hash = await createContentHash(content)
    expect(hash).toBeTruthy()
    expect(hash.length).toBe(64)
  })

  it('handles large content', async () => {
    const content = 'x'.repeat(10000)
    const hash = await createContentHash(content)
    expect(hash).toBeTruthy()
    expect(hash.length).toBe(64)
  })
})

// ============================================================================
// generateVersionId
// ============================================================================

describe('generateVersionId', () => {
  it('generates valid version ID', () => {
    const id = generateVersionId()
    expect(id).toMatch(/^version-\d+-[a-z0-9]+$/)
  })

  it('generates unique IDs', () => {
    const id1 = generateVersionId()
    const id2 = generateVersionId()
    expect(id1).not.toBe(id2)
  })

  it('generates IDs with timestamp component', () => {
    const before = Date.now()
    const id = generateVersionId()
    const after = Date.now()

    // Extract timestamp from ID (format: version-{timestamp}-{random})
    const parts = id.split('-')
    const timestamp = parseInt(parts[1])

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('generates multiple unique IDs in quick succession', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateVersionId())
    }
    expect(ids.size).toBe(100) // All unique
  })
})

// ============================================================================
// calculateDiffStats
// ============================================================================

describe('calculateDiffStats', () => {
  it('calculates stats for insertions only', () => {
    const chunks: DiffChunk[] = [
      { operation: DiffOperation.Insert, text: 'New line 1\n' },
      { operation: DiffOperation.Insert, text: 'New line 2\n' }
    ]

    const stats = calculateDiffStats(chunks)

    expect(stats.insertions).toBe(2)
    expect(stats.deletions).toBe(0)
    expect(stats.unchanged).toBe(0)
    expect(stats.linesChanged).toBe(2)
    expect(stats.changePercentage).toBe(100)
  })

  it('calculates stats for deletions only', () => {
    const chunks: DiffChunk[] = [
      { operation: DiffOperation.Delete, text: 'Removed line 1\n' },
      { operation: DiffOperation.Delete, text: 'Removed line 2\n' }
    ]

    const stats = calculateDiffStats(chunks)

    expect(stats.insertions).toBe(0)
    expect(stats.deletions).toBe(2)
    expect(stats.unchanged).toBe(0)
    expect(stats.linesChanged).toBe(2)
    expect(stats.changePercentage).toBe(100)
  })

  it('calculates stats for mixed changes', () => {
    const chunks: DiffChunk[] = [
      { operation: DiffOperation.Equal, text: 'Same line\n' },
      { operation: DiffOperation.Delete, text: 'Old line\n' },
      { operation: DiffOperation.Insert, text: 'New line\n' },
      { operation: DiffOperation.Equal, text: 'Another same\n' }
    ]

    const stats = calculateDiffStats(chunks)

    expect(stats.insertions).toBe(1)
    expect(stats.deletions).toBe(1)
    expect(stats.unchanged).toBe(2)
    expect(stats.linesChanged).toBe(2)
    expect(stats.changePercentage).toBe(50)
  })

  it('handles empty chunks array', () => {
    const stats = calculateDiffStats([])

    expect(stats.insertions).toBe(0)
    expect(stats.deletions).toBe(0)
    expect(stats.unchanged).toBe(0)
    expect(stats.linesChanged).toBe(0)
    expect(stats.changePercentage).toBe(0)
  })

  it('handles single-line chunks (no newlines)', () => {
    const chunks: DiffChunk[] = [
      { operation: DiffOperation.Insert, text: 'single line' },
      { operation: DiffOperation.Delete, text: 'another' }
    ]

    const stats = calculateDiffStats(chunks)

    expect(stats.insertions).toBe(1)
    expect(stats.deletions).toBe(1)
    expect(stats.linesChanged).toBe(2)
  })

  it('rounds change percentage correctly', () => {
    const chunks: DiffChunk[] = [
      { operation: DiffOperation.Insert, text: 'a\n' },
      { operation: DiffOperation.Equal, text: 'b\nc\nd\ne\nf\ng\n' }
    ]

    const stats = calculateDiffStats(chunks)

    // 1 insert out of 7 total = 14.28...%
    expect(stats.changePercentage).toBe(14.29)
  })

  it('handles multi-line chunks', () => {
    const chunks: DiffChunk[] = [
      { operation: DiffOperation.Insert, text: 'line 1\nline 2\nline 3\n' },
      { operation: DiffOperation.Delete, text: 'old line\n' }
    ]

    const stats = calculateDiffStats(chunks)

    expect(stats.insertions).toBe(3)
    expect(stats.deletions).toBe(1)
    expect(stats.linesChanged).toBe(4)
  })
})

// ============================================================================
// DEFAULT_AUTO_SAVE_CONFIG
// ============================================================================

describe('DEFAULT_AUTO_SAVE_CONFIG', () => {
  it('has valid default values', () => {
    expect(DEFAULT_AUTO_SAVE_CONFIG.enabled).toBe(true)
    expect(DEFAULT_AUTO_SAVE_CONFIG.interval).toBeGreaterThan(0)
    expect(DEFAULT_AUTO_SAVE_CONFIG.changeThreshold).toBeGreaterThan(0)
    expect(DEFAULT_AUTO_SAVE_CONFIG.maxVersions).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_AUTO_SAVE_CONFIG.retentionDays).toBeGreaterThanOrEqual(0)
  })

  it('has reasonable interval (5 minutes)', () => {
    expect(DEFAULT_AUTO_SAVE_CONFIG.interval).toBe(5 * 60 * 1000)
  })

  it('has reasonable change threshold', () => {
    expect(DEFAULT_AUTO_SAVE_CONFIG.changeThreshold).toBe(100)
  })

  it('has version limit', () => {
    expect(DEFAULT_AUTO_SAVE_CONFIG.maxVersions).toBe(50)
  })

  it('has retention policy', () => {
    expect(DEFAULT_AUTO_SAVE_CONFIG.retentionDays).toBe(90)
  })
})

// ============================================================================
// DiffOperation Enum
// ============================================================================

describe('DiffOperation', () => {
  it('has correct numeric values', () => {
    expect(DiffOperation.Delete).toBe(-1)
    expect(DiffOperation.Equal).toBe(0)
    expect(DiffOperation.Insert).toBe(1)
  })

  it('matches diff-match-patch convention', () => {
    // diff-match-patch uses -1, 0, 1
    expect(DiffOperation.Delete).toBe(-1)
    expect(DiffOperation.Equal).toBe(0)
    expect(DiffOperation.Insert).toBe(1)
  })
})
