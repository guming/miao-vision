import type { PeriodMetricOutcome, PeriodOutcomeBrief } from './period-outcome-schema'
import type { ReportReview } from './report-review'
import type { ReportProfileV1 } from './report-profile'

export function injectPeriodOutcomeHtml(
  html: string,
  brief: PeriodOutcomeBrief,
  review: ReportReview,
  options: { profile?: ReportProfileV1; logoDataUri?: string } = {}
): string {
  const favorable = brief.outcomes.filter(item => item.classification === 'favorable').slice(0, 3)
  const adverse = brief.outcomes.filter(item => item.classification === 'adverse')
  const neutral = brief.outcomes.filter(item => item.classification === 'neutral')
  const summary = brief.baselineRunId === null
    ? 'This is the first run. No period comparison is available yet.'
    : brief.noMaterialChange
      ? 'No configured materiality threshold was crossed in this period.'
      : `${brief.outcomes.length} material change${brief.outcomes.length === 1 ? '' : 's'} detected.`
  const section = `<section class="mv-period-outcomes" aria-label="Period outcomes">
    <header><p class="mv-outcome-kicker">Period ${escapeHtml(brief.period)}</p><h2>Period outcomes</h2>
      <p>${summary}</p><span class="mv-review-status">${escapeHtml(review.status.replace('_', ' '))}</span></header>
    ${renderGroup('Positive outcomes', favorable)}
    ${renderGroup('Adverse outcomes', adverse)}
    ${renderGroup('Other material changes', neutral)}
    ${renderGoals(brief)}
    ${renderRankings(brief)}
    ${renderWarnings(brief)}
    ${renderRecommendations(brief)}
    ${renderMethodology(brief)}
  </section>${renderFooter(options.profile)}${styles(options.profile)}`
  const branded = renderCover(brief, review, options.profile, options.logoDataUri)
  const withCover = branded
    ? html.replace(/<body([^>]*)>/i, `<body$1>${branded}`)
    : html
  return withCover.includes('</body>') ? withCover.replace('</body>', `${section}</body>`) : `${withCover}${section}`
}

function renderCover(
  brief: PeriodOutcomeBrief,
  review: ReportReview,
  profile?: ReportProfileV1,
  logoDataUri?: string
): string {
  if (!profile?.client && !profile?.presentation) return ''
  const title = profile.client?.reportTitle ?? 'Client Outcome Report'
  return `<section class="mv-client-cover">
    <div class="mv-client-cover-top">${logoDataUri ? `<img src="${logoDataUri}" alt="">` : ''}
      ${profile.client?.confidentiality ? `<span>${escapeHtml(profile.client.confidentiality)}</span>` : ''}</div>
    <div><p class="mv-outcome-kicker">${escapeHtml(profile.client?.name ?? 'Client report')}</p>
      <h1>${escapeHtml(title)}</h1><p>Period ${escapeHtml(brief.period)}</p>
      <span class="mv-review-status">${escapeHtml(review.status.replace('_', ' '))}</span></div>
  </section>`
}

function renderGroup(title: string, outcomes: PeriodMetricOutcome[]): string {
  if (!outcomes.length) return ''
  return `<div class="mv-outcome-group"><h3>${title}</h3><div class="mv-outcome-grid">${outcomes.map(item => `
    <article><h4>${escapeHtml(item.label)}</h4><p class="mv-outcome-value">${formatNumber(item.current)}</p>
      <p>Previous ${formatNumber(item.previous)} · Change ${formatSigned(item.absolute)}${item.percent === null ? '' : ` (${formatPercent(item.percent)})`}</p>
    </article>`).join('')}</div></div>`
}

function renderGoals(brief: PeriodOutcomeBrief): string {
  if (!brief.goals.length) return ''
  return `<div class="mv-outcome-group"><h3>Goals</h3><ul>${brief.goals.map(goal =>
    `<li>${escapeHtml(goal.label)}: ${escapeHtml(goal.status)} at ${formatNumber(goal.current)} (target ${formatNumber(goal.target)})</li>`
  ).join('')}</ul></div>`
}

function renderWarnings(brief: PeriodOutcomeBrief): string {
  const warnings = brief.warnings.filter(item => item.code !== 'NO_BASELINE')
  if (!warnings.length && !brief.anomalies.added.length) return ''
  return `<div class="mv-outcome-group mv-outcome-warnings"><h3>Review notes</h3><ul>
    ${warnings.map(item => `<li>${escapeHtml(item.message)}</li>`).join('')}
    ${brief.anomalies.added.map(() => '<li>A new anomaly requires review.</li>').join('')}
  </ul></div>`
}

function renderRankings(brief: PeriodOutcomeBrief): string {
  if (!brief.rankings.length) return ''
  return `<div class="mv-outcome-group"><h3>Contributors and ranking changes</h3><ul>${brief.rankings.map(item => {
    const detail = item.kind === 'movement'
      ? `moved from ${item.previousRank} to ${item.currentRank}`
      : item.kind === 'entered' ? `entered at ${item.currentRank}` : `departed from ${item.previousRank}`
    return `<li>${escapeHtml(item.item)} ${detail}</li>`
  }).join('')}</ul></div>`
}

function renderRecommendations(brief: PeriodOutcomeBrief): string {
  if (!brief.recommendations.length) return ''
  return `<div class="mv-outcome-group"><h3>Suggested next actions</h3><ul>${brief.recommendations.map(item =>
    `<li>${escapeHtml(item.text)}</li>`).join('')}</ul></div>`
}

function renderMethodology(brief: PeriodOutcomeBrief): string {
  const refs = [...new Set([
    ...brief.outcomes.flatMap(item => item.evidenceRefs),
    ...brief.goals.flatMap(item => item.evidenceRefs),
    ...brief.rankings.flatMap(item => item.evidenceRefs)
  ])].sort()
  return `<details class="mv-outcome-method"><summary>Evidence and methodology</summary>
    <p>Baseline: ${escapeHtml(brief.baselineRunId ?? 'none')}</p>
    <p>Evidence references: ${refs.length ? refs.map(escapeHtml).join(', ') : 'none for the first comparison'}</p>
  </details>`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderFooter(profile?: ReportProfileV1): string {
  const footer = profile?.presentation?.footer
  return footer ? `<footer class="mv-client-footer">${escapeHtml(footer)}</footer>` : ''
}

function styles(profile?: ReportProfileV1): string {
  const primary = profile?.presentation?.primaryColor ?? '#1648D8'
  const accent = profile?.presentation?.accentColor ?? '#F0A202'
  const onPrimary = readableTextColor(primary)
  return `<style>
    :root{--mv-client-primary:${primary};--mv-client-accent:${accent};--mv-client-on-primary:${onPrimary}}
    .mv-client-cover{max-width:1180px;min-height:420px;margin:28px auto;padding:52px;display:flex;flex-direction:column;justify-content:space-between;border-radius:16px;background:var(--mv-client-primary);color:var(--mv-client-on-primary);box-sizing:border-box}.mv-client-cover h1{max-width:780px;margin:10px 0;font-size:48px;line-height:1.05;overflow-wrap:anywhere}.mv-client-cover-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.mv-client-cover-top img{display:block;max-width:180px;max-height:72px;object-fit:contain}.mv-client-cover-top span{font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    .mv-period-outcomes{max-width:1180px;margin:28px auto;padding:28px;border:1px solid var(--mv-border,#d9dee7);border-radius:14px;background:var(--mv-surface,#fff);color:var(--mv-text,#172033)}
    .mv-period-outcomes h2,.mv-period-outcomes h3,.mv-period-outcomes h4{margin:0 0 10px}.mv-outcome-kicker{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    .mv-review-status{display:inline-block;padding:4px 8px;border-radius:999px;background:var(--mv-muted,#eef2f7);font-size:12px;text-transform:capitalize}.mv-outcome-group{margin-top:24px}
    .mv-outcome-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.mv-outcome-grid article{padding:16px;border:1px solid var(--mv-border,#d9dee7);border-radius:10px}
    .mv-outcome-value{font-size:28px;font-weight:700;margin:4px 0}.mv-outcome-method{margin-top:24px}.mv-outcome-warnings{border-left:3px solid var(--mv-client-accent);padding-left:14px}.mv-client-footer{max-width:1180px;margin:20px auto;padding:16px 0;border-top:1px solid var(--mv-border,#d9dee7);font-size:12px}
  </style>`
}

function readableTextColor(background: string): '#111827' | '#FFFFFF' {
  const value = background.slice(1)
  const channels = [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16) / 255)
  const linear = channels.map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  const whiteContrast = 1.05 / (luminance + 0.05)
  const darkContrast = (luminance + 0.05) / 0.059
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#111827'
}
