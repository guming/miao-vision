import { dirname, extname, join, basename } from 'node:path'
import { exportHtmlToPng } from './png-export'

export function previewPathFor(primaryPath: string, fixedName?: string): string {
  if (extname(primaryPath).toLowerCase() === '.png') return primaryPath
  return join(dirname(primaryPath), fixedName ?? `${basename(primaryPath, extname(primaryPath))}.preview.png`)
}

export async function createArtifactPreview(
  html: string,
  primaryPath: string,
  options: { fixedName?: string; selector?: string; width?: number; height?: number; timeout?: number } = {}
): Promise<{ path?: string; warning?: string }> {
  const output = previewPathFor(primaryPath, options.fixedName)
  if (output === primaryPath) return { path: primaryPath }
  const result = await exportHtmlToPng(html, output, {
    selector: options.selector, width: options.width, height: options.height, timeout: options.timeout
  })
  return result.ok ? { path: output } : { warning: `${result.code}: ${result.message.split('\n')[0]}` }
}
