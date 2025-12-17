/**
 * Query Workspace Store
 *
 * Manages SQL workspace state: tabs, history, active query
 */

import type { QueryResult } from '@/types/database'

export interface QueryTab {
  id: string
  name: string
  sql: string
  result: QueryResult | null
  error: string | null
  isExecuting: boolean
  createdAt: number
}

export interface QueryHistoryItem {
  id: string
  sql: string
  executedAt: number
  rowCount: number
  executionTime: number
  success: boolean
}

export interface QueryWorkspaceState {
  tabs: QueryTab[]
  activeTabId: string | null
  history: QueryHistoryItem[]
  sidebarCollapsed: boolean
}

const STORAGE_KEY = 'miao-vision-query-workspace'
const MAX_HISTORY_ITEMS = 50

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function loadFromStorage(): Partial<QueryWorkspaceState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      // Clear execution state on load
      if (data.tabs) {
        data.tabs = data.tabs.map((tab: QueryTab) => ({
          ...tab,
          result: null,
          error: null,
          isExecuting: false
        }))
      }
      return data
    }
  } catch (e) {
    console.warn('Failed to load query workspace from storage:', e)
  }
  return {}
}

function saveToStorage(state: QueryWorkspaceState) {
  try {
    const toSave = {
      tabs: state.tabs.map(tab => ({
        id: tab.id,
        name: tab.name,
        sql: tab.sql,
        createdAt: tab.createdAt
      })),
      activeTabId: state.activeTabId,
      history: state.history.slice(0, MAX_HISTORY_ITEMS),
      sidebarCollapsed: state.sidebarCollapsed
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.warn('Failed to save query workspace to storage:', e)
  }
}

export function createQueryWorkspaceStore() {
  const stored = loadFromStorage()

  const defaultTab: QueryTab = {
    id: generateId(),
    name: 'Query 1',
    sql: '-- Write your SQL query here\n-- Upload a file first, then query the table\n-- Example: SELECT * FROM my_table LIMIT 10;\n\nSHOW TABLES;',
    result: null,
    error: null,
    isExecuting: false,
    createdAt: Date.now()
  }

  let state = $state<QueryWorkspaceState>({
    tabs: stored.tabs?.length ? stored.tabs.map(t => ({
      ...t,
      result: null,
      error: null,
      isExecuting: false
    })) : [defaultTab],
    activeTabId: stored.activeTabId || defaultTab.id,
    history: stored.history || [],
    sidebarCollapsed: stored.sidebarCollapsed ?? false
  })

  // Derived: active tab
  const activeTab = $derived(state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0])

  function createTab(sql?: string): QueryTab {
    const tabNumber = state.tabs.length + 1
    const newTab: QueryTab = {
      id: generateId(),
      name: `Query ${tabNumber}`,
      sql: sql || '-- New query\n',
      result: null,
      error: null,
      isExecuting: false,
      createdAt: Date.now()
    }
    state.tabs = [...state.tabs, newTab]
    state.activeTabId = newTab.id
    saveToStorage(state)
    return newTab
  }

  function closeTab(tabId: string) {
    if (state.tabs.length <= 1) {
      // Don't close the last tab, just reset it
      const tab = state.tabs[0]
      tab.sql = '-- Write your SQL query here\n'
      tab.result = null
      tab.error = null
      saveToStorage(state)
      return
    }

    const index = state.tabs.findIndex(t => t.id === tabId)
    state.tabs = state.tabs.filter(t => t.id !== tabId)

    // If closing active tab, switch to adjacent tab
    if (state.activeTabId === tabId) {
      const newIndex = Math.min(index, state.tabs.length - 1)
      state.activeTabId = state.tabs[newIndex].id
    }
    saveToStorage(state)
  }

  function setActiveTab(tabId: string) {
    if (state.tabs.some(t => t.id === tabId)) {
      state.activeTabId = tabId
      saveToStorage(state)
    }
  }

  function updateTabSql(tabId: string, sql: string) {
    const tab = state.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.sql = sql
      saveToStorage(state)
    }
  }

  function renameTab(tabId: string, name: string) {
    const tab = state.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.name = name.trim() || tab.name
      saveToStorage(state)
    }
  }

  function setTabExecuting(tabId: string, isExecuting: boolean) {
    const tab = state.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.isExecuting = isExecuting
      if (isExecuting) {
        tab.error = null
      }
    }
  }

  function setTabResult(tabId: string, result: QueryResult | null, error: string | null = null) {
    const tab = state.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.result = result
      tab.error = error
      tab.isExecuting = false
    }
  }

  function addToHistory(sql: string, result: QueryResult | null, success: boolean) {
    const trimmedSql = sql.trim()
    if (!trimmedSql) return

    const historyItem: QueryHistoryItem = {
      id: generateId(),
      sql: trimmedSql,
      executedAt: Date.now(),
      rowCount: result?.rowCount || 0,
      executionTime: result?.executionTime || 0,
      success
    }

    // Add to beginning, remove duplicates
    state.history = [
      historyItem,
      ...state.history.filter(h => h.sql !== trimmedSql)
    ].slice(0, MAX_HISTORY_ITEMS)

    saveToStorage(state)
  }

  function loadFromHistory(historyId: string) {
    const item = state.history.find(h => h.id === historyId)
    if (item && activeTab) {
      activeTab.sql = item.sql
      activeTab.result = null
      activeTab.error = null
      saveToStorage(state)
    }
  }

  function clearHistory() {
    state.history = []
    saveToStorage(state)
  }

  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed
    saveToStorage(state)
  }

  function insertTextAtCursor(text: string) {
    if (activeTab) {
      // This will be handled by the editor component
      // Just update the SQL for now
      activeTab.sql = activeTab.sql + '\n' + text
      saveToStorage(state)
    }
  }

  return {
    get state() { return state },
    get activeTab() { return activeTab },
    createTab,
    closeTab,
    setActiveTab,
    updateTabSql,
    renameTab,
    setTabExecuting,
    setTabResult,
    addToHistory,
    loadFromHistory,
    clearHistory,
    toggleSidebar,
    insertTextAtCursor
  }
}

export const queryWorkspaceStore = createQueryWorkspaceStore()
