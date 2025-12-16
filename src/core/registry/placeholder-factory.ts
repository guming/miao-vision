/**
 * PlaceholderFactory - Unified Placeholder Generation
 *
 * Eliminates scattered HTML generation code in block-renderer.ts.
 * Provides consistent placeholder UI for various component states.
 */

/**
 * Placeholder type
 */
export type PlaceholderType =
  | 'pending'    // Waiting for execution
  | 'loading'    // Currently executing
  | 'error'      // Execution failed
  | 'no-data'    // Query returned no data
  | 'chart'      // Chart-specific placeholder

/**
 * Placeholder options
 */
export interface PlaceholderOptions {
  /** Placeholder type */
  type: PlaceholderType
  /** Custom title (overrides default) */
  title?: string
  /** Custom message (overrides default) */
  message?: string
  /** Custom icon (overrides default) */
  icon?: string
  /** Component type for context */
  componentType?: string
  /** Additional CSS class */
  className?: string
}

/**
 * Placeholder theme (light/dark mode support)
 */
export interface PlaceholderTheme {
  pending: PlaceholderStyle
  loading: PlaceholderStyle
  error: PlaceholderStyle
  'no-data': PlaceholderStyle
  chart: PlaceholderStyle
}

interface PlaceholderStyle {
  bg: string
  border: string
  text: string
  icon: string
}

/**
 * Light theme styles
 */
const lightTheme: PlaceholderTheme = {
  pending: {
    bg: '#F9FAFB',
    border: '#D1D5DB',
    text: '#6B7280',
    icon: '⏸️'
  },
  loading: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#3B82F6',
    icon: '⏳'
  },
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#DC2626',
    icon: '❌'
  },
  'no-data': {
    bg: '#F3F4F6',
    border: '#D1D5DB',
    text: '#9CA3AF',
    icon: '📭'
  },
  chart: {
    bg: '#1F2937',
    border: '#374151',
    text: '#D1D5DB',
    icon: '📊'
  }
}

/**
 * Default titles for each placeholder type
 */
const defaultTitles: Record<PlaceholderType, string> = {
  pending: 'Not executed yet',
  loading: 'Loading...',
  error: 'Error',
  'no-data': 'No data available',
  chart: 'Chart not ready'
}

/**
 * Default messages for each placeholder type
 */
const defaultMessages: Record<PlaceholderType, string> = {
  pending: 'Click "Execute" to run the report',
  loading: 'Please wait while processing...',
  error: 'Something went wrong',
  'no-data': 'The query returned no results',
  chart: 'Execute the query to display the chart'
}

/**
 * PlaceholderFactory class
 */
export class PlaceholderFactory {
  private theme: PlaceholderTheme = lightTheme

  /**
   * Create a placeholder element
   */
  create(options: PlaceholderOptions): HTMLElement {
    const container = document.createElement('div')
    const style = this.theme[options.type]

    const icon = options.icon || style.icon
    const title = this.formatTitle(options)
    const message = options.message || defaultMessages[options.type]

    // Set class name
    container.className = `placeholder placeholder-${options.type}${options.className ? ' ' + options.className : ''}`

    // Build HTML structure
    container.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-icon">${icon}</div>
        <div class="placeholder-title">${this.escapeHtml(title)}</div>
        <div class="placeholder-message">${this.escapeHtml(message)}</div>
      </div>
    `

    // Apply styles
    this.applyStyles(container, style, options.type)

    return container
  }

  /**
   * Create an error placeholder
   */
  createError(error: string | Error, componentType?: string): HTMLElement {
    const message = error instanceof Error ? error.message : error
    return this.create({
      type: 'error',
      title: componentType ? `${componentType} Error` : 'Error',
      message,
      componentType
    })
  }

  /**
   * Create a loading placeholder
   */
  createLoading(componentType?: string): HTMLElement {
    return this.create({
      type: 'loading',
      title: componentType ? `Loading ${componentType}...` : 'Loading...',
      componentType
    })
  }

  /**
   * Create a pending placeholder
   */
  createPending(componentType?: string): HTMLElement {
    return this.create({
      type: 'pending',
      title: componentType ? `${componentType} not executed yet` : 'Not executed yet',
      componentType
    })
  }

  /**
   * Create a no-data placeholder
   */
  createNoData(componentType?: string): HTMLElement {
    return this.create({
      type: 'no-data',
      title: componentType ? `No data for ${componentType}` : 'No data available',
      componentType
    })
  }

  /**
   * Create a chart placeholder
   */
  createChart(): HTMLElement {
    return this.create({
      type: 'chart',
      icon: '📊',
      title: 'Chart not executed yet',
      message: 'Click "Execute" to run the query and display the chart'
    })
  }

  /**
   * Replace an element with a placeholder
   */
  replace(target: Element, options: PlaceholderOptions): HTMLElement {
    const placeholder = this.create(options)
    target.replaceWith(placeholder)
    return placeholder
  }

  /**
   * Replace with error placeholder
   */
  replaceWithError(target: Element, error: string | Error, componentType?: string): HTMLElement {
    const placeholder = this.createError(error, componentType)
    target.replaceWith(placeholder)
    return placeholder
  }

  /**
   * Replace with pending placeholder
   */
  replaceWithPending(target: Element, componentType?: string): HTMLElement {
    const placeholder = this.createPending(componentType)
    target.replaceWith(placeholder)
    return placeholder
  }

  /**
   * Generate placeholder HTML string (for outerHTML replacement)
   */
  toHTML(options: PlaceholderOptions): string {
    const style = this.theme[options.type]
    const icon = options.icon || style.icon
    const title = this.formatTitle(options)
    const message = options.message || defaultMessages[options.type]

    const baseStyles = this.getBaseStyles()
    const typeStyles = this.getTypeStyles(style, options.type)

    return `
      <div class="placeholder placeholder-${options.type}${options.className ? ' ' + options.className : ''}" style="${baseStyles} ${typeStyles}">
        <div class="placeholder-content">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">${icon}</div>
          <div style="font-weight: 500; margin-bottom: 0.25rem;">${this.escapeHtml(title)}</div>
          <div style="font-size: 0.875rem; opacity: 0.8;">${this.escapeHtml(message)}</div>
        </div>
      </div>
    `
  }

  /**
   * Generate error HTML string
   */
  errorHTML(error: string | Error, componentType?: string): string {
    const message = error instanceof Error ? error.message : error
    return this.toHTML({
      type: 'error',
      title: componentType ? `${componentType} Error` : 'Error',
      message,
      componentType
    })
  }

  /**
   * Generate pending HTML string
   */
  pendingHTML(componentType?: string): string {
    return this.toHTML({
      type: 'pending',
      title: componentType ? `${componentType} not executed yet` : 'Not executed yet',
      componentType
    })
  }

  /**
   * Generate chart placeholder HTML string
   */
  chartHTML(): string {
    return this.toHTML({
      type: 'chart',
      icon: '📊',
      title: 'Chart not executed yet',
      message: 'Click "Execute" to run the query and display the chart'
    })
  }

  // === Private methods ===

  private formatTitle(options: PlaceholderOptions): string {
    if (options.title) return options.title
    if (options.componentType) {
      return `${options.componentType} ${defaultTitles[options.type].toLowerCase()}`
    }
    return defaultTitles[options.type]
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private getBaseStyles(): string {
    return `
      padding: 2rem;
      text-align: center;
      border-radius: 8px;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    `.replace(/\s+/g, ' ').trim()
  }

  private getTypeStyles(style: PlaceholderStyle, type: PlaceholderType): string {
    const borderStyle = type === 'pending' || type === 'no-data' || type === 'chart' ? 'dashed' : 'solid'
    return `
      background-color: ${style.bg};
      border: 1px ${borderStyle} ${style.border};
      color: ${style.text};
    `.replace(/\s+/g, ' ').trim()
  }

  private applyStyles(container: HTMLElement, style: PlaceholderStyle, type: PlaceholderType): void {
    container.style.cssText = `${this.getBaseStyles()} ${this.getTypeStyles(style, type)}`

    // Style child elements
    const iconEl = container.querySelector('.placeholder-icon') as HTMLElement
    const titleEl = container.querySelector('.placeholder-title') as HTMLElement
    const messageEl = container.querySelector('.placeholder-message') as HTMLElement

    if (iconEl) iconEl.style.cssText = 'font-size: 2rem; margin-bottom: 0.5rem;'
    if (titleEl) titleEl.style.cssText = 'font-weight: 500; margin-bottom: 0.25rem;'
    if (messageEl) messageEl.style.cssText = 'font-size: 0.875rem; opacity: 0.8;'
  }
}

/**
 * Singleton instance
 */
export const placeholderFactory = new PlaceholderFactory()
