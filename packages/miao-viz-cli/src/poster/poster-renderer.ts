import type { AgentChartSpec, AgentPosterSpec, AgentReportSpec, DataProfile } from '../types'
import { prepareChartData } from '../data-transform'
import { escapeHtml, svgFrame } from '../svg-renderer-utils'
import { posterEditorialTheme } from './poster-theme'

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 1350

export function renderPosterHtml(
  spec: AgentReportSpec,
  profile: DataProfile,
  rows: Record<string, unknown>[],
  themeOverride?: string
): string {
  const poster = spec.poster!
  const width = poster.canvas?.width ?? DEFAULT_WIDTH
  const height = poster.canvas?.height ?? DEFAULT_HEIGHT
  const theme = posterEditorialTheme
  const chart = spec.charts.find(item => item.id === poster.chartId)!
  const chartSvg = renderPosterRankingChart(chart, poster, rows, width - 128, 670, theme)
  const callouts = (poster.callouts ?? []).map(callout => {
    if (callout.type === 'note') return `<p class="poster-note">${escapeHtml(callout.text)}</p>`
    return `<aside class="poster-callout"><strong>${escapeHtml(callout.title)}</strong><span>${escapeHtml(callout.body)}</span></aside>`
  }).join('')
  const title = poster.hero.title || spec.title || 'Miao Vision Poster'
  return `<!doctype html>
<html lang="${spec.locale ?? 'en'}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title>
<style>${buildPosterCss(width, height, theme)}</style></head>
<body><main class="mv-poster" data-layout="poster" data-poster-theme="${escapeHtml(themeOverride ?? 'poster-editorial')}">
  <header class="poster-hero">
    ${poster.hero.eyebrow ? `<p class="poster-eyebrow">${escapeHtml(poster.hero.eyebrow)}</p>` : ''}
    <h1>${escapeHtml(title)}</h1>
    ${poster.hero.subtitle ? `<p class="poster-subtitle">${escapeHtml(poster.hero.subtitle)}</p>` : ''}
  </header>
  ${callouts ? `<section class="poster-callouts">${callouts}</section>` : ''}
  <section class="poster-chart" aria-label="${escapeHtml(chart.title ?? 'Ranking chart')}">${chartSvg}</section>
  <footer class="poster-footer"><span>${escapeHtml(poster.footer.source)}</span>${poster.footer.date ? `<span>${escapeHtml(poster.footer.date)}</span>` : ''}</footer>
</main><script>document.documentElement.dataset.miaoRenderReady='true'</script>
<script type="application/json" id="miao-viz-spec">${jsonScript(spec)}</script>
<script type="application/json" id="miao-viz-profile">${jsonScript(profile)}</script></body></html>`
}

function renderPosterRankingChart(chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: typeof posterEditorialTheme): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const prepared = prepareChartData(rows, chart)
    .map((row, index) => ({ label: String(row[xField] ?? ''), value: Number(row[yField]), index }))
    .filter(item => item.label && Number.isFinite(item.value))
    .sort((a, b) => poster.chart?.sort === 'asc' ? a.value - b.value : b.value - a.value)
    .slice(0, poster.chart?.maxItems ?? 10)
  const margin = { top: 44, right: 24, bottom: 82, left: 70 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const configuredDomain = poster.chart?.yDomain
  const min = configuredDomain?.[0] ?? 0
  const max = configuredDomain?.[1] ?? Math.max(...prepared.map(item => item.value), 1)
  const y = (value: number) => margin.top + chartHeight - ((value - min) / Math.max(max - min, 1)) * chartHeight
  const ticks = Array.from({ length: 6 }, (_, index) => min + ((max - min) * index) / 5)
  const grid = ticks.map(value => `<line x1="${margin.left}" y1="${y(value).toFixed(1)}" x2="${(margin.left + chartWidth).toFixed(1)}" y2="${y(value).toFixed(1)}" stroke="${theme.grid}" stroke-width="1"/><text x="${margin.left - 12}" y="${(y(value) + 5).toFixed(1)}" text-anchor="end" fill="${theme.muted}" font-size="14">${formatValue(value, poster.chart?.valueFormat)}</text>`).join('')
  const gap = 12
  const barWidth = Math.max(18, (chartWidth - gap * Math.max(prepared.length - 1, 0)) / Math.max(prepared.length, 1))
  const bars = prepared.map((item, index) => {
    const x = margin.left + index * (barWidth + gap)
    const top = Math.min(y(item.value), y(min))
    const barHeight = Math.max(0, y(min) - top)
    const labelY = Math.max(22, top - 12)
    return `<g><rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${theme.accent}"/><text x="${(x + barWidth / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="${theme.accent}" font-size="18" font-weight="800">${escapeHtml(formatValue(item.value, poster.chart?.valueFormat))}</text><text x="${(x + barWidth / 2).toFixed(1)}" y="${(margin.top + chartHeight + 28).toFixed(1)}" text-anchor="middle" fill="${theme.ink}" font-size="15">${escapeHtml(item.label)}</text></g>`
  }).join('')
  return svgFrame(width, height, theme.background, `${grid}<line x1="${margin.left}" y1="${(margin.top + chartHeight).toFixed(1)}" x2="${margin.left + chartWidth}" y2="${(margin.top + chartHeight).toFixed(1)}" stroke="${theme.ink}" stroke-width="2"/>${bars}`)
}

function formatValue(value: number, format?: string): string {
  if (format?.includes('%')) return `${value.toFixed(format.includes('0.0') ? 1 : 0)}%`
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)
}

function buildPosterCss(width: number, height: number, theme: typeof posterEditorialTheme): string {
  return `@page{size:${width}px ${height}px;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:${theme.background};color:${theme.ink};font-family:${theme.font}}body{width:${width}px;min-height:${height}px}.mv-poster{width:${width}px;height:${height}px;overflow:hidden;padding:58px 64px 42px;background:${theme.background};display:flex;flex-direction:column}.poster-hero{flex:0 0 auto}.poster-eyebrow{margin:0 0 12px;font-family:${theme.displayFont};font-size:31px;font-style:italic;letter-spacing:.02em}.poster-hero h1{max-width:940px;margin:0;color:${theme.accent};font-family:${theme.displayFont};font-size:59px;line-height:.98;letter-spacing:.01em}.poster-subtitle{max-width:800px;margin:18px 0 0;color:${theme.muted};font-size:20px;line-height:1.4}.poster-callouts{display:flex;gap:18px;align-items:stretch;margin:28px 0 8px;min-height:92px}.poster-callout{flex:1;padding:16px 20px;border:1px solid ${theme.grid};border-radius:12px;background:${theme.paper};display:flex;flex-direction:column;justify-content:center}.poster-callout strong{font-size:18px;color:${theme.accent};margin-bottom:6px}.poster-callout span,.poster-note{font-size:16px;line-height:1.4;color:${theme.muted}}.poster-note{flex:1;margin:0;padding:18px 0}.poster-chart{flex:1;display:flex;align-items:center;justify-content:center;margin-top:8px}.poster-chart svg{width:100%;height:auto;display:block}.poster-footer{display:flex;justify-content:space-between;gap:20px;margin-top:12px;padding-top:14px;border-top:1px solid ${theme.grid};font-size:13px;color:${theme.muted}}`
}

function jsonScript(value: unknown): string { return JSON.stringify(value).replace(/<\//g, '<\\u002f') }
