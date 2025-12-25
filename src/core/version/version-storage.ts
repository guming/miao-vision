/**
 * Report Version Storage Service - IndexedDB
 *
 * Manages persistent storage of report versions using IndexedDB.
 *
 * Design Principles:
 * - Single responsibility: Only handles storage operations
 * - Type-safe with comprehensive error handling
 * - Easy to test (all async operations return promises)
 * - AI-friendly with clear documentation
 * - Extensible for future features
 *
 * Database Schema:
 * - Database: miaoshou-vision-versions
 * - Object Store: versions
 *   - keyPath: id
 *   - Indexes: reportId, timestamp, version, contentHash
 *
 * @module core/version/version-storage
 */

import { openDB, type IDBPDatabase } from 'idb'
import type {
  ReportVersion,
  VersionCollection,
  VersionFilterOptions
} from '@/types/version'

/** Database name */
const DB_NAME = 'miaoshou-vision-versions'

/** Current database version */
const DB_VERSION = 1

/** Object store name */
const STORE_NAME = 'versions'

/**
 * Storage service for report versions
 *
 * Singleton pattern - use getVersionStorage() to get instance
 */
class VersionStorage {
  private db: IDBPDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize database connection
   *
   * Safe to call multiple times - will reuse existing connection
   */
  async init(): Promise<void> {
    // Return existing initialization if in progress
    if (this.initPromise) {
      return this.initPromise
    }

    // Return immediately if already initialized
    if (this.db) {
      return
    }

    // Start initialization
    this.initPromise = this._doInit()
    return this.initPromise
  }

  /**
   * Internal initialization logic
   */
  private async _doInit(): Promise<void> {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create object store on first initialization
          if (oldVersion < 1) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

            // Create indexes for efficient querying
            store.createIndex('reportId', 'reportId', { unique: false })
            store.createIndex('timestamp', 'timestamp', { unique: false })
            store.createIndex('version', ['reportId', 'version'], { unique: true })
            store.createIndex('contentHash', 'contentHash', { unique: false })
          }
        }
      })
    } catch (error) {
      this.initPromise = null
      throw new Error(`Failed to initialize version database: ${error}`)
    }
  }

  /**
   * Ensure database is initialized
   *
   * @throws Error if database not initialized
   */
  private assertInitialized(): IDBPDatabase {
    if (!this.db) {
      throw new Error('Version storage not initialized. Call init() first.')
    }
    return this.db
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Save a new version
   *
   * @param version - Version to save
   * @throws Error if version with same ID already exists
   */
  async saveVersion(version: ReportVersion): Promise<void> {
    const db = this.assertInitialized()

    // Check if version already exists
    const existing = await db.get(STORE_NAME, version.id)
    if (existing) {
      throw new Error(`Version with ID ${version.id} already exists`)
    }

    await db.add(STORE_NAME, version)
  }

  /**
   * Update an existing version
   *
   * @param version - Version to update
   * @throws Error if version doesn't exist
   */
  async updateVersion(version: ReportVersion): Promise<void> {
    const db = this.assertInitialized()

    // Check if version exists
    const existing = await db.get(STORE_NAME, version.id)
    if (!existing) {
      throw new Error(`Version with ID ${version.id} not found`)
    }

    await db.put(STORE_NAME, version)
  }

  /**
   * Get version by ID
   *
   * @param id - Version ID
   * @returns Version or undefined if not found
   */
  async getVersion(id: string): Promise<ReportVersion | undefined> {
    const db = this.assertInitialized()
    return await db.get(STORE_NAME, id)
  }

  /**
   * Delete version by ID
   *
   * @param id - Version ID
   */
  async deleteVersion(id: string): Promise<void> {
    const db = this.assertInitialized()
    await db.delete(STORE_NAME, id)
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all versions for a report
   *
   * @param reportId - Report ID
   * @returns Array of versions sorted by version number (newest first)
   */
  async getVersionsByReport(reportId: string): Promise<ReportVersion[]> {
    const db = this.assertInitialized()
    const index = db.transaction(STORE_NAME).store.index('reportId')
    const versions = await index.getAll(reportId)

    // Sort by version number descending (newest first)
    return versions.sort((a, b) => b.version - a.version)
  }

  /**
   * Get latest version for a report
   *
   * @param reportId - Report ID
   * @returns Latest version or undefined if no versions exist
   */
  async getLatestVersion(reportId: string): Promise<ReportVersion | undefined> {
    const versions = await this.getVersionsByReport(reportId)
    return versions[0] // Already sorted newest first
  }

  /**
   * Get specific version number for a report
   *
   * @param reportId - Report ID
   * @param versionNumber - Version number
   * @returns Version or undefined if not found
   */
  async getVersionByNumber(
    reportId: string,
    versionNumber: number
  ): Promise<ReportVersion | undefined> {
    const db = this.assertInitialized()
    const index = db.transaction(STORE_NAME).store.index('version')
    return await index.get([reportId, versionNumber])
  }

  /**
   * Check if content already exists (by hash)
   *
   * Useful for detecting duplicate saves
   *
   * @param reportId - Report ID
   * @param contentHash - Content hash to check
   * @returns Version with matching hash or undefined
   */
  async findByContentHash(
    reportId: string,
    contentHash: string
  ): Promise<ReportVersion | undefined> {
    const db = this.assertInitialized()
    const index = db.transaction(STORE_NAME).store.index('contentHash')
    const versions = await index.getAll(contentHash)

    // Return first version for this report with matching hash
    return versions.find((v) => v.reportId === reportId)
  }

  /**
   * Filter versions with advanced options
   *
   * @param reportId - Report ID
   * @param options - Filter options
   * @returns Filtered and sorted versions
   */
  async filterVersions(
    reportId: string,
    options: VersionFilterOptions = {}
  ): Promise<ReportVersion[]> {
    let versions = await this.getVersionsByReport(reportId)

    // Filter by date range
    if (options.dateRange) {
      const { start, end } = options.dateRange
      versions = versions.filter((v) => {
        const ts = v.timestamp.getTime()
        return ts >= start.getTime() && ts <= end.getTime()
      })
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      versions = versions.filter((v) =>
        options.tags!.some((tag) => v.metadata.tags?.includes(tag))
      )
    }

    // Filter by author
    if (options.author) {
      versions = versions.filter((v) => v.metadata.author === options.author)
    }

    // Filter auto-saves
    if (options.includeAutoSaves === false) {
      versions = versions.filter((v) => !v.isAutoSave)
    }

    // Search in description
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase()
      versions = versions.filter(
        (v) =>
          v.metadata.description?.toLowerCase().includes(query) ||
          v.metadata.title?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sortBy = options.sortBy || 'timestamp'
    const sortDirection = options.sortDirection || 'desc'
    versions.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'timestamp') {
        comparison = a.timestamp.getTime() - b.timestamp.getTime()
      } else if (sortBy === 'version') {
        comparison = a.version - b.version
      } else if (sortBy === 'description') {
        comparison = (a.metadata.description || '').localeCompare(
          b.metadata.description || ''
        )
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    // Limit results
    if (options.limit && options.limit > 0) {
      versions = versions.slice(0, options.limit)
    }

    return versions
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all versions for a report as a collection
   *
   * Useful for export/backup
   *
   * @param reportId - Report ID
   * @returns Version collection with metadata
   */
  async getVersionCollection(reportId: string): Promise<VersionCollection> {
    const versions = await this.getVersionsByReport(reportId)

    if (versions.length === 0) {
      return {
        reportId,
        versions: [],
        exportedAt: new Date(),
        metadata: {
          totalVersions: 0,
          dateRange: {
            earliest: new Date(),
            latest: new Date()
          }
        }
      }
    }

    // Calculate metadata
    const timestamps = versions.map((v) => v.timestamp.getTime())
    const earliest = new Date(Math.min(...timestamps))
    const latest = new Date(Math.max(...timestamps))

    return {
      reportId,
      versions,
      exportedAt: new Date(),
      metadata: {
        reportTitle: versions[0]?.metadata.title,
        totalVersions: versions.length,
        dateRange: { earliest, latest }
      }
    }
  }

  /**
   * Delete all versions for a report
   *
   * @param reportId - Report ID
   * @returns Number of versions deleted
   */
  async deleteAllVersions(reportId: string): Promise<number> {
    const versions = await this.getVersionsByReport(reportId)
    const db = this.assertInitialized()

    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all([
      ...versions.map((v) => tx.store.delete(v.id)),
      tx.done
    ])

    return versions.length
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  /**
   * Delete old versions based on retention policy
   *
   * @param reportId - Report ID
   * @param retentionDays - Keep versions newer than this many days
   * @returns Number of versions deleted
   */
  async cleanupOldVersions(
    reportId: string,
    retentionDays: number
  ): Promise<number> {
    if (retentionDays <= 0) return 0

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const versions = await this.getVersionsByReport(reportId)
    const oldVersions = versions.filter((v) => v.timestamp < cutoffDate)

    const db = this.assertInitialized()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all([
      ...oldVersions.map((v) => tx.store.delete(v.id)),
      tx.done
    ])

    return oldVersions.length
  }

  /**
   * Keep only the N most recent versions
   *
   * @param reportId - Report ID
   * @param maxVersions - Maximum number of versions to keep
   * @returns Number of versions deleted
   */
  async keepRecentVersions(
    reportId: string,
    maxVersions: number
  ): Promise<number> {
    if (maxVersions <= 0) return 0

    const versions = await this.getVersionsByReport(reportId)

    // Already sorted newest first, so keep first N and delete rest
    if (versions.length <= maxVersions) return 0

    const versionsToDelete = versions.slice(maxVersions)

    const db = this.assertInitialized()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all([
      ...versionsToDelete.map((v) => tx.store.delete(v.id)),
      tx.done
    ])

    return versionsToDelete.length
  }

  /**
   * Get storage statistics for a report
   *
   * @param reportId - Report ID
   * @returns Storage statistics
   */
  async getStorageStats(reportId: string): Promise<{
    totalVersions: number
    totalSize: number
    averageSize: number
    oldestVersion: Date | null
    newestVersion: Date | null
  }> {
    const versions = await this.getVersionsByReport(reportId)

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        totalSize: 0,
        averageSize: 0,
        oldestVersion: null,
        newestVersion: null
      }
    }

    // Calculate sizes (approximate)
    const totalSize = versions.reduce(
      (sum, v) => sum + v.content.length + JSON.stringify(v.metadata).length,
      0
    )

    const timestamps = versions.map((v) => v.timestamp.getTime())

    return {
      totalVersions: versions.length,
      totalSize,
      averageSize: Math.round(totalSize / versions.length),
      oldestVersion: new Date(Math.min(...timestamps)),
      newestVersion: new Date(Math.max(...timestamps))
    }
  }

  // ============================================================================
  // Database Management
  // ============================================================================

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }

  /**
   * Delete entire database
   *
   * WARNING: This deletes ALL versions for ALL reports
   */
  async deleteDatabase(): Promise<void> {
    await this.close()
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/** Singleton instance */
let instance: VersionStorage | null = null

/**
 * Get version storage instance
 *
 * Always returns the same instance (singleton pattern)
 */
export function getVersionStorage(): VersionStorage {
  if (!instance) {
    instance = new VersionStorage()
  }
  return instance
}

/**
 * Initialize version storage
 *
 * Convenience function - same as getVersionStorage().init()
 */
export async function initVersionStorage(): Promise<void> {
  const storage = getVersionStorage()
  await storage.init()
}

/**
 * Export for testing purposes
 *
 * @internal
 */
export { VersionStorage }
