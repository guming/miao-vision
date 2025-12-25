/**
 * Version Control Store - Svelte 5 Runes
 *
 * Manages report version control, diff, and history
 *
 * Design Principles:
 * - Reactive state using Svelte 5 runes
 * - Wraps version storage service
 * - Easy to test (most logic in storage service)
 * - AI-friendly with clear documentation
 * - Extensible for future features
 */

import type {
  ReportVersion,
  VersionCollection,
  VersionFilterOptions,
  AutoSaveConfig,
  DiffResult,
  RestoreOptions
} from '@/types/version'
import {
  DEFAULT_AUTO_SAVE_CONFIG,
  createContentHash,
  generateVersionId
} from '@/types/version'
import { getVersionStorage } from '@core/version'

/**
 * Version store state
 */
interface VersionState {
  /** All versions for current report */
  versions: ReportVersion[]

  /** Currently selected version for viewing/comparing */
  selectedVersion: ReportVersion | null

  /** Version being compared with (for diff view) */
  compareVersion: ReportVersion | null

  /** Diff result between selectedVersion and compareVersion */
  diffResult: DiffResult | null

  /** Loading state */
  isLoading: boolean

  /** Saving state */
  isSaving: boolean

  /** Error message */
  error: string | null

  /** Auto-save configuration */
  autoSaveConfig: AutoSaveConfig

  /** Last auto-save timestamp */
  lastAutoSave: Date | null

  /** Pending changes count (for auto-save trigger) */
  pendingChangesCount: number
}

/**
 * Create version control store
 */
export function createVersionStore() {
  let state = $state<VersionState>({
    versions: [],
    selectedVersion: null,
    compareVersion: null,
    diffResult: null,
    isLoading: false,
    isSaving: false,
    error: null,
    autoSaveConfig: { ...DEFAULT_AUTO_SAVE_CONFIG },
    lastAutoSave: null,
    pendingChangesCount: 0
  })

  // Auto-save timer ID
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  // Storage instance (lazy initialization)
  const storage = getVersionStorage()

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize version storage
   */
  async function init(): Promise<void> {
    try {
      await storage.init()
      console.log('✅ Version storage initialized')
    } catch (error) {
      console.error('❌ Failed to initialize version storage:', error)
      state.error = 'Failed to initialize version storage'
    }
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  /**
   * Load all versions for a report
   *
   * @param reportId - Report ID
   */
  async function loadVersions(reportId: string): Promise<void> {
    state.isLoading = true
    state.error = null

    try {
      const versions = await storage.getVersionsByReport(reportId)
      state.versions = versions
      console.log(`✅ Loaded ${versions.length} versions for report ${reportId}`)
    } catch (error) {
      console.error('❌ Failed to load versions:', error)
      state.error = 'Failed to load versions'
      state.versions = []
    } finally {
      state.isLoading = false
    }
  }

  /**
   * Create a new version
   *
   * @param reportId - Report ID
   * @param content - Report content (Markdown)
   * @param description - Optional description
   * @param isAutoSave - Whether this is an auto-save
   * @returns Created version or null on error
   */
  async function createVersion(
    reportId: string,
    content: string,
    description?: string,
    isAutoSave = false
  ): Promise<ReportVersion | null> {
    state.isSaving = true
    state.error = null

    try {
      // Calculate content hash
      const contentHash = await createContentHash(content)

      // Check if content already exists (avoid duplicate saves)
      const existing = await storage.findByContentHash(reportId, contentHash)
      if (existing) {
        console.log('⚠️ Version with same content already exists:', existing.id)
        state.isSaving = false
        return existing
      }

      // Get next version number
      const latestVersion = await storage.getLatestVersion(reportId)
      const versionNumber = latestVersion ? latestVersion.version + 1 : 1

      // Create version
      const version: ReportVersion = {
        id: generateVersionId(),
        reportId,
        version: versionNumber,
        timestamp: new Date(),
        content,
        metadata: {
          description,
          contentLength: content.length
        },
        parentId: latestVersion?.id,
        isAutoSave,
        contentHash
      }

      await storage.saveVersion(version)
      state.versions.unshift(version) // Add to beginning (newest first)

      console.log(`✅ Created version ${versionNumber} for report ${reportId}`)

      // Update auto-save timestamp
      if (isAutoSave) {
        state.lastAutoSave = new Date()
      }

      // Reset pending changes
      state.pendingChangesCount = 0

      return version
    } catch (error) {
      console.error('❌ Failed to create version:', error)
      state.error = 'Failed to create version'
      return null
    } finally {
      state.isSaving = false
    }
  }

  /**
   * Delete a version
   *
   * @param versionId - Version ID
   */
  async function deleteVersion(versionId: string): Promise<boolean> {
    try {
      await storage.deleteVersion(versionId)

      // Remove from state
      state.versions = state.versions.filter((v) => v.id !== versionId)

      // Clear selection if deleted
      if (state.selectedVersion?.id === versionId) {
        state.selectedVersion = null
      }
      if (state.compareVersion?.id === versionId) {
        state.compareVersion = null
        state.diffResult = null
      }

      console.log(`✅ Deleted version ${versionId}`)
      return true
    } catch (error) {
      console.error('❌ Failed to delete version:', error)
      state.error = 'Failed to delete version'
      return false
    }
  }

  /**
   * Delete all versions for a report
   *
   * @param reportId - Report ID
   */
  async function deleteAllVersions(reportId: string): Promise<number> {
    try {
      const count = await storage.deleteAllVersions(reportId)
      state.versions = []
      state.selectedVersion = null
      state.compareVersion = null
      state.diffResult = null

      console.log(`✅ Deleted ${count} versions for report ${reportId}`)
      return count
    } catch (error) {
      console.error('❌ Failed to delete versions:', error)
      state.error = 'Failed to delete versions'
      return 0
    }
  }

  // ============================================================================
  // Version Selection & Comparison
  // ============================================================================

  /**
   * Select a version for viewing
   *
   * @param version - Version to select
   */
  function selectVersion(version: ReportVersion | null): void {
    state.selectedVersion = version
    // Clear diff when selecting new version
    state.diffResult = null
  }

  /**
   * Set version for comparison
   *
   * @param version - Version to compare with
   */
  function setCompareVersion(version: ReportVersion | null): void {
    state.compareVersion = version
    // Clear diff when changing compare version
    state.diffResult = null
  }

  /**
   * Compare two versions using diff service
   *
   * @param fromVersion - Older version
   * @param toVersion - Newer version
   * @returns Diff result
   */
  async function compareVersionsAsync(
    fromVersion: ReportVersion,
    toVersion: ReportVersion
  ): Promise<DiffResult | null> {
    try {
      // Import diff service dynamically to avoid circular dependencies
      const { compareVersions: compareVersionsSync } = await import('@core/version')

      const diffResult = compareVersionsSync(fromVersion, toVersion, {
        semanticCleanup: true,
        ignoreWhitespace: false
      })

      state.diffResult = diffResult
      console.log(`✅ Compared versions ${fromVersion.version} and ${toVersion.version}`)
      return diffResult
    } catch (error) {
      console.error('❌ Failed to compare versions:', error)
      state.error = 'Failed to compare versions'
      return null
    }
  }

  // ============================================================================
  // Version Restore
  // ============================================================================

  /**
   * Restore a version
   *
   * @param version - Version to restore
   * @param options - Restore options
   * @returns Restored version content
   */
  async function restoreVersion(
    version: ReportVersion,
    options: RestoreOptions = { mode: 'new-version' }
  ): Promise<string | null> {
    try {
      if (options.mode === 'new-version') {
        // Create a new version with the restored content
        const newVersion = await createVersion(
          version.reportId,
          version.content,
          options.description || `Restored from version ${version.version}`,
          false
        )

        if (newVersion) {
          console.log(`✅ Restored version ${version.version} as new version ${newVersion.version}`)
          return version.content
        }
      } else if (options.mode === 'overwrite') {
        // Just return the content - caller will handle overwriting
        console.log(`✅ Restoring version ${version.version} (overwrite mode)`)
        return version.content
      }

      return null
    } catch (error) {
      console.error('❌ Failed to restore version:', error)
      state.error = 'Failed to restore version'
      return null
    }
  }

  // ============================================================================
  // Filtering & Search
  // ============================================================================

  /**
   * Filter versions
   *
   * @param reportId - Report ID
   * @param options - Filter options
   */
  async function filterVersions(
    reportId: string,
    options: VersionFilterOptions
  ): Promise<void> {
    state.isLoading = true
    state.error = null

    try {
      const versions = await storage.filterVersions(reportId, options)
      state.versions = versions
      console.log(`✅ Filtered to ${versions.length} versions`)
    } catch (error) {
      console.error('❌ Failed to filter versions:', error)
      state.error = 'Failed to filter versions'
      state.versions = []
    } finally {
      state.isLoading = false
    }
  }

  // ============================================================================
  // Auto-Save
  // ============================================================================

  /**
   * Update auto-save configuration
   *
   * @param config - Partial config to update
   */
  function updateAutoSaveConfig(config: Partial<AutoSaveConfig>): void {
    state.autoSaveConfig = {
      ...state.autoSaveConfig,
      ...config
    }

    // Restart auto-save timer with new config
    if (state.autoSaveConfig.enabled) {
      startAutoSave()
    } else {
      stopAutoSave()
    }
  }

  /**
   * Start auto-save timer
   */
  function startAutoSave(): void {
    // Clear existing timer
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
    }

    if (!state.autoSaveConfig.enabled) {
      return
    }

    // This is just a timer - actual save is triggered by content changes
    // via the triggerAutoSave() function
    console.log(`✅ Auto-save enabled (interval: ${state.autoSaveConfig.interval}ms)`)
  }

  /**
   * Stop auto-save timer
   */
  function stopAutoSave(): void {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
    console.log('⏹️ Auto-save stopped')
  }

  /**
   * Trigger auto-save if conditions are met
   *
   * Call this when report content changes
   *
   * @param reportId - Report ID
   * @param content - Current report content
   * @param changeCount - Number of characters changed
   */
  async function triggerAutoSave(
    reportId: string,
    content: string,
    changeCount: number
  ): Promise<void> {
    if (!state.autoSaveConfig.enabled) {
      return
    }

    // Update pending changes
    state.pendingChangesCount += changeCount

    // Check if threshold is met
    if (state.pendingChangesCount < state.autoSaveConfig.changeThreshold) {
      return
    }

    // Check if interval has passed since last auto-save
    if (state.lastAutoSave) {
      const elapsed = Date.now() - state.lastAutoSave.getTime()
      if (elapsed < state.autoSaveConfig.interval) {
        return
      }
    }

    // Create auto-save version
    await createVersion(reportId, content, 'Auto-save', true)

    // Clean up old versions if configured
    if (state.autoSaveConfig.maxVersions > 0) {
      await storage.keepRecentVersions(reportId, state.autoSaveConfig.maxVersions)
      // Reload versions to reflect cleanup
      await loadVersions(reportId)
    }

    if (state.autoSaveConfig.retentionDays > 0) {
      await storage.cleanupOldVersions(reportId, state.autoSaveConfig.retentionDays)
      // Reload versions to reflect cleanup
      await loadVersions(reportId)
    }
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  /**
   * Export version collection
   *
   * @param reportId - Report ID
   * @returns Version collection for export
   */
  async function exportVersions(reportId: string): Promise<VersionCollection | null> {
    try {
      const collection = await storage.getVersionCollection(reportId)
      console.log(`✅ Exported ${collection.versions.length} versions`)
      return collection
    } catch (error) {
      console.error('❌ Failed to export versions:', error)
      state.error = 'Failed to export versions'
      return null
    }
  }

  /**
   * Get storage statistics
   *
   * @param reportId - Report ID
   */
  async function getStorageStats(reportId: string) {
    try {
      return await storage.getStorageStats(reportId)
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error)
      return null
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup old versions
   *
   * @param reportId - Report ID
   * @param retentionDays - Keep versions newer than this many days
   */
  async function cleanupOldVersions(
    reportId: string,
    retentionDays: number
  ): Promise<number> {
    try {
      const count = await storage.cleanupOldVersions(reportId, retentionDays)
      // Reload versions to reflect cleanup
      await loadVersions(reportId)
      console.log(`✅ Cleaned up ${count} old versions`)
      return count
    } catch (error) {
      console.error('❌ Failed to cleanup versions:', error)
      state.error = 'Failed to cleanup versions'
      return 0
    }
  }

  // Initialize storage on creation
  init()

  return {
    // State (readonly access via getter)
    get state() {
      return state
    },

    // Initialization
    init,

    // Version management
    loadVersions,
    createVersion,
    deleteVersion,
    deleteAllVersions,

    // Selection & comparison
    selectVersion,
    setCompareVersion,
    compareVersions: compareVersionsAsync,

    // Restore
    restoreVersion,

    // Filtering
    filterVersions,

    // Auto-save
    updateAutoSaveConfig,
    startAutoSave,
    stopAutoSave,
    triggerAutoSave,

    // Export/Import
    exportVersions,
    getStorageStats,

    // Cleanup
    cleanupOldVersions
  }
}

/**
 * Global version store instance
 */
export const versionStore = createVersionStore()
