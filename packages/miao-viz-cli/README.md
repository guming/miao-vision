# Miao Vision CLI

`miao-viz` is a local visualization CLI for agent workflows. It reads local CSV, TSV, XLSX, and JSON files for data reports and decks, and local Markdown/text files for article-to-infographic artifacts.

## Install

```bash
npm install -g @miao-vision/cli
```

## Commands

```bash
miao-viz data profile ./examples/sales.csv
miao-viz spec catalog
miao-viz spec validate --spec ./examples/sales-dashboard.yaml --profile ./profile.json
miao-viz render report --input ./examples/sales.csv --spec ./examples/sales-dashboard.yaml --output /tmp/miao-report.html
miao-viz render report --input ./examples/sales.csv --spec ./examples/sales-dashboard.yaml --format pdf --output /tmp/miao-report.pdf
miao-viz render deck --input ./examples/sales.csv --spec ./examples/sales-deck.yaml --output /tmp/miao-deck.html
miao-viz render deck --input ./examples/sales.csv --spec ./examples/sales-deck.yaml --format pdf --output /tmp/miao-deck.pdf
miao-viz render article ./article.md --style editorial --format html --output /tmp/article-infographic.html
```

## Outcome Brief Plan-First Workflow

`artifact plan` deterministically selects a Report or Presentation for local tabular data. `artifact instantiate` can then convert an executable V2 Plan into a ReportSpec or DeckSpec:

Project-local Outcome Memory can optionally reuse explicitly confirmed delivery preferences. See [`docs/outcome-memory.md`](../../docs/outcome-memory.md) for its persistence and privacy contract.

```bash
miao-viz artifact plan \
  --brief ./brief.json \
  --context ./context.json \
  --compact \
  --output ./plan.json

miao-viz artifact instantiate \
  --plan ./plan.json \
  --context ./context.json \
  --output ./artifact-spec.yaml

miao-viz artifact validate \
  --plan ./plan.json \
  --context ./context.json \
  --input ./sales.csv \
  --spec ./artifact-spec.yaml \
  --output ./verification.json
```

All three commands accept full or compact Analyze Context. Planning supports only `tabular` → Report/Presentation. Instantiation generates a draft Spec only. Validation binds the Plan, Context, local data, and Spec into an Artifact Verification. Neither command renders, delivers, publishes, calls an LLM, or authorizes sharing.

```text
Outcome Brief → Artifact Plan V2 → ReportSpec/DeckSpec → Artifact Verification → existing Renderer
```

### Plan versions

- V2 includes `contextHash`, a discriminated `target`, and `nextAction`; it is the only executable Plan version.
- V1 remains readable for history and diagnostics but returns `PLAN_NOT_EXECUTABLE` when passed to `artifact instantiate`.
- Never translate V1 to V2 by guessing a target. Create a fresh Plan from the current Brief and Context.

### Plan actions

| `nextAction` | Caller behavior |
|---|---|
| `instantiate` | Generate the draft Spec. |
| `confirm` | Obtain confirmation, then add `--confirm-plan`. |
| `clarify` | Answer the single returned clarification by updating the Brief and replanning. |
| `stop` | Surface the unsupported reason and stop. |

An abbreviated ready Plan looks like:

```json
{
  "ok": true,
  "value": {
    "schemaVersion": "2",
    "status": "ready_with_assumptions",
    "nextAction": "instantiate",
    "form": "presentation",
    "renderer": "deck",
    "target": { "adapter": "deck-pattern", "id": "executive-brief" },
    "clarification": null
  }
}
```

Successful instantiation returns the generated Spec and execution metadata on stdout, or writes YAML with `--output`. `appliedConstraints` lists constraints enforced during planning/instantiation; `deferredConstraints` must not be described as applied.

For an external Plan with `nextAction=confirm`:

```bash
miao-viz artifact instantiate \
  --plan ./plan.json \
  --context ./context.json \
  --confirm-plan \
  --output ./report.yaml
```

`--confirm-plan` confirms only this planning choice. It does not authorize rendering, sending, publishing, or external disclosure.

If the Context has changed, instantiation returns:

```json
{
  "ok": false,
  "code": "PLAN_CONTEXT_MISMATCH",
  "message": "Artifact Plan was created for a different Analyze Context."
}
```

Create a fresh Plan with the current Context; do not bypass or patch the hash.

### Artifact Verification

The same validation command works for ReportSpec and DeckSpec; `specKind` and the Plan Adapter select the existing strict validator:

```bash
# Report
miao-viz artifact validate \
  --plan ./report-plan.json \
  --context ./context.json \
  --input ./sales.csv \
  --spec ./report.yaml

# Deck
miao-viz artifact validate \
  --plan ./deck-plan.json \
  --context ./context.json \
  --input ./sales.csv \
  --spec ./deck.yaml \
  --compact
```

| Verification status | Meaning | Caller action |
|---|---|---|
| `verified` | Plan, Context, data, target, Spec, and evidence checks passed | Render only when `renderReadiness.ready` is `true` |
| `needs_repair` | The Spec is recognizable but has actionable validation problems | Apply supported repair hints and validate again |
| `blocked` | The Plan, Context, data schema, or target is no longer executable | Stop; do not select a fallback or render |

A repairable field error is returned as a successful verification state:

```json
{
  "ok": true,
  "value": {
    "status": "needs_repair",
    "repairHints": [{
      "code": "FIELD_NOT_FOUND",
      "path": "charts.0.encoding.y.field",
      "problem": "Field 'revenue' was not found in the input data.",
      "action": "Choose an available field and validate again."
    }],
    "renderReadiness": { "ready": false, "allowedFormats": [], "blockingCodes": [] }
  }
}
```

Changing the Plan, Context, Spec, or data invalidates the previous Verification. A schema-incompatible input returns `blocked` with `DATA_CONTEXT_MISMATCH`; a Plan created from another Context returns `blocked` with `PLAN_CONTEXT_MISMATCH`. Re-analyze and replan instead of editing hashes.

A `verified` receipt does not mean that an artifact has been rendered, reviewed for its final appearance, delivered, published, or approved for external sharing. Continue through the existing Report or Deck Renderer using exactly the Spec, Context, and data that were verified.

For Agent UX, keep the plan-first interaction concise:

```text
建议生成 executive-brief Presentation，用于管理层会议；证据策略为严格验证。将继续生成草稿 DeckSpec。
```

When confirmation is required, show the selected form/target, no more than three consequential assumptions, and the safety warning. Do not show the complete Outcome Brief form. The examples above omit required hashes and metadata for readability; consume the actual CLI response.

Generate both report formats with one render:

```bash
miao-viz render report \
  --input ./examples/sales.csv \
  --spec ./examples/sales-dashboard.yaml \
  --format html,pdf \
  --output-dir /tmp/miao-report
```

## Recurring Reports

Create a project from a verified Report Spec and AnalyzeContext, then replay it on new-period data:

```bash
miao-viz report init ./sales-weekly \
  --input ./week-28.xlsx \
  --spec ./report.yaml \
  --context ./context.json \
  --period 2026-W28 \
  --dry-run

miao-viz report update ./sales-weekly \
  --input ./week-29.xlsx \
  --period 2026-W29 \
  --format html,pdf

miao-viz report info ./sales-weekly
miao-viz report history ./sales-weekly
miao-viz report clean ./sales-weekly --keep 10
```

Recurring projects freeze Evidence recipes and the Report Spec, validate each new input against a data contract, and keep independent run manifests and artifacts. Cleaning is a preview unless `--confirm` is provided.

Deck examples are included for several common presentation scenarios:

- `sales-deck.yaml`
- `product-metrics-deck.yaml`
- `finance-review-deck.yaml`
- `ops-update-deck.yaml`

Deck HTML supports arrow-key navigation and fullscreen mode. Direct Deck PDF export uses a fixed 16:9 page with one Slide per page.

DeckSpec validation returns structured repair information. `INVALID_DECK_SPEC` includes an `errors` array with `path`, `message`, and `hint`; `DECK_FIELD_NOT_FOUND` identifies missing fields in chart encodings, chart transforms, or metric transforms.

## Agent Usage

Install the CLI, then install the `miao-vision` skill for Codex or Claude. The skill will call `miao-viz` from your `PATH`.

## Notes

- Default output format is HTML.
- Report PDF defaults to A4 portrait; Deck PDF defaults to 16:9. PDF export requires Playwright Chromium.
- Multi-format Report output uses `--format html,pdf --output-dir <directory>`.
- Recurring report projects currently support Data Reports; Decks support direct PDF export but not recurring projects.
- `article` reads local Markdown/text only; agents should fetch URLs and normalize them before calling the CLI.
- The CLI does not call an LLM or require an API key.
