import { describe, expect, it } from 'vitest'
import { normalizeDocumentText, parseDocumentStructure } from './document-structure'

const COMPLETE_DOCUMENT = `---
title: "Quarterly Review"
source: https://example.test/review
author: Miao
---
# Quarterly Review

Opening **paragraph** with [context](https://example.test/context).

## Progress

- First milestone
2. Second milestone

> A focused quote.

| Metric | Value |
| --- | ---: |
| Adoption | 42% |

![Local chart](./chart.png)
![Remote chart](https://example.test/chart.png)
`

describe('parseDocumentStructure', () => {
  it('extracts frontmatter, headings, paragraphs, lists, quotes, tables, and images', () => {
    const parsed = parseDocumentStructure(COMPLETE_DOCUMENT)

    expect(parsed.frontmatter).toEqual({
      title: 'Quarterly Review',
      source: 'https://example.test/review',
      author: 'Miao'
    })
    expect(parsed.headings).toEqual([
      { level: 1, text: 'Quarterly Review' },
      { level: 2, text: 'Progress' }
    ])
    expect(parsed.paragraphs).toContain('Opening paragraph with context.')
    expect(parsed.listItems).toEqual(['First milestone', 'Second milestone'])
    expect(parsed.quotes).toEqual(['A focused quote.'])
    expect(parsed.tables).toContainEqual(['Metric', 'Value'])
    expect(parsed.images).toEqual([
      { alt: 'Local chart', target: './chart.png' },
      { alt: 'Remote chart', target: 'https://example.test/chart.png' }
    ])
  })

  it('is deterministic for the same input', () => {
    expect(parseDocumentStructure(COMPLETE_DOCUMENT)).toEqual(parseDocumentStructure(COMPLETE_DOCUMENT))
  })

  it('normalizes CRLF, tabs, non-breaking spaces, and trailing spaces', () => {
    expect(normalizeDocumentText('Title\r\n\tBody\u00a0  \r\n')).toBe('Title\n Body')
  })

  it('returns an empty structure for empty input', () => {
    expect(parseDocumentStructure('  \n\t ')).toMatchObject({
      normalized: '', lines: [], bodyLines: [], headings: [], sections: [], paragraphs: []
    })
  })

  it('treats an unterminated frontmatter fence as document content', () => {
    const parsed = parseDocumentStructure('---\ntitle: Draft\n# Body')
    expect(parsed.frontmatter).toEqual({})
    expect(parsed.bodyLines).toEqual(['---', 'title: Draft', '# Body'])
  })
})
