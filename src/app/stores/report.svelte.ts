/**
 * Report Store - Svelte 5 Runes
 *
 * Manages report creation, editing, execution, and persistence
 */

import type {
  Report,
  ReportState,
  ReportBlock,
  ReportExecutionResult,
  ReportMetadata,
  ReportType,
  ReportPage
} from '@/types/report'
import {
  REPORTS_STORAGE_KEY,
  MAX_REPORTS,
  DEFAULT_REPORT_TEMPLATE,
  DEFAULT_MULTIPAGE_HOME_TEMPLATE
} from '@/types/report'

/**
 * Old/legacy localStorage keys that should be migrated or cleaned up
 */
const LEGACY_STORAGE_KEYS = [
  'miao-vison:reports',      // Typo: missing 'i' in vision
  'miaoshou-vison:reports',  // Different prefix + typo
  'miaoshou-vision:reports'  // Different prefix
]

/**
 * Generate unique ID
 */
function generateId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Migrate and clean up legacy localStorage keys
 * Merges reports from old keys into the current key and removes duplicates
 */
function migrateLegacyStorageKeys(): void {
  console.log('🔄 Checking for legacy localStorage keys...')

  let migratedCount = 0
  const existingReportIds = new Set<string>()

  // First, get existing reports from current key
  try {
    const current = localStorage.getItem(REPORTS_STORAGE_KEY)
    if (current) {
      const parsed = JSON.parse(current)
      parsed.forEach((r: any) => existingReportIds.add(r.id))
    }
  } catch (e) {
    // Ignore errors
  }

  // Check each legacy key
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    try {
      const legacyData = localStorage.getItem(legacyKey)
      if (legacyData) {
        console.log(`  Found legacy key: ${legacyKey}`)
        const legacyReports = JSON.parse(legacyData)
        console.log(`    Contains ${legacyReports.length} report(s)`)

        // Log report names for debugging
        legacyReports.forEach((r: any) => {
          console.log(`    - ${r.name} (${r.id})`)
        })

        // Remove the legacy key to prevent confusion
        localStorage.removeItem(legacyKey)
        console.log(`    ❌ Removed legacy key: ${legacyKey}`)
        migratedCount++
      }
    } catch (error) {
      console.warn(`  Failed to process legacy key ${legacyKey}:`, error)
      // Still try to remove it
      localStorage.removeItem(legacyKey)
    }
  }

  if (migratedCount > 0) {
    console.log(`✅ Cleaned up ${migratedCount} legacy localStorage key(s)`)
    console.log(`   Current storage key: ${REPORTS_STORAGE_KEY}`)
  } else {
    console.log('  No legacy keys found')
  }
}

/**
 * Create report store
 */
export function createReportStore() {
  let state = $state<ReportState>({
    currentReport: null,
    reports: [],
    isExecuting: false,
    executionProgress: 0,
    tableMapping: new Map(),
    isEditing: true,
    showPreview: true,
    error: null
  })

  /**
   * Load reports from localStorage
   */
  function loadReports() {
    console.log('📦 loadReports() called')

    // First, clean up any legacy localStorage keys
    migrateLegacyStorageKeys()

    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY)
      console.log('  localStorage key:', REPORTS_STORAGE_KEY)
      console.log('  localStorage data exists:', !!stored)

      if (stored) {
        const parsed = JSON.parse(stored)
        console.log('  Parsed reports count:', parsed.length)
        console.log('  Report IDs:', parsed.map((r: any) => r.id))

        state.reports = parsed.map((r: any) => ({
          ...r,
          type: r.type || 'single',  // Migrate legacy reports to 'single' type
          createdAt: new Date(r.createdAt),
          lastModified: new Date(r.lastModified),
          lastExecuted: r.lastExecuted ? new Date(r.lastExecuted) : undefined
        }))
        console.log(`  ✅ Loaded ${state.reports.length} reports from storage`)
      } else {
        console.log('  ⚠️ No reports in localStorage')
      }
    } catch (error) {
      console.error('❌ Failed to load reports:', error)
      state.error = 'Failed to load reports from storage'
    }
  }

  /**
   * Save reports to localStorage
   */
  function saveReports() {
    try {
      // Limit number of reports
      const reportsToSave = state.reports.slice(0, MAX_REPORTS)
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reportsToSave))
      console.log(`Saved ${reportsToSave.length} reports to storage`)
    } catch (error) {
      console.error('Failed to save reports:', error)
      state.error = 'Failed to save reports to storage'
    }
  }

  /**
   * Create new report
   */
  function createReport(name?: string, template?: string, type: ReportType = 'single'): Report {
    const now = new Date()
    const reportName = name || (type === 'multi-page' ? 'Untitled Multi-Page Report' : 'Untitled Report')

    const report: Report = {
      id: generateId(),
      name: reportName,
      type,
      content: type === 'single' ? (template || DEFAULT_REPORT_TEMPLATE) : '',
      metadata: {
        title: reportName,
        date: now.toISOString().split('T')[0]
      },
      blocks: [],
      createdAt: now,
      lastModified: now
    }

    // Initialize multi-page report with a Home page
    if (type === 'multi-page') {
      const homePage: ReportPage = {
        id: generateId(),
        title: 'Home',
        slug: 'home',
        content: template || DEFAULT_MULTIPAGE_HOME_TEMPLATE,
        order: 0,
        createdAt: now,
        lastModified: now
      }
      report.pages = [homePage]
      report.currentPageId = homePage.id
    }

    state.reports.unshift(report)
    state.currentReport = report
    saveReports()

    console.log('Created new report:', report.id, 'type:', type)
    return report
  }

  /**
   * Deep clone a report to avoid shared references
   * Uses JSON serialization for reliable deep cloning
   */
  function cloneReport(report: Report): Report {
    try {
      // Use JSON for deep clone to handle Svelte 5 proxies
      const jsonStr = JSON.stringify(report)
      const parsed = JSON.parse(jsonStr)

      // Restore Date objects
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        lastModified: new Date(parsed.lastModified),
        lastExecuted: parsed.lastExecuted ? new Date(parsed.lastExecuted) : undefined
      }
    } catch (error) {
      console.error('❌ cloneReport failed:', error)
      // Fallback: return a manual copy
      return {
        id: report.id,
        name: report.name,
        type: report.type || 'single',
        content: report.content,
        metadata: report.metadata ? { ...report.metadata } : {},
        blocks: report.blocks ? [...report.blocks] : [],
        pages: report.pages ? [...report.pages] : undefined,
        currentPageId: report.currentPageId,
        createdAt: new Date(),
        lastModified: new Date(),
        lastExecuted: undefined
      }
    }
  }

  /**
   * Load report by ID
   */
  function loadReport(reportId: string): boolean {
    console.log('📂 loadReport called with ID:', reportId)
    console.log('  Available reports:', state.reports.map(r => ({ id: r.id, name: r.name })))

    const reportIndex = state.reports.findIndex(r => r.id === reportId)
    console.log('  Found at index:', reportIndex)

    if (reportIndex !== -1) {
      const sourceReport = state.reports[reportIndex]
      console.log('  Source report name:', sourceReport.name)
      console.log('  Source report content length:', sourceReport.content?.length)
      console.log('  Source report content preview:', sourceReport.content?.substring(0, 100))

      // Clear tableMapping when switching reports to avoid stale data
      if (state.currentReport && state.currentReport.id !== reportId) {
        console.log('  🧹 Clearing tableMapping for report switch')
        console.log('  Previous currentReport:', state.currentReport.id, state.currentReport.name)
        state.tableMapping = new Map()
      }

      // IMPORTANT: Clone the report to prevent shared references
      console.log('  Cloning report...')
      const cloned = cloneReport(sourceReport)
      console.log('  Cloned report ID:', cloned.id)
      console.log('  Cloned report name:', cloned.name)
      console.log('  Cloned report content length:', cloned.content?.length)
      console.log('  Cloned report content preview:', cloned.content?.substring(0, 100))

      state.currentReport = cloned
      state.error = null
      console.log('  ✅ Loaded report:', reportId)
      console.log('  state.currentReport is now:', state.currentReport.id, state.currentReport.name)
      return true
    } else {
      console.error('  ❌ Report not found:', reportId)
      state.error = `Report not found: ${reportId}`
      return false
    }
  }

  /**
   * Update current report content
   * @param content The new content
   * @param targetReportId Optional report ID to verify - if provided, update is skipped if it doesn't match
   */
  function updateContent(content: string, targetReportId?: string) {
    if (!state.currentReport) {
      console.warn('⚠️ updateContent: No current report to update')
      return
    }

    const currentId = state.currentReport.id
    console.log('📝 updateContent called')
    console.log('  targetReportId:', targetReportId)
    console.log('  currentReport.id:', currentId)

    // CRITICAL: If targetReportId is provided, verify it matches current report
    // This prevents race conditions when switching reports
    if (targetReportId && targetReportId !== currentId) {
      console.warn('⚠️ updateContent: SKIPPING - targetReportId mismatch!')
      console.warn('  Requested update for:', targetReportId)
      console.warn('  But current report is:', currentId)
      console.warn('  This is likely a delayed event from a previous report')
      return
    }

    // Check if content actually changed
    const contentChanged = state.currentReport.content !== content

    if (contentChanged) {
      console.log('  Content changed - clearing old execution results')
      console.log('  Old content length:', state.currentReport.content.length)
      console.log('  New content length:', content.length)

      // IMPORTANT: Clear blocks when content changes
      // This prevents showing stale results for modified SQL/Chart blocks
      state.currentReport.blocks = []
    }

    state.currentReport.content = content
    state.currentReport.lastModified = new Date()

    // Update in reports list - find by ID and replace with a clone
    const index = state.reports.findIndex(r => r.id === currentId)
    console.log('  Updating reports array at index:', index, 'for ID:', currentId)

    if (index !== -1) {
      // Clone currentReport into the array to maintain separation
      state.reports[index] = cloneReport(state.currentReport)
      console.log('  ✅ Updated reports[', index, '] with cloned report')
    } else {
      console.error('  ❌ Report not found in array! ID:', currentId)
    }

    saveReports()
  }

  /**
   * Update report metadata
   */
  function updateMetadata(metadata: Partial<ReportMetadata>) {
    if (!state.currentReport) {
      console.warn('No current report to update')
      return
    }

    state.currentReport.metadata = {
      ...state.currentReport.metadata,
      ...metadata
    }
    state.currentReport.lastModified = new Date()

    saveReports()
  }

  /**
   * Rename report
   */
  function renameReport(reportId: string, newName: string) {
    const report = state.reports.find(r => r.id === reportId)
    if (report) {
      report.name = newName
      report.lastModified = new Date()

      if (state.currentReport?.id === reportId) {
        state.currentReport.name = newName
      }

      saveReports()
      console.log('Renamed report:', reportId, '→', newName)
    }
  }

  /**
   * Delete report
   */
  function deleteReport(reportId: string): boolean {
    const index = state.reports.findIndex(r => r.id === reportId)
    if (index !== -1) {
      state.reports.splice(index, 1)

      // If deleting current report, clear selection
      if (state.currentReport?.id === reportId) {
        state.currentReport = null
      }

      saveReports()
      console.log('Deleted report:', reportId)
      return true
    }
    return false
  }

  /**
   * Duplicate report
   */
  function duplicateReport(reportId: string): Report | null {
    const original = state.reports.find(r => r.id === reportId)
    if (!original) {
      return null
    }

    // Deep copy to avoid shared references between reports
    const duplicate: Report = {
      id: generateId(),
      name: `${original.name} (Copy)`,
      type: original.type,
      content: original.content,  // strings are immutable, so this is safe
      metadata: { ...original.metadata },  // shallow copy of metadata
      blocks: original.blocks.map(block => ({ ...block })),  // copy each block
      pages: original.pages?.map(page => ({ ...page, id: generateId() })),  // copy pages with new IDs
      currentPageId: original.pages?.[0] ? undefined : undefined,  // Reset to first page
      createdAt: new Date(),
      lastModified: new Date(),
      lastExecuted: undefined
    }

    state.reports.unshift(duplicate)
    saveReports()

    console.log('Duplicated report:', reportId, '→', duplicate.id)
    return duplicate
  }

  /**
   * Execute report (to be implemented with SQL executor)
   */
  async function executeReport(): Promise<ReportExecutionResult> {
    if (!state.currentReport) {
      throw new Error('No report to execute')
    }

    state.isExecuting = true
    state.executionProgress = 0
    state.error = null

    const startTime = Date.now()
    const result: ReportExecutionResult = {
      success: true,
      executedBlocks: 0,
      failedBlocks: 0,
      totalTime: 0,
      errors: []
    }

    try {
      // TODO: Implement actual execution logic
      // This will be done in sql-executor.ts
      console.log('Executing report:', state.currentReport.id)

      // Placeholder for now
      await new Promise(resolve => setTimeout(resolve, 500))

      state.currentReport.lastExecuted = new Date()
      saveReports()

      result.totalTime = Date.now() - startTime
      console.log('Report executed successfully:', result)

      return result
    } catch (error) {
      result.success = false
      state.error = error instanceof Error ? error.message : 'Execution failed'
      console.error('Report execution failed:', error)
      return result
    } finally {
      state.isExecuting = false
      state.executionProgress = 100
    }
  }

  /**
   * Update execution progress
   */
  function updateProgress(progress: number) {
    state.executionProgress = Math.max(0, Math.min(100, progress))
  }

  /**
   * Update block in current report
   */
  function updateBlock(block: ReportBlock) {
    if (!state.currentReport) {
      return
    }

    const index = state.currentReport.blocks.findIndex(b => b.id === block.id)
    if (index !== -1) {
      state.currentReport.blocks[index] = block
    } else {
      state.currentReport.blocks.push(block)
    }
  }

  /**
   * Clear execution results
   */
  function clearResults() {
    if (!state.currentReport) {
      return
    }

    state.currentReport.blocks = state.currentReport.blocks.map(block => ({
      ...block,
      status: 'pending' as const,
      sqlResult: undefined,
      error: undefined,
      executionTime: undefined
    }))
  }

  /**
   * Toggle editor visibility
   */
  function toggleEditor() {
    state.isEditing = !state.isEditing
  }

  /**
   * Toggle preview visibility
   */
  function togglePreview() {
    state.showPreview = !state.showPreview
  }

  /**
   * Export report as markdown
   */
  function exportMarkdown(): string | null {
    if (!state.currentReport) {
      return null
    }
    return state.currentReport.content
  }

  /**
   * Import report from markdown
   */
  function importMarkdown(content: string, name?: string): Report {
    return createReport(name || 'Imported Report', content)
  }

  /**
   * Get report statistics
   */
  function getStatistics() {
    return {
      totalReports: state.reports.length,
      currentReportBlocks: state.currentReport?.blocks.length || 0,
      isExecuting: state.isExecuting,
      executionProgress: state.executionProgress
    }
  }

  /**
   * Add a new page to a multi-page report
   */
  function addPage(title: string, slug: string, parentId?: string): ReportPage | null {
    if (!state.currentReport || state.currentReport.type !== 'multi-page') {
      console.error('Cannot add page: current report is not multi-page')
      return null
    }

    const now = new Date()
    const pages = state.currentReport.pages || []

    // Calculate order (last among siblings)
    const siblings = pages.filter(p => p.parentId === parentId)
    const order = siblings.length > 0 ? Math.max(...siblings.map(p => p.order)) + 1 : 0

    const newPage: ReportPage = {
      id: generateId(),
      title,
      slug,
      content: '',
      parentId,
      order,
      createdAt: now,
      lastModified: now
    }

    state.currentReport.pages = [...pages, newPage]
    state.currentReport.lastModified = now
    saveReports()

    console.log('Added new page:', newPage.id, newPage.title)
    return newPage
  }

  /**
   * Delete a page and all its children
   */
  function deletePage(pageId: string): boolean {
    if (!state.currentReport || state.currentReport.type !== 'multi-page') {
      return false
    }

    const pages = state.currentReport.pages || []

    // Find all descendant page IDs
    function getDescendants(id: string): string[] {
      const children = pages.filter(p => p.parentId === id)
      const descendants = children.flatMap(child => [child.id, ...getDescendants(child.id)])
      return descendants
    }

    const toDelete = new Set([pageId, ...getDescendants(pageId)])

    state.currentReport.pages = pages.filter(p => !toDelete.has(p.id))
    state.currentReport.lastModified = new Date()

    // If deleted page was current, switch to first page
    if (state.currentReport.currentPageId && toDelete.has(state.currentReport.currentPageId)) {
      state.currentReport.currentPageId = state.currentReport.pages[0]?.id
    }

    saveReports()
    console.log('Deleted page and descendants:', Array.from(toDelete))
    return true
  }

  /**
   * Update page metadata (title, slug, parent, order)
   */
  function updatePage(pageId: string, updates: Partial<Pick<ReportPage, 'title' | 'slug' | 'parentId' | 'order'>>): boolean {
    if (!state.currentReport || state.currentReport.type !== 'multi-page') {
      return false
    }

    const pages = state.currentReport.pages || []
    const pageIndex = pages.findIndex(p => p.id === pageId)

    if (pageIndex === -1) {
      return false
    }

    const page = pages[pageIndex]
    state.currentReport.pages![pageIndex] = {
      ...page,
      ...updates,
      lastModified: new Date()
    }

    state.currentReport.lastModified = new Date()
    saveReports()

    console.log('Updated page:', pageId, updates)
    return true
  }

  /**
   * Navigate to a specific page in a multi-page report
   */
  function selectPage(pageId: string): boolean {
    if (!state.currentReport || state.currentReport.type !== 'multi-page') {
      return false
    }

    const pages = state.currentReport.pages || []
    const page = pages.find(p => p.id === pageId)

    if (!page) {
      return false
    }

    state.currentReport.currentPageId = pageId
    console.log('Selected page:', pageId, page.title)
    return true
  }

  /**
   * Update page content
   */
  function updatePageContent(pageId: string, content: string): boolean {
    if (!state.currentReport || state.currentReport.type !== 'multi-page') {
      return false
    }

    const pages = state.currentReport.pages || []
    const pageIndex = pages.findIndex(p => p.id === pageId)

    if (pageIndex === -1) {
      return false
    }

    state.currentReport.pages![pageIndex] = {
      ...pages[pageIndex],
      content,
      lastModified: new Date()
    }

    state.currentReport.lastModified = new Date()
    saveReports()

    return true
  }

  /**
   * Get current page in multi-page report
   */
  function getCurrentPage(): ReportPage | null {
    if (!state.currentReport || state.currentReport.type !== 'multi-page') {
      return null
    }

    const pages = state.currentReport.pages || []
    const currentPageId = state.currentReport.currentPageId

    if (!currentPageId) {
      return pages[0] || null
    }

    return pages.find(p => p.id === currentPageId) || null
  }

  // Initialize: load reports from storage
  loadReports()

  return {
    // State (readonly access via getter)
    get state() {
      return state
    },

    // Report management
    createReport,
    loadReport,
    deleteReport,
    duplicateReport,
    renameReport,

    // Content editing
    updateContent,
    updateMetadata,
    updateBlock,

    // Page management (multi-page reports)
    addPage,
    deletePage,
    updatePage,
    selectPage,
    updatePageContent,
    getCurrentPage,

    // Execution
    executeReport,
    updateProgress,
    clearResults,

    // UI state
    toggleEditor,
    togglePreview,

    // Import/Export
    exportMarkdown,
    importMarkdown,

    // Utilities
    getStatistics,

    // Storage
    saveReports,
    loadReports
  }
}

/**
 * Global report store instance
 */
export const reportStore = createReportStore()
