# Outcome Memory

Outcome Memory is an optional, project-local preference file for Miao Vision's plan-first workflow. It reduces repeated questions about stable delivery preferences without creating a global user profile or uploading data.

The Skill uses this default project path:

```text
./miao-vision/outcome-memory.json
```

The CLI never scans the current directory or parent directories for Memory. Pass `--memory` explicitly. Omitting that flag preserves the original stateless behavior.

## Privacy boundary

Memory may contain only confirmed Outcome Brief preferences such as audience, form, density, tone, evidence policy, privacy, locale, brand reference, and update cadence.

It does not store:

- raw requests, key questions, decisions, or reporting periods;
- source data, Evidence, metrics, values, rows, or file paths;
- inferred values, Source Hints, or product defaults.

`explicit` means the user used durable language such as “以后”“默认”“每次” or “这个项目都”. `confirmed` means the Agent proposed a preference and the user accepted it. Both still require `--confirm` before the CLI writes the file.

## First confirmation and save

Create a minimal proposal after the user confirms:

```json
{
  "schemaVersion": "1",
  "preferences": [
    {
      "field": "delivery.tone",
      "value": "executive",
      "source": "confirmed",
      "updatedAt": "2026-08-11T10:00:00.000Z"
    }
  ]
}
```

Use the actual current ISO timestamp, then write it explicitly:

```bash
miao-viz artifact memory update \
  --memory ./miao-vision/outcome-memory.json \
  --proposal ./preference-update.json \
  --confirm
```

Without `--confirm`, the command returns `MEMORY_CONFIRMATION_REQUIRED` and does not create or modify the file. If the user declines the suggestion, skip this command and continue the current task.

## Reuse and current-task override

Inspect the saved preferences:

```bash
miao-viz artifact memory inspect \
  --memory ./miao-vision/outcome-memory.json
```

Use them during planning:

```bash
miao-viz artifact plan \
  --brief ./brief.json \
  --context ./context.json \
  --memory ./miao-vision/outcome-memory.json \
  --compact
```

The current Draft Brief always wins over Memory. For example, a saved `executive` tone is reused normally, but “这次请用分析型语气” applies `analytical` to the current task without changing Memory.

An explicitly supplied missing file returns `MEMORY_NOT_FOUND`. An invalid or damaged file returns `INVALID_OUTCOME_MEMORY`. Miao Vision does not silently ignore either condition.

## Forget preferences

Remove one confirmed preference after showing it and obtaining confirmation:

```bash
miao-viz artifact memory forget \
  --memory ./miao-vision/outcome-memory.json \
  --field delivery.tone \
  --confirm
```

Clear all preferences only after explicit confirmation:

```bash
miao-viz artifact memory forget \
  --memory ./miao-vision/outcome-memory.json \
  --confirm
```

Clearing leaves a valid empty Memory file. To disable Memory without changing it, omit `--memory` from `artifact plan`.

## User-facing guidance

Use `--summary` when the user needs a concise recommendation rather than the machine protocol:

```bash
miao-viz artifact plan \
  --brief ./brief.json \
  --context ./context.json \
  --summary

miao-viz artifact validate \
  --plan ./plan.json \
  --context ./context.json \
  --input ./sales.csv \
  --spec ./report.yaml \
  --summary
```

Guidance contains the recommended form and structure, no more than three assumptions, a safety notice, and at most one question. It excludes hashes, Adapters, Catalog internals, raw requests, Evidence rows, and paths.

For external delivery, previously confirmed privacy and evidence preferences are reused, but Share Safety still applies. If those safety preferences came from defaults, planning returns a confirmation action instead of silently proceeding.

`artifact plan` plans only local tabular Report/Presentation outcomes. `artifact instantiate` creates a Spec, and `artifact validate` creates a verification receipt. None of these commands renders, delivers, publishes, calls an LLM, or authorizes sharing.
