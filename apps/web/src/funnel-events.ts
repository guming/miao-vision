import { installManifest, type HostId } from './install-manifest'

export type FunnelEventName = 'landing_view' | 'example_open' | 'install_click' | 'install_verify' | 'first_report_start' | 'first_report_success' | 'first_report_failure' | 'repeat_report_start'
type InstallMethod = 'plugin' | 'npm' | 'skill' | 'unknown'
const STORAGE_KEY = 'miao-vision:funnel-events:v1'

export function recordFunnelEvent(name: FunnelEventName, host: HostId | 'unknown' = 'unknown', installMethod: InstallMethod = 'unknown'): void {
  try {
    const event = { name, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString(), source: 'web', host, installMethod, cliVersion: installManifest.cliVersion, schemaVersion: 1 as const }
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(existing)) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing.slice(-99), event]))
  } catch {
    // Observability is deliberately best-effort and never blocks the product.
  }
}
