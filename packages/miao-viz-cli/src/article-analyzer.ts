import { readFileSync } from 'node:fs'
import { extname, basename } from 'node:path'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'
import { DOCUMENT_EXTENSIONS, parseDocumentStructure } from './document-structure'

export interface ArticleHeading {
  level: number
  text: string
}

export interface ArticleSection {
  heading: string | null
  content: string
  wordCount: number
}

export interface ArticleContext {
  title: string
  source?: string
  headings: ArticleHeading[]
  sections: ArticleSection[]
  paragraphs: string[]
  listItems: string[]
  quotes: string[]
  tables: string[][]
  metadata: {
    inputFile: string
    wordCount: number
    estimatedReadingMinutes: number
    lineCount: number
  }
  termCandidates: string[]
}

const ACRONYM_PATTERN = /\b[A-Z]{2,}(?:s)?\b/g
const TECHNICAL_PATTERN = /\b(?:[A-Z][a-z]+[A-Z]\w*|[a-z]+[A-Z]\w*)\b/g
const NUMBERED_TERM_PATTERN = /\b[A-Za-z]+(?:\s+\d+(?:\.\d+)?){1,2}\b/g

function extractTermCandidates(text: string): string[] {
  const candidates = new Set<string>()
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('>') || trimmed.startsWith('|') || trimmed.startsWith('#')) continue

    const matches = trimmed.matchAll(ACRONYM_PATTERN)
    for (const m of matches) {
      if (m[0].length >= 2 && !['I', 'II', 'III', 'IV', 'VI'].includes(m[0])) {
        candidates.add(m[0])
      }
    }

    const techMatches = trimmed.matchAll(TECHNICAL_PATTERN)
    for (const m of techMatches) {
      if (m[0].length >= 6) candidates.add(m[0])
    }

    const numberedMatches = trimmed.matchAll(NUMBERED_TERM_PATTERN)
    for (const m of numberedMatches) {
      if (m[0].length >= 5) candidates.add(m[0])
    }
  }

  return [...candidates].sort()
}

function findTitle(lines: string[], frontmatterTitle?: string, file?: string): string {
  if (frontmatterTitle) return frontmatterTitle
  const heading = lines.find(line => line.trim().match(/^#\s+\S/))
  if (heading) return heading.replace(/^#\s+/, '').replace(/[`*_]/g, '').trim()
  if (file) {
    return basename(file, extname(file)).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return 'Untitled'
}

function legacyMetadata(lines: string[]): { source?: string; title?: string } {
  const sourceLine = lines.find(line => line.match(/^(source|url):\s*/i))
  const titleLine = lines.find(line => line.match(/^title:\s*/i))
  return {
    source: sourceLine?.replace(/^(source|url):\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim(),
    title: titleLine?.replace(/^title:\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim()
  }
}

export function analyzeArticle(file: string): AgentResult<ArticleContext> {
  const extension = extname(file).toLowerCase()
  if (extension && !DOCUMENT_EXTENSIONS.includes(extension as (typeof DOCUMENT_EXTENSIONS)[number])) {
    return agentError('UNSUPPORTED_ARTICLE_INPUT', 'Article input must be a Markdown or plain-text file.', {
      supportedExtensions: ['.md', '.markdown', '.txt']
    })
  }

  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (error) {
    return agentError('ARTICLE_INPUT_UNREADABLE', error instanceof Error ? error.message : 'Article input could not be read.', { file })
  }

  const document = parseDocumentStructure(raw)
  if (!document.normalized) {
    return agentError('EMPTY_ARTICLE_INPUT', 'Article input is empty after normalization.', { file })
  }

  const metadata = legacyMetadata(document.lines)
  const title = findTitle(document.bodyLines, document.frontmatter.title ?? metadata.title, file)
  const allText = document.paragraphs.join(' ')
  const wordCount = allText.split(/\s+/).filter(Boolean).length
  const termCandidates = extractTermCandidates(document.normalized)

  return ok({
    title,
    source: document.frontmatter.source ?? document.frontmatter.url ?? metadata.source,
    headings: document.headings,
    sections: document.sections,
    paragraphs: document.paragraphs,
    listItems: document.listItems,
    quotes: document.quotes,
    tables: document.tables,
    metadata: {
      inputFile: file,
      wordCount,
      estimatedReadingMinutes: Math.max(1, Math.round(wordCount / 200)),
      lineCount: document.lines.length
    },
    termCandidates
  })
}
