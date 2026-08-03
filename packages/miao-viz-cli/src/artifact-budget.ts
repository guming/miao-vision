import { INTERACTIVE_HTML_HARD_BUDGET_BYTES, INTERACTIVE_HTML_SOFT_BUDGET_BYTES } from './trusted-artifact'

export const STATIC_HTML_SOFT_BUDGET_BYTES = 1_500_000
export { INTERACTIVE_HTML_SOFT_BUDGET_BYTES, INTERACTIVE_HTML_HARD_BUDGET_BYTES }

export function collectArtifactSizeWarnings(content: string, interactive: boolean): string[] {
  const sizeBytes = Buffer.byteLength(content, 'utf8')
  if (interactive) {
    if (sizeBytes > INTERACTIVE_HTML_HARD_BUDGET_BYTES) return [`INTERACTION_ARTIFACT_TOO_LARGE: interactive HTML is ${sizeBytes} bytes (>${INTERACTIVE_HTML_HARD_BUDGET_BYTES} hard budget).`]
    if (sizeBytes > INTERACTIVE_HTML_SOFT_BUDGET_BYTES) return [`INTERACTION_ARTIFACT_TOO_LARGE: interactive HTML is ${sizeBytes} bytes (>${INTERACTIVE_HTML_SOFT_BUDGET_BYTES} soft budget).`]
    return []
  }
  return sizeBytes > STATIC_HTML_SOFT_BUDGET_BYTES
    ? [`LARGE_ARTIFACT_SIZE: static HTML is ${sizeBytes} bytes (>${STATIC_HTML_SOFT_BUDGET_BYTES} soft budget).`]
    : []
}
