import { describe, expect, it } from 'vitest'
import { projectSchema, runManifestSchema } from './report-project-types'

const projectBase = {
  name: 'sales', createdAt: '2026-08-25T00:00:00.000Z', projectVersion: 1,
  specHash: 'spec', evidencePlanHash: 'plan'
}

const runBase = {
  id: '2026-08', status: 'ready' as const,
  input: { path: '/tmp/input.csv', sha256: 'input' }, projectVersion: 1,
  inputHash: 'input', specHash: 'spec', evidencePlanHash: 'plan',
  createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z', artifacts: {}
}

describe('report project schema compatibility', () => {
  it('loads legacy and profile-aware projects', () => {
    expect(projectSchema.parse({ schemaVersion: 1, ...projectBase }).schemaVersion).toBe(1)
    expect(projectSchema.parse({ schemaVersion: 2, ...projectBase, reportProfileHash: 'profile' }))
      .toMatchObject({ schemaVersion: 2, reportProfileHash: 'profile' })
  })

  it('requires a profile hash for version 2 projects', () => {
    expect(projectSchema.safeParse({ schemaVersion: 2, ...projectBase }).success).toBe(false)
  })

  it('loads manifest versions 1, 2, and 3', () => {
    expect(runManifestSchema.parse({ schemaVersion: 1, ...runBase }).schemaVersion).toBe(1)
    expect(runManifestSchema.parse({ schemaVersion: 2, ...runBase }).schemaVersion).toBe(2)
    expect(runManifestSchema.parse({
      schemaVersion: 3, ...runBase, reportProfileHash: 'profile', baselineRunId: null,
      changes: { status: 'no_baseline', metrics: 0, rankings: 0, anomaliesAdded: 0, anomaliesRemoved: 0, notComparable: 1 },
      review: { status: 'ready', materialChanges: 0, warnings: 0, blockingIssues: 0 }
    })).toMatchObject({ schemaVersion: 3, reportProfileHash: 'profile' })
  })

  it('rejects incomplete version 3 manifests', () => {
    expect(runManifestSchema.safeParse({ schemaVersion: 3, ...runBase, reportProfileHash: 'profile' }).success).toBe(false)
  })
})
