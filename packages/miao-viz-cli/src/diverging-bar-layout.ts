import type { AgentChartSpec } from './types'

export interface DivergingBarDatum {
  row: Record<string, unknown>
  index: number
  label: string
  value: number
}

export interface DivergingBarLayout {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  plotWidth: number
  plotHeight: number
  domainMin: number
  domainMax: number
  zeroX: number
  step: number
  ticks: number[]
  data: DivergingBarDatum[]
}

function numericStyle(chart: AgentChartSpec, key: string, fallback: number): number {
  const value = Number(chart.style?.[key])
  return Number.isFinite(value) ? value : fallback
}

function niceStep(span: number, targetTicks = 6): number {
  const rough = span / targetTicks
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, Number.EPSILON)))
  const normalized = rough / power
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return factor * power
}

export function computeDivergingBarLayout(
  chart: AgentChartSpec,
  rows: Record<string, unknown>[]
): DivergingBarLayout | null {
  const categoryField = chart.encoding?.x?.field ?? ''
  const measureField = chart.encoding?.y?.field ?? ''
  if (!categoryField || !measureField) return null

  const data = rows.flatMap((row, index) => {
    const value = Number(row[measureField])
    return Number.isFinite(value)
      ? [{ row, index, label: String(row[categoryField] ?? '—'), value }]
      : []
  })
  if (data.length === 0) return null

  const sort = chart.style?.divergingSort ?? 'asc'
  if (sort === 'asc' || sort === 'desc') {
    data.sort((a, b) => sort === 'asc' ? a.value - b.value : b.value - a.value)
  }

  const width = numericStyle(chart, 'width', 720)
  const rowHeight = numericStyle(chart, 'rowHeight', 25)
  const margin = { top: 54, right: 44, bottom: 24, left: 44 }
  const height = numericStyle(chart, 'height', Math.max(420, margin.top + margin.bottom + data.length * rowHeight))
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  const rawMin = Math.min(0, ...data.map(item => item.value))
  const rawMax = Math.max(0, ...data.map(item => item.value))
  const rawSpan = Math.max(rawMax - rawMin, 1)
  const step = niceStep(rawSpan)
  const domainMin = Number.isFinite(Number(chart.style?.xDomainMin))
    ? Number(chart.style?.xDomainMin)
    : Math.floor(rawMin / step) * step
  const domainMax = Number.isFinite(Number(chart.style?.xDomainMax))
    ? Number(chart.style?.xDomainMax)
    : Math.ceil(rawMax / step) * step
  const domainSpan = Math.max(domainMax - domainMin, 1)
  const scale = (value: number) => margin.left + ((value - domainMin) / domainSpan) * plotWidth
  const ticks: number[] = []
  for (let tick = Math.ceil(domainMin / step) * step; tick <= domainMax + step / 100; tick += step) {
    ticks.push(Number(tick.toFixed(10)))
  }

  return {
    width,
    height,
    margin,
    plotWidth,
    plotHeight,
    domainMin,
    domainMax,
    zeroX: scale(0),
    step: plotHeight / data.length,
    ticks,
    data
  }
}

export function scaleDivergingValue(layout: DivergingBarLayout, value: number): number {
  return layout.margin.left + ((value - layout.domainMin) / (layout.domainMax - layout.domainMin)) * layout.plotWidth
}
