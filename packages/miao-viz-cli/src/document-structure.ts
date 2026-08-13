export const DOCUMENT_EXTENSIONS = ['.md', '.markdown', '.txt'] as const

export interface DocumentHeading {
  level: number
  text: string
}

export interface DocumentSection {
  heading: string | null
  content: string
  wordCount: number
}

export interface DocumentImage {
  alt: string
  target: string
}

export interface DocumentStructure {
  normalized: string
  lines: string[]
  bodyLines: string[]
  frontmatter: Record<string, string>
  headings: DocumentHeading[]
  sections: DocumentSection[]
  paragraphs: string[]
  listItems: string[]
  quotes: string[]
  tables: string[][]
  images: DocumentImage[]
}

export function normalizeDocumentText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.replace(/[ \u00a0]+$/g, ''))
    .join('\n')
    .trim()
}

export function parseDocumentStructure(raw: string): DocumentStructure {
  const normalized = normalizeDocumentText(raw)
  const lines = normalized ? normalized.split('\n') : []
  const { bodyLines, frontmatter } = splitFrontmatter(lines)
  const contentLines = bodyLines.filter(line => {
    const trimmed = line.trim()
    return !trimmed.match(/^#\s+/) && !trimmed.match(/^(source|url|author|date|title|published|created|tags?|description):\s*/i)
  })

  return {
    normalized,
    lines,
    bodyLines,
    frontmatter,
    headings: extractHeadings(bodyLines),
    sections: extractSections(bodyLines),
    paragraphs: extractParagraphs(contentLines),
    listItems: contentLines
      .filter(line => line.trim().match(/^[-*+]\s+/) || line.trim().match(/^\d+\.\s+/))
      .map(line => cleanMarkdown(line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')))
      .filter(Boolean),
    quotes: contentLines
      .filter(line => line.trim().startsWith('>'))
      .map(line => cleanMarkdown(line.replace(/^>\s?/, '')))
      .filter(Boolean),
    tables: extractTableRows(contentLines),
    images: extractImages(bodyLines)
  }
}

function splitFrontmatter(lines: string[]): { bodyLines: string[]; frontmatter: Record<string, string> } {
  if (lines[0]?.trim() !== '---') return { bodyLines: lines, frontmatter: {} }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end < 1) return { bodyLines: lines, frontmatter: {} }
  const frontmatter: Record<string, string> = {}
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([^:#][^:]*):\s*(.*)$/)
    if (!match) continue
    frontmatter[match[1].trim().toLowerCase()] = match[2].replace(/^["']|["']$/g, '').trim()
  }
  return { bodyLines: lines.slice(end + 1), frontmatter }
}

function extractHeadings(lines: string[]): DocumentHeading[] {
  return lines
    .map(line => line.trim().match(/^(#{1,6})\s+(.+)/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(match => ({ level: match[1].length, text: cleanMarkdown(match[2]) }))
}

function extractSections(lines: string[]): DocumentSection[] {
  const sections: DocumentSection[] = []
  let heading: string | null = null
  let content: string[] = []
  const flush = () => {
    const text = content.join(' ').replace(/\s+/g, ' ').trim()
    if (text) sections.push({ heading, content: text, wordCount: words(text) })
    content = []
  }
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line.trim())) {
      flush()
      heading = cleanMarkdown(line)
    } else if (line.trim()) {
      content.push(line.trim())
    }
  }
  flush()
  return sections
}

function extractParagraphs(lines: string[]): string[] {
  return lines
    .join('\n')
    .split(/\n{2,}/)
    .map(block => cleanMarkdown(block.replace(/\n/g, ' ')))
    .filter(block => block.length > 0 && !block.startsWith('|') && !block.match(/^[-*+]\s+/))
}

function extractTableRows(lines: string[]): string[][] {
  return lines
    .filter(line => line.includes('|') && !line.match(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/))
    .map(line => line.split('|').map(cell => cleanMarkdown(cell)).filter(Boolean))
    .filter(row => row.length > 1)
}

function extractImages(lines: string[]): DocumentImage[] {
  const images: DocumentImage[] = []
  for (const line of lines) {
    for (const match of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
      images.push({ alt: cleanMarkdown(match[1]), target: match[2] })
    }
  }
  return images
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function words(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}
