import type { AgentChartSpec, AgentDataTransform, AgentGlobalFilter, AgentProvenance } from './types'
import type { ThemeName } from './themes/types'

export type SlideLayout =
  | 'cover'
  | 'title-only'
  | 'text-points'
  | 'text-chart'
  | 'metrics-chart'
  | 'chart-full'
  | 'table-full'
  | 'quote-focus'
  | 'section-summary'
  | 'comparison-text'
  | 'decision'
  | 'ending'

export interface SlideMetric {
  label: string
  value?: string | number
  format?: string
  data?: {
    transform?: AgentDataTransform[]
  }
  provenance?: AgentProvenance
}

export type DeckIntent = 'executive-brief' | 'business-review'
export type DeckPattern = DeckIntent | 'topic-explainer' | 'project-update' | 'proposal'
export type DeckClaimStatus = 'source-text' | 'author-claim' | 'verified-claim'

export interface ContentProvenance {
  sourceId: string
  sectionId?: string
  paragraphIds?: string[]
  kind: DeckClaimStatus
}

export type DeckClaimType =
  | 'descriptive'
  | 'rank'
  | 'delta'
  | 'trend'
  | 'share'
  | 'comparative'
  | 'evaluative'
  | 'causal'
  | 'predictive'

export type DeckClaimCheck =
  | 'evidence_ref_exists'
  | 'value_match'
  | 'rank_position'
  | 'delta_formula'
  | 'trend_periods'
  | 'share_formula'
  | 'benchmark_present'
  | 'caveat_present'

export interface DeckClaimArgs {
  expected?: string | number
  value?: string
  rows?: string
  series?: string
  subjectField?: string
  valueField?: string
  subject?: string
  expectedRank?: number
  order?: 'asc' | 'desc'
  from?: string
  to?: string
  mode?: 'absolute' | 'percent' | 'percentage-point'
  minimumPeriods?: number
  direction?: 'up' | 'down' | 'flat'
  numerator?: string
  denominator?: string
  benchmark?: string
  tolerance?: number
}

export interface KnowledgeEscape {
  acknowledged: true
  reason: string
  caveat: string
}

export interface DeckRecommendation {
  text: string
  kind: 'analytical-next-step' | 'operational-recommendation'
  evidence?: string[]
  derivedFrom?: string[]
  caveat: string
}

export interface DeckCaveat {
  text: string
  warningRefs: string[]
}

export interface SlideSpec {
  layout: SlideLayout
  slideRole?: string
  purpose?: string
  sourceRefs?: ContentProvenance[]
  claimStatus?: DeckClaimStatus
  eyebrow?: string
  title?: string
  claim?: string
  claimType?: DeckClaimType
  evidence?: string[]
  derivedFrom?: string[]
  check?: DeckClaimCheck
  claimArgs?: DeckClaimArgs
  escape?: KnowledgeEscape
  caveat?: string
  warningRefs?: string[]
  recommendation?: DeckRecommendation
  bullets?: string[]
  comparison?: { left: string[]; right: string[] }
  callout?: string
  annotation?: string
  metrics?: SlideMetric[]
  charts?: AgentChartSpec[]
}

export interface DeckInteractions {
  globalFilters?: AgentGlobalFilter[]
}

export interface DeckSpec {
  title?: string
  description?: string
  intent?: DeckIntent
  pattern?: DeckPattern
  audience?: string
  objective?: string
  caveats?: DeckCaveat[]
  theme?: ThemeName
  interactions?: DeckInteractions
  slides: SlideSpec[]
}
