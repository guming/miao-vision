import type { SlideSpec } from './deck-types'
import { escapeHtml } from './svg-renderer'

export function renderQuoteFocusSlide(slide: SlideSpec, index: number, total: number): string {
  return frame('slide slide-quote-focus', `
    ${eyebrow(slide)}
    <blockquote>${escapeHtml(slide.claim ?? slide.bullets?.[0] ?? '')}</blockquote>
    ${slide.callout ? `<div class="quote-source">${escapeHtml(slide.callout)}</div>` : ''}
  `, index, total)
}

export function renderSectionSummarySlide(slide: SlideSpec, index: number, total: number): string {
  return frame('slide slide-section-summary', `
    ${eyebrow(slide)}
    <div class="slide-title">${escapeHtml(slide.title ?? '')}</div>
    ${slide.claim ? `<div class="slide-claim">${escapeHtml(slide.claim)}</div>` : ''}
    ${bullets(slide.bullets)}
  `, index, total)
}

export function renderComparisonTextSlide(slide: SlideSpec, index: number, total: number): string {
  const items = slide.bullets ?? []
  const split = Math.ceil(items.length / 2)
  const left = slide.comparison?.left ?? items.slice(0, split)
  const right = slide.comparison?.right ?? items.slice(split)
  return frame('slide slide-comparison-text', `
    ${eyebrow(slide)}
    <div class="slide-title">${escapeHtml(slide.title ?? '')}</div>
    <div class="narrative-comparison">
      <div>${bullets(left)}</div>
      <div>${bullets(right)}</div>
    </div>
  `, index, total)
}

export function renderDecisionSlide(slide: SlideSpec, index: number, total: number): string {
  return frame('slide slide-decision', `
    ${eyebrow(slide)}
    <div class="slide-title">${escapeHtml(slide.title ?? 'Decision')}</div>
    ${slide.claim ? `<div class="decision-request">${escapeHtml(slide.claim)}</div>` : ''}
    ${bullets(slide.bullets)}
    ${slide.caveat ? `<div class="decision-limit">${escapeHtml(slide.caveat)}</div>` : ''}
  `, index, total)
}

function frame(className: string, content: string, index: number, total: number): string {
  return `<div class="${className}">${content}<div class="slide-footer-mark">miao-vision</div><div class="slide-page-num">${index + 1} / ${total}</div></div>`
}

function eyebrow(slide: SlideSpec): string {
  return slide.eyebrow ? `<div class="slide-eyebrow">${escapeHtml(slide.eyebrow)}</div>` : ''
}

function bullets(items?: string[]): string {
  return items?.length ? `<ul class="slide-pts">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''
}
