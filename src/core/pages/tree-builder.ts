/**
 * Page Tree Builder
 *
 * Builds hierarchical page tree from flat page list.
 * Handles virtual parent nodes for directory structure.
 */

import type { PageNode, PageTree, ReportPage } from '@/types/page-structure'

export class PageTreeBuilder {
  /**
   * Build page tree from flat page list
   *
   * @example
   * const pages = [
   *   { path: '/', title: 'Home' },
   *   { path: '/sales/overview', title: 'Overview' },
   *   { path: '/sales/regional', title: 'Regional' }
   * ]
   *
   * const tree = builder.build(pages)
   * // {
   * //   root: [
   * //     { path: '/', title: 'Home' },
   * //     {
   * //       path: '/sales',
   * //       title: 'Sales',
   * //       children: [
   * //         { path: '/sales/overview', ... },
   * //         { path: '/sales/regional', ... }
   * //       ]
   * //     }
   * //   ]
   * // }
   */
  build(pages: ReportPage[]): PageTree {
    const nodeMap = new Map<string, PageNode>()
    const root: PageNode[] = []

    // Sort by path depth (shallower first) to ensure parents are created before children
    const sorted = [...pages].sort((a, b) => {
      const depthA = a.path.split('/').filter(Boolean).length
      const depthB = b.path.split('/').filter(Boolean).length
      return depthA - depthB
    })

    for (const page of sorted) {
      // Create node for this page
      const node = this.createNode(page)
      nodeMap.set(page.path, node)

      // Root level page
      if (page.path === '/') {
        root.push(node)
        continue
      }

      // Find or create parent node
      const parentPath = this.getParentPath(page.path)

      if (!parentPath) {
        // No parent (root level)
        root.push(node)
        continue
      }

      // Get or create parent node
      let parentNode = nodeMap.get(parentPath)

      if (!parentNode) {
        // Create virtual parent node
        parentNode = this.createVirtualNode(parentPath)
        nodeMap.set(parentPath, parentNode)

        // Add parent to its parent recursively
        const grandparentPath = this.getParentPath(parentPath)
        if (grandparentPath) {
          let grandparent = nodeMap.get(grandparentPath)
          if (!grandparent) {
            grandparent = this.createVirtualNode(grandparentPath)
            nodeMap.set(grandparentPath, grandparent)
            root.push(grandparent)
          }
          grandparent.children.push(parentNode)
        } else {
          root.push(parentNode)
        }
      }

      // Add current node to parent
      parentNode.children.push(node)
    }

    // Sort children by order
    this.sortChildren(root)

    return { root }
  }

  /**
   * Create page node from report page
   */
  private createNode(page: ReportPage): PageNode {
    const { templateParam, isTemplate } = this.extractTemplateParam(page.path)

    return {
      id: page.path,
      name: this.pathToName(page.path),
      path: page.path,
      title: page.title || this.pathToTitle(page.path),
      icon: page.icon,
      order: page.order ?? 999,
      children: [],
      isTemplate,
      templateParam,
      metadata: {
        hidden: page.hidden ?? false,
        group: page.group
      }
    }
  }

  /**
   * Create virtual node for directory
   */
  private createVirtualNode(path: string): PageNode {
    return {
      id: path,
      name: this.pathToName(path),
      path,
      title: this.pathToTitle(path),
      order: 999,
      children: [],
      isTemplate: false,
      metadata: {
        hidden: false
      }
    }
  }

  /**
   * Get parent path
   *
   * @example
   * getParentPath('/sales/overview')  // → '/sales'
   * getParentPath('/sales')           // → '/'
   * getParentPath('/')                // → null
   */
  private getParentPath(path: string): string | null {
    if (path === '/') return null

    const parts = path.split('/').filter(Boolean)
    if (parts.length === 1) return '/'

    return '/' + parts.slice(0, -1).join('/')
  }

  /**
   * Convert path to display name
   *
   * @example
   * pathToName('/sales/overview')  // → 'overview'
   * pathToName('/customers/[id]')  // → '[id]'
   */
  private pathToName(path: string): string {
    if (path === '/') return 'home'

    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1]
  }

  /**
   * Convert path to title
   *
   * @example
   * pathToTitle('/sales/overview')     // → 'Overview'
   * pathToTitle('/customers/[id]')     // → 'Customer Details'
   * pathToTitle('/multi-word-title')   // → 'Multi Word Title'
   */
  private pathToTitle(path: string): string {
    if (path === '/') return 'Home'

    const name = this.pathToName(path)

    // Handle template params
    if (name.startsWith('[') && name.endsWith(']')) {
      const param = name.slice(1, -1)
      return this.capitalize(param) + ' Details'
    }

    // Convert kebab-case to Title Case
    return name
      .split('-')
      .map(word => this.capitalize(word))
      .join(' ')
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  /**
   * Extract template parameter from path
   *
   * @example
   * extractTemplateParam('/customers/[id]')
   * // → { isTemplate: true, templateParam: 'id' }
   *
   * extractTemplateParam('/sales/overview')
   * // → { isTemplate: false, templateParam: undefined }
   */
  private extractTemplateParam(path: string): {
    isTemplate: boolean
    templateParam?: string
  } {
    const match = path.match(/\[([^\]]+)\]/)

    if (match) {
      return {
        isTemplate: true,
        templateParam: match[1]
      }
    }

    return {
      isTemplate: false
    }
  }

  /**
   * Sort children recursively by order
   */
  private sortChildren(nodes: PageNode[]): void {
    nodes.sort((a, b) => a.order - b.order)

    for (const node of nodes) {
      if (node.children.length > 0) {
        this.sortChildren(node.children)
      }
    }
  }
}
