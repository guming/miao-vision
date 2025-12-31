/**
 * Query Cache Service
 *
 * Caches query results with TTL and LRU eviction.
 * Improves performance for repeated queries.
 *
 * @module core/database/query-cache
 */

import type { QueryResult } from '@/types/database'

/**
 * Cache entry
 */
interface CacheEntry {
  /** Cached query result */
  result: QueryResult
  /** Cache key (query hash) */
  key: string
  /** Original SQL query */
  sql: string
  /** Timestamp when cached */
  cachedAt: number
  /** Timestamp when entry expires */
  expiresAt: number
  /** Size in bytes (estimated) */
  size: number
  /** Number of times accessed */
  accessCount: number
  /** Last accessed timestamp */
  lastAccessedAt: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of entries in cache */
  entries: number
  /** Total size in bytes */
  totalSize: number
  /** Maximum size in bytes */
  maxSize: number
  /** Cache hit count */
  hits: number
  /** Cache miss count */
  misses: number
  /** Hit rate percentage */
  hitRate: number
  /** Oldest entry age in ms */
  oldestAge: number
  /** Average entry age in ms */
  averageAge: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum cache size in bytes */
  maxSize?: number
  /** Default TTL in milliseconds */
  defaultTTL?: number
  /** Maximum number of entries */
  maxEntries?: number
  /** Enable cache persistence to localStorage */
  persist?: boolean
  /** localStorage key for persistence */
  storageKey?: string
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  maxSize: 50 * 1024 * 1024, // 50MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  persist: false,
  storageKey: 'miao-vision-query-cache'
}

/**
 * Simple hash function for cache keys
 */
function hashQuery(sql: string): string {
  let hash = 0
  const str = sql.trim().toLowerCase()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `q_${Math.abs(hash).toString(36)}`
}

/**
 * Estimate size of a query result in bytes
 */
function estimateSize(result: QueryResult): number {
  // Rough estimation: JSON stringify length * 2 (for Unicode)
  try {
    return JSON.stringify(result).length * 2
  } catch {
    // Fallback: estimate based on row count and column count
    return result.rowCount * result.columns.length * 50
  }
}

/**
 * Normalize SQL for consistent cache keys
 */
function normalizeSQL(sql: string): string {
  return sql
    .trim()
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .replace(/;\s*$/, '')      // Remove trailing semicolon
    .toLowerCase()
}

/**
 * Check if a query is cacheable
 * SELECT queries are cacheable, DDL/DML are not
 */
function isCacheable(sql: string): boolean {
  const normalized = normalizeSQL(sql)

  // Only cache SELECT queries
  if (!normalized.startsWith('select')) {
    return false
  }

  // Don't cache queries with non-deterministic functions
  const nonDeterministic = [
    'random()',
    'uuid()',
    'now()',
    'current_timestamp',
    'current_date',
    'current_time'
  ]

  return !nonDeterministic.some(fn => normalized.includes(fn))
}

/**
 * Query Cache Service
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry>()
  private config: Required<CacheConfig>
  private hits = 0
  private misses = 0

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Load from localStorage if persistence is enabled
    if (this.config.persist) {
      this.loadFromStorage()
    }

    // Set up periodic cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60000) // Cleanup every minute
    }
  }

  /**
   * Get cached result for a query
   */
  get(sql: string): QueryResult | null {
    const key = hashQuery(normalizeSQL(sql))
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // Update access stats
    entry.accessCount++
    entry.lastAccessedAt = Date.now()

    this.hits++
    return entry.result
  }

  /**
   * Cache a query result
   */
  set(sql: string, result: QueryResult, ttl?: number): void {
    // Check if cacheable
    if (!isCacheable(sql)) {
      return
    }

    const normalizedSql = normalizeSQL(sql)
    const key = hashQuery(normalizedSql)
    const size = estimateSize(result)
    const now = Date.now()

    // Check if result is too large
    if (size > this.config.maxSize * 0.5) {
      console.warn('Query result too large to cache:', size, 'bytes')
      return
    }

    // Evict if necessary
    this.evictIfNeeded(size)

    const entry: CacheEntry = {
      result,
      key,
      sql: normalizedSql,
      cachedAt: now,
      expiresAt: now + (ttl || this.config.defaultTTL),
      size,
      accessCount: 1,
      lastAccessedAt: now
    }

    this.cache.set(key, entry)

    // Persist if enabled
    if (this.config.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Check if a query has a cached result
   */
  has(sql: string): boolean {
    const key = hashQuery(normalizeSQL(sql))
    const entry = this.cache.get(key)

    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Invalidate cache entry for a query
   */
  invalidate(sql: string): boolean {
    const key = hashQuery(normalizeSQL(sql))
    return this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries that reference a table
   */
  invalidateTable(tableName: string): number {
    const tablePattern = new RegExp(`\\b${tableName}\\b`, 'i')
    let invalidated = 0

    for (const [key, entry] of this.cache) {
      if (tablePattern.test(entry.sql)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    if (this.config.persist) {
      this.saveToStorage()
    }

    return invalidated
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0

    if (this.config.persist) {
      try {
        localStorage.removeItem(this.config.storageKey)
      } catch {}
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now()
    let totalSize = 0
    let oldestAge = 0
    let totalAge = 0

    for (const entry of this.cache.values()) {
      totalSize += entry.size
      const age = now - entry.cachedAt
      totalAge += age
      if (age > oldestAge) {
        oldestAge = age
      }
    }

    const totalRequests = this.hits + this.misses

    return {
      entries: this.cache.size,
      totalSize,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0,
      oldestAge,
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0
    }
  }

  /**
   * Get all cached queries (for debugging)
   */
  getCachedQueries(): Array<{
    sql: string
    cachedAt: Date
    expiresAt: Date
    size: number
    accessCount: number
  }> {
    return Array.from(this.cache.values()).map(entry => ({
      sql: entry.sql,
      cachedAt: new Date(entry.cachedAt),
      expiresAt: new Date(entry.expiresAt),
      size: entry.size,
      accessCount: entry.accessCount
    }))
  }

  /**
   * Evict entries if cache is full
   * Uses LRU (Least Recently Used) eviction
   */
  private evictIfNeeded(newSize: number): void {
    let currentSize = this.getTotalSize()

    // Evict by size
    while (currentSize + newSize > this.config.maxSize && this.cache.size > 0) {
      const lruEntry = this.findLRUEntry()
      if (lruEntry) {
        this.cache.delete(lruEntry.key)
        currentSize -= lruEntry.size
      } else {
        break
      }
    }

    // Evict by count
    while (this.cache.size >= this.config.maxEntries) {
      const lruEntry = this.findLRUEntry()
      if (lruEntry) {
        this.cache.delete(lruEntry.key)
      } else {
        break
      }
    }
  }

  /**
   * Find least recently used entry
   */
  private findLRUEntry(): CacheEntry | null {
    let lruEntry: CacheEntry | null = null
    let oldestAccess = Infinity

    for (const entry of this.cache.values()) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt
        lruEntry = entry
      }
    }

    return lruEntry
  }

  /**
   * Get total cache size
   */
  private getTotalSize(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size
    }
    return total
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0 && this.config.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (!stored) return

      const data = JSON.parse(stored) as {
        entries: CacheEntry[]
        savedAt: number
      }

      const now = Date.now()

      // Restore non-expired entries
      for (const entry of data.entries) {
        if (entry.expiresAt > now) {
          this.cache.set(entry.key, entry)
        }
      }

      console.log(`Loaded ${this.cache.size} cache entries from storage`)
    } catch (e) {
      console.warn('Failed to load query cache from storage:', e)
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        entries: Array.from(this.cache.values()),
        savedAt: Date.now()
      }
      localStorage.setItem(this.config.storageKey, JSON.stringify(data))
    } catch (e) {
      // localStorage might be full
      console.warn('Failed to save query cache to storage:', e)
    }
  }
}

/**
 * Create a caching query executor wrapper
 */
export function createCachedExecutor(
  executor: { query(sql: string): Promise<QueryResult> },
  cache: QueryCache
): { query(sql: string): Promise<QueryResult>; cache: QueryCache } {
  return {
    async query(sql: string): Promise<QueryResult> {
      // Check cache first
      const cached = cache.get(sql)
      if (cached) {
        console.log('📦 Cache hit for query')
        return {
          ...cached,
          executionTime: 0 // Indicate cached result
        }
      }

      // Execute query
      const result = await executor.query(sql)

      // Cache result
      cache.set(sql, result)

      return result
    },
    cache
  }
}

// Global cache instance
let globalCache: QueryCache | null = null

/**
 * Get global query cache instance
 */
export function getQueryCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache({
      persist: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 50 * 1024 * 1024,  // 50MB
      maxEntries: 100
    })
  }
  return globalCache
}

/**
 * Create a new query cache instance
 */
export function createQueryCache(config?: CacheConfig): QueryCache {
  return new QueryCache(config)
}
