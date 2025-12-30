/**
 * Hybrid View
 *
 * Wrapper around HybridGNode for view-specific operations
 * Provides a Perspective-compatible API
 */

import type { HybridGNode } from './hybrid-gnode'
import type { UpdateCallback, Delta } from './types'

export class HybridView {
  private unsubscribe?: () => void

  constructor(
    private viewId: string,
    private gnode: HybridGNode
  ) {}

  /**
   * Get current data (Perspective-compatible)
   */
  async toArray(): Promise<any[]> {
    return this.gnode.query(this.viewId)
  }

  /**
   * Get data as JSON
   */
  async toJSON(): Promise<any[]> {
    return this.toArray()
  }

  /**
   * Get number of rows
   */
  async numRows(): Promise<number> {
    const data = await this.toArray()
    return data.length
  }

  /**
   * Get column names
   */
  async columns(): Promise<string[]> {
    const data = await this.toArray()
    if (data.length === 0) return []
    return Object.keys(data[0])
  }

  /**
   * Subscribe to updates (Perspective-compatible)
   */
  onUpdate(callback: (updated: any) => void): () => void {
    this.unsubscribe = this.gnode.subscribe(this.viewId, (delta: Delta) => {
      // Notify with simplified update info
      callback({
        port_id: 0,
        delta: delta.operations.length
      })
    })

    return () => {
      this.unsubscribe?.()
    }
  }

  /**
   * Delete view
   */
  async delete(): Promise<void> {
    this.unsubscribe?.()
    // TODO: Remove from GNode
  }

  /**
   * Get view config (for debugging)
   */
  getConfig(): any {
    const node = this.gnode.getNode(this.viewId)
    return node?.viewConfig
  }

  /**
   * Get view stats
   */
  async getStats(): Promise<{
    rowCount: number
    columns: string[]
    lastRefresh: number
    isDirty: boolean
  }> {
    const node = this.gnode.getNode(this.viewId)
    const data = await this.toArray()

    return {
      rowCount: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      lastRefresh: node?.incrementalState?.lastRefreshTime || 0,
      isDirty: node?.dirty || false
    }
  }
}
