/**
 * HTML Export Service
 *
 * Exports the current report as a standalone HTML file.
 * Includes all styles, charts (as SVG), and data inline.
 */

export interface ExportOptions {
  /** Report title */
  title: string
  /** Include dark theme styles */
  darkTheme?: boolean
  /** Include timestamp in filename */
  includeTimestamp?: boolean
  /** Custom CSS to include */
  customCSS?: string
}

/**
 * Extract styles that are actually used in the content
 */
function extractUsedStyles(content: HTMLElement): string {
  const usedClasses = new Set<string>()
  const usedIds = new Set<string>()
  const usedTags = new Set<string>()

  // Collect all classes, IDs, and tags used in the content
  const collectSelectors = (element: Element) => {
    // Collect tag name
    usedTags.add(element.tagName.toLowerCase())

    // Collect classes
    element.classList.forEach(cls => usedClasses.add(cls))

    // Collect ID
    if (element.id) {
      usedIds.add(element.id)
    }

    // Recurse into children
    Array.from(element.children).forEach(collectSelectors)
  }

  collectSelectors(content)

  const styles: string[] = []

  // Get all stylesheets and filter to used rules
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        for (const rule of sheet.cssRules) {
          const ruleText = rule.cssText

          // Always include @keyframes, @font-face, @media rules
          if (ruleText.startsWith('@keyframes') ||
              ruleText.startsWith('@font-face') ||
              ruleText.startsWith('@media')) {
            styles.push(ruleText)
            continue
          }

          // Check if rule matches any used selector
          const selectorPart = ruleText.split('{')[0]
          const selectorMatch =
            // Check for class selectors (including Svelte scoped classes)
            Array.from(usedClasses).some(cls => {
              // Exact class match or class with pseudo-selector
              return selectorPart.includes(`.${cls}`) ||
                     selectorPart.includes(`.${cls}:`) ||
                     selectorPart.includes(`.${cls} `)
            }) ||
            // Check for ID selectors
            Array.from(usedIds).some(id => ruleText.includes(`#${id}`)) ||
            // Check for tag selectors (basic check)
            Array.from(usedTags).some(tag => {
              const tagPattern = new RegExp(`(^|[^a-z-])${tag}([^a-z-]|$)`, 'i')
              return tagPattern.test(selectorPart)
            }) ||
            // Include :root and html/body
            ruleText.includes(':root') ||
            ruleText.startsWith('html') ||
            ruleText.startsWith('body') ||
            // Include all Svelte scoped styles (s-XXXX pattern)
            /\.s-[a-zA-Z0-9]+/.test(selectorPart)

          if (selectorMatch) {
            styles.push(ruleText)
          }
        }
      }
    } catch (e) {
      // Skip cross-origin stylesheets
    }
  }

  return styles.join('\n')
}

/**
 * Get base styles for the exported document
 */
function getBaseStyles(darkTheme: boolean): string {
  const bgColor = darkTheme ? '#111827' : '#ffffff'
  const textColor = darkTheme ? '#F3F4F6' : '#1F2937'
  const borderColor = darkTheme ? '#374151' : '#E5E7EB'
  const cardBg = darkTheme ? '#1F2937' : '#F9FAFB'

  return `
    :root {
      --bg-primary: ${bgColor};
      --bg-secondary: ${cardBg};
      --text-primary: ${textColor};
      --border-color: ${borderColor};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 1.5rem 0 1rem;
      font-weight: 600;
      line-height: 1.3;
    }

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; }

    p { margin: 1rem 0; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.875rem;
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      background: ${darkTheme ? '#374151' : '#F3F4F6'};
      font-weight: 600;
    }

    tr:hover {
      background: ${darkTheme ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.5)'};
    }

    code {
      background: ${darkTheme ? '#374151' : '#F3F4F6'};
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875em;
    }

    pre {
      background: ${darkTheme ? '#374151' : '#F3F4F6'};
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }

    pre code {
      background: none;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid ${darkTheme ? '#3B82F6' : '#3B82F6'};
      padding-left: 1rem;
      margin: 1rem 0;
      color: ${darkTheme ? '#9CA3AF' : '#6B7280'};
    }

    ul, ol {
      margin: 1rem 0;
      padding-left: 2rem;
    }

    li { margin: 0.5rem 0; }

    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 2rem 0;
    }

    a {
      color: #3B82F6;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Component styles */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }

    .kpi-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
    }

    .progress-container {
      margin: 1rem 0;
    }

    .progress-bar {
      height: 8px;
      background: var(--border-color);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #3B82F6;
      border-radius: 4px;
    }

    .chart-container {
      margin: 1.5rem 0;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
    }

    .chart-container svg {
      max-width: 100%;
      height: auto;
    }

    .datatable-container {
      margin: 1.5rem 0;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .sparkline {
      display: inline-block;
      vertical-align: middle;
    }

    .export-footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.75rem;
      color: ${darkTheme ? '#6B7280' : '#9CA3AF'};
      text-align: center;
    }
  `
}

/**
 * Clone and clean the report content for export
 */
function cloneReportContent(sourceElement: HTMLElement): HTMLElement {
  const clone = sourceElement.cloneNode(true) as HTMLElement

  // Remove interactive elements that don't make sense in static export
  const toRemove = clone.querySelectorAll([
    '.toolbar',
    '.export-btn',
    '.filter-dropdown',
    '.search-box',
    '.column-selector',
    'button',
    'input[type="text"]',
    'input[type="search"]',
    '.pagination',
  ].join(', '))

  toRemove.forEach(el => el.remove())

  // Clean up data attributes
  clone.querySelectorAll('[data-block-id]').forEach(el => {
    el.removeAttribute('data-block-id')
  })

  return clone
}

/**
 * Convert canvas elements to images
 */
function convertCanvasToImages(container: HTMLElement): void {
  const canvases = container.querySelectorAll('canvas')
  canvases.forEach(canvas => {
    try {
      const img = document.createElement('img')
      img.src = canvas.toDataURL('image/png')
      img.style.cssText = canvas.style.cssText
      img.className = canvas.className
      canvas.replaceWith(img)
    } catch (e) {
      console.warn('Could not convert canvas to image:', e)
    }
  })
}

/**
 * Generate the full HTML document
 */
function generateHTMLDocument(
  content: string,
  options: ExportOptions,
  extractedStyles: string = ''
): string {
  const baseStyles = getBaseStyles(options.darkTheme ?? true)
  const customCSS = options.customCSS || ''
  const timestamp = new Date().toLocaleString()

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Miao Vision">
  <meta name="exported-at" content="${new Date().toISOString()}">
  <title>${escapeHtml(options.title)}</title>
  <style>
${baseStyles}
/* Extracted component styles */
${extractedStyles}
/* Custom styles */
${customCSS}
  </style>
</head>
<body>
  <article class="report-content">
${content}
  </article>
  <footer class="export-footer">
    <p>Exported from Miao Vision on ${timestamp}</p>
  </footer>
</body>
</html>`
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename for export
 */
function generateFilename(title: string, includeTimestamp: boolean): string {
  // Sanitize title for filename
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  if (includeTimestamp) {
    const date = new Date()
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    return `${sanitized}-${timestamp}.html`
  }

  return `${sanitized}.html`
}

/**
 * Export report to HTML file
 */
export async function exportToHTML(
  reportElement: HTMLElement,
  options: ExportOptions
): Promise<void> {
  console.log('📄 Starting HTML export...')

  try {
    // Clone the report content
    const clone = cloneReportContent(reportElement)

    // Convert any canvas elements to images
    convertCanvasToImages(clone)

    // Extract used styles from the original element (before removing classes)
    const extractedStyles = extractUsedStyles(reportElement)

    // Get the inner HTML
    const content = clone.innerHTML

    // Generate the full HTML document with extracted styles
    const html = generateHTMLDocument(content, options, extractedStyles)

    // Generate filename and trigger download
    const filename = generateFilename(options.title, options.includeTimestamp ?? true)
    downloadFile(html, filename, 'text/html;charset=utf-8')

    console.log('✅ HTML export completed:', filename)
  } catch (error) {
    console.error('❌ HTML export failed:', error)
    throw error
  }
}

/**
 * Export service singleton
 */
class HTMLExportService {
  private defaultOptions: Partial<ExportOptions> = {
    darkTheme: true,
    includeTimestamp: true
  }

  /**
   * Set default options
   */
  setDefaults(options: Partial<ExportOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options }
  }

  /**
   * Export report to HTML
   */
  async export(
    reportElement: HTMLElement,
    options: Partial<ExportOptions> & { title: string }
  ): Promise<void> {
    const mergedOptions: ExportOptions = {
      ...this.defaultOptions,
      ...options
    }
    return exportToHTML(reportElement, mergedOptions)
  }

  /**
   * Get HTML content without downloading
   */
  async getHTML(
    reportElement: HTMLElement,
    options: Partial<ExportOptions> & { title: string }
  ): Promise<string> {
    const mergedOptions: ExportOptions = {
      ...this.defaultOptions,
      ...options
    }

    const clone = cloneReportContent(reportElement)
    convertCanvasToImages(clone)
    const extractedStyles = extractUsedStyles(reportElement)
    const content = clone.innerHTML
    return generateHTMLDocument(content, mergedOptions, extractedStyles)
  }
}

export const htmlExportService = new HTMLExportService()
