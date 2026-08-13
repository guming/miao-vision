import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzeDeckDocument } from './deck-content-analyzer'
import { deckContextSchema } from './deck-context-schema'

describe('analyzeDeckDocument', () => {
  it('builds a deterministic DeckContext from Markdown', () => {
    const file = 'test_data/deck-context/project-update.md'
    const options = { intent: '给管理层汇报，10 分钟，重点说明风险', workspaceRoot: process.cwd() }
    const first = analyzeDeckDocument(file, options)
    const second = analyzeDeckDocument(file, options)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(deckContextSchema.safeParse(first.value).success).toBe(true)
      expect(first.value.request).toMatchObject({ audience: 'executives', durationMinutes: 10, tone: 'concise' })
      expect(first.value.narrative?.explicitClaims[0]).toMatchObject({ status: 'author-claim', signals: expect.arrayContaining(['numeric', 'change']) })
      expect(first.value.narrative?.images[0]).toMatchObject({ kind: 'remote', target: 'https://example.test/atlas.png' })
      expect(first.value.narrative?.images[0].sectionId).toBe(first.value.narrative?.sections[1].id)
      expect(first.value.narrative?.quotes[0].sectionId).toBe(first.value.narrative?.sections[1].id)
      expect(first.value.warnings?.[0].code).toBe('REMOTE_IMAGE_NOT_FROZEN')
    }
  })

  it('supports plain text without inventing a duration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-doc-'))
    const file = join(dir, 'notes.txt')
    writeFileSync(file, 'A concise project explanation.', 'utf8')
    const result = analyzeDeckDocument(file, { intent: 'Explain this note', workspaceRoot: dir })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sources[0].kind).toBe('text')
      expect(result.value.request.durationMinutes).toBeUndefined()
    }
  })

  it('returns stable errors for empty, unsupported, and missing inputs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-doc-'))
    const empty = join(dir, 'empty.md')
    const unsupported = join(dir, 'notes.html')
    writeFileSync(empty, '  \n', 'utf8')
    writeFileSync(unsupported, '<p>Notes</p>', 'utf8')
    expect(analyzeDeckDocument(empty, { intent: 'Explain' })).toMatchObject({ ok: false, code: 'EMPTY_DECK_DOCUMENT' })
    expect(analyzeDeckDocument(unsupported, { intent: 'Explain' })).toMatchObject({ ok: false, code: 'UNSUPPORTED_DECK_DOCUMENT' })
    expect(analyzeDeckDocument(join(dir, 'missing.md'), { intent: 'Explain' })).toMatchObject({ ok: false, code: 'DECK_DOCUMENT_UNREADABLE' })
  })
})
