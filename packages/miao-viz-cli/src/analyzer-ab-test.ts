import type { AnalyzeEvidence, AnalyzeField } from './context-schema'
import type { LoadedDataset } from './types'

export function buildAbTestEvidence(
  dataset: LoadedDataset,
  fields: AnalyzeField[],
  intent: string
): AnalyzeEvidence | null {
  if (!/a\s*\/\s*b|experiment|variant|实验|对照组/i.test(intent)) return null
  const text = (field: AnalyzeField) => [field.name, ...(field.semanticTags ?? [])].join(' ').toLowerCase()
  const variant = fields.find(field =>
    ['dimension', 'status', 'flag'].includes(field.role) && /variant|group|treatment|实验组|对照组/.test(text(field))
  )
  const sample = fields.find(field =>
    (field.role === 'measure' || field.role === 'score') && /sample|count|users?|visitors?|样本|人数/.test(text(field))
  )
  const rate = fields.find(field =>
    (field.role === 'measure' || field.role === 'score') && /conversion.*rate|success.*rate|转化率|成功率/.test(text(field))
  )
  if (!variant || !sample || !rate) return null
  const groups = dataset.rows.map(row => ({
    variant: String(row[variant.name] ?? ''),
    sample: Number(row[sample.name]),
    rate: Number(row[rate.name])
  })).filter(row => row.variant && Number.isFinite(row.sample) && row.sample > 0 && Number.isFinite(row.rate))
  if (groups.length !== 2 || groups.some(group => group.rate < 0 || group.rate > 1)) return null
  const [a, b] = groups
  const successesA = a.sample * a.rate
  const successesB = b.sample * b.rate
  const pooled = (successesA + successesB) / (a.sample + b.sample)
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / a.sample + 1 / b.sample))
  if (!Number.isFinite(standardError) || standardError === 0) return null
  const zScore = (b.rate - a.rate) / standardError
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)))
  return {
    id: 'ab_test_significance',
    query: `Two-proportion z-test comparing ${a.variant} and ${b.variant}; descriptive unless assumptions are accepted.`,
    values: {
      baseline_variant: a.variant, treatment_variant: b.variant,
      baseline_rate: a.rate, treatment_rate: b.rate, difference: b.rate - a.rate,
      z_score: zScore, p_value: pValue, significant_at_0_05: pValue < 0.05,
      baseline_sample: a.sample, treatment_sample: b.sample
    }
  }
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * x)
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x))
  return 0.5 * (1 + erf)
}
