import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/miao-viz.mjs', ...args], { encoding: 'utf8' })
  return { status: result.status, body: JSON.parse(result.stdout) }
}

const workflows = [
  { pattern: 'topic-explainer', file: 'test_data/deck-context/topic-explainer.md', intent: 'Explain evidence grounding' },
  { pattern: 'project-update', file: 'test_data/deck-context/project-update.md', intent: 'Project update and decision' },
  { pattern: 'proposal', file: 'test_data/deck-context/proposal.md', intent: 'Compare rollout approaches and choose one' }
] as const

describe('Markdown-only deck workflow', () => {
  for (const workflow of workflows) {
    it(`runs analyze, instantiate, strict validate, and render for ${workflow.pattern}`, () => {
      const dir = mkdtempSync(join(tmpdir(), `miao-${workflow.pattern}-`))
      const context = join(dir, 'context.json')
      const spec = join(dir, 'deck.yaml')
      const output = join(dir, 'deck.html')
      expect(run(['deck', 'analyze', workflow.file, '--intent', workflow.intent, '--output', context]).status).toBe(0)
      expect(run(['deck', 'instantiate', workflow.pattern, '--context', context, '--output', spec]).status).toBe(0)
      expect(run(['deck', 'validate', '--spec', spec, '--context', context, '--strict']).status).toBe(0)
      const rendered = run(['render', 'deck', '--spec', spec, '--context', context, '--strict', '--output', output])
      expect(rendered.status).toBe(0)
      expect(rendered.body.value.slides).toBeGreaterThanOrEqual(5)
      expect(rendered.body.value.slides).toBeLessThanOrEqual(10)
      expect(rendered.body.value.sourceValidated).toBe(true)
      expect(rendered.body.value.delivery.verification.verified).toBe(false)
      expect((readFileSync(output, 'utf8').match(/class="slide(?: |")/g) ?? [])).toHaveLength(rendered.body.value.slides)
    })
  }

  it('rejects a single-title shell and preserves unverified numeric status', () => {
    const unsupported = run(['deck', 'instantiate', 'project-update', '--context', 'test_data/deck-context/narrative.json'])
    expect(unsupported.body).toMatchObject({ ok: false, code: 'DECK_PATTERN_UNSUPPORTED' })
    const dir = mkdtempSync(join(tmpdir(), 'miao-numeric-'))
    const context = join(dir, 'context.json')
    const spec = join(dir, 'deck.yaml')
    run(['deck', 'analyze', 'test_data/deck-context/project-update.md', '--intent', 'Project update and decision', '--output', context])
    run(['deck', 'instantiate', 'project-update', '--context', context, '--output', spec])
    expect(readFileSync(spec, 'utf8')).toContain('claimStatus: author-claim')
  })
})
