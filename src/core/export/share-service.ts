/**
 * Report Sharing Service
 *
 * Enables sharing reports via:
 * - Self-contained HTML files with embedded data
 * - Web Share API (native sharing)
 * - Shareable data URLs
 * - Copy to clipboard
 *
 * @module core/export/share-service
 */

import { htmlExportService } from './html-exporter'
import type { Report } from '@/types/report'

export interface ShareOptions {
  /** Report title */
  title: string
  /** Include query data in the share */
  includeData?: boolean
  /** Dark theme */
  darkTheme?: boolean
  /** Share method */
  method?: 'webshare' | 'download' | 'clipboard' | 'dataurl'
}

export interface ShareResult {
  success: boolean
  method: string
  url?: string
  error?: string
}

/**
 * Generate embedded data script for self-contained reports
 */
function generateEmbeddedDataScript(report: Report): string {
  if (!report.embeddedData || Object.keys(report.embeddedData).length === 0) {
    return ''
  }

  const dataJson = JSON.stringify(report.embeddedData, null, 2)

  return `
<script type="application/json" id="miao-vision-data">
${dataJson}
</script>
<script>
  // Make embedded data available globally for interactive features
  window.__MIAO_VISION_DATA__ = JSON.parse(
    document.getElementById('miao-vision-data').textContent
  );
  console.log('📊 Embedded data loaded:', Object.keys(window.__MIAO_VISION_DATA__));
</script>`
}

/**
 * Generate shareable HTML with embedded data
 */
export async function generateShareableHTML(
  reportElement: HTMLElement,
  report: Report,
  options: ShareOptions
): Promise<string> {
  // Get base HTML from the exporter
  let html = await htmlExportService.getHTML(reportElement, {
    title: options.title,
    darkTheme: options.darkTheme ?? true
  })

  // Inject embedded data if requested
  if (options.includeData && report.embeddedData) {
    const dataScript = generateEmbeddedDataScript(report)
    // Insert before closing body tag
    html = html.replace('</body>', `${dataScript}\n</body>`)
  }

  // Add share metadata
  const shareMetadata = `
  <meta property="og:title" content="${escapeHtml(options.title)}">
  <meta property="og:type" content="article">
  <meta property="og:description" content="Data report created with Miao Vision">
  <meta name="miao-vision-version" content="1.0">
  <meta name="miao-vision-created" content="${new Date().toISOString()}">
`
  html = html.replace('</head>', `${shareMetadata}</head>`)

  return html
}

/**
 * Check if Web Share API is available
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' &&
         typeof navigator.share === 'function' &&
         typeof navigator.canShare === 'function'
}

/**
 * Share via Web Share API
 */
async function shareViaWebShare(
  html: string,
  title: string
): Promise<ShareResult> {
  if (!isWebShareSupported()) {
    return {
      success: false,
      method: 'webshare',
      error: 'Web Share API not supported'
    }
  }

  try {
    const blob = new Blob([html], { type: 'text/html' })
    const file = new File([blob], `${sanitizeFilename(title)}.html`, {
      type: 'text/html'
    })

    const shareData: ShareData = {
      title: title,
      text: `Check out this report: ${title}`,
      files: [file]
    }

    // Check if files can be shared
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData)
      return { success: true, method: 'webshare' }
    }

    // Fallback: share without file
    await navigator.share({
      title: title,
      text: `Check out this report: ${title}`
    })
    return { success: true, method: 'webshare' }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled
      return { success: false, method: 'webshare', error: 'Cancelled' }
    }
    return {
      success: false,
      method: 'webshare',
      error: error instanceof Error ? error.message : 'Share failed'
    }
  }
}

/**
 * Copy HTML to clipboard
 */
async function copyToClipboard(html: string): Promise<ShareResult> {
  try {
    // Try to copy as HTML blob
    if (typeof ClipboardItem !== 'undefined') {
      const blob = new Blob([html], { type: 'text/html' })
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob })
      ])
      return { success: true, method: 'clipboard' }
    }

    // Fallback: copy as plain text
    await navigator.clipboard.writeText(html)
    return { success: true, method: 'clipboard' }
  } catch (error) {
    return {
      success: false,
      method: 'clipboard',
      error: error instanceof Error ? error.message : 'Copy failed'
    }
  }
}

/**
 * Generate a data URL for the HTML
 */
function generateDataURL(html: string): ShareResult {
  try {
    const encoded = btoa(unescape(encodeURIComponent(html)))
    const dataUrl = `data:text/html;base64,${encoded}`

    // Check if URL is too long (most browsers limit ~2MB)
    if (dataUrl.length > 2 * 1024 * 1024) {
      return {
        success: false,
        method: 'dataurl',
        error: 'Report too large for data URL'
      }
    }

    return { success: true, method: 'dataurl', url: dataUrl }
  } catch (error) {
    return {
      success: false,
      method: 'dataurl',
      error: error instanceof Error ? error.message : 'URL generation failed'
    }
  }
}

/**
 * Download as file
 */
function downloadFile(html: string, title: string): ShareResult {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFilename(title)}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return { success: true, method: 'download' }
  } catch (error) {
    return {
      success: false,
      method: 'download',
      error: error instanceof Error ? error.message : 'Download failed'
    }
  }
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'report'
}

/**
 * Escape HTML entities
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
 * Share a report
 */
export async function shareReport(
  reportElement: HTMLElement,
  report: Report,
  options: ShareOptions
): Promise<ShareResult> {
  console.log('🔗 Starting report share...', options.method)

  // Generate shareable HTML
  const html = await generateShareableHTML(reportElement, report, options)

  // Execute share method
  switch (options.method) {
    case 'webshare':
      return shareViaWebShare(html, options.title)

    case 'clipboard':
      return copyToClipboard(html)

    case 'dataurl':
      return generateDataURL(html)

    case 'download':
    default:
      return downloadFile(html, options.title)
  }
}

/**
 * Share Service Class
 */
class ShareService {
  /**
   * Share report with auto-detection of best method
   */
  async share(
    reportElement: HTMLElement,
    report: Report,
    options: Omit<ShareOptions, 'method'>
  ): Promise<ShareResult> {
    // Try Web Share first if available
    if (isWebShareSupported()) {
      const result = await shareReport(reportElement, report, {
        ...options,
        method: 'webshare'
      })
      if (result.success) return result
    }

    // Fall back to download
    return shareReport(reportElement, report, {
      ...options,
      method: 'download'
    })
  }

  /**
   * Download report as shareable HTML
   */
  async download(
    reportElement: HTMLElement,
    report: Report,
    options: Omit<ShareOptions, 'method'>
  ): Promise<ShareResult> {
    return shareReport(reportElement, report, {
      ...options,
      method: 'download'
    })
  }

  /**
   * Copy report HTML to clipboard
   */
  async copyToClipboard(
    reportElement: HTMLElement,
    report: Report,
    options: Omit<ShareOptions, 'method'>
  ): Promise<ShareResult> {
    return shareReport(reportElement, report, {
      ...options,
      method: 'clipboard'
    })
  }

  /**
   * Get shareable data URL
   */
  async getDataURL(
    reportElement: HTMLElement,
    report: Report,
    options: Omit<ShareOptions, 'method'>
  ): Promise<ShareResult> {
    return shareReport(reportElement, report, {
      ...options,
      method: 'dataurl'
    })
  }

  /**
   * Check if Web Share is available
   */
  isWebShareSupported = isWebShareSupported
}

export const shareService = new ShareService()
