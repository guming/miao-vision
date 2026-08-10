# Outcome Brief Plan-First Workflow

Use this workflow only for an explicit plan-first request or when a local tabular request does not materially establish Report versus Presentation. Keep explicit Report, Deck/Presentation, and Article requests on their existing workflows without calling the Planner.

## Boundaries

- Support only local tabular Analyze Context → Report/Presentation planning.
- Build the Draft Brief from the request; never show the full Brief field set as a form.
- Ask at most one question, and only the question returned by the Plan.
- Treat Artifact Plan V2 as executable. V1 is readable history and must return `PLAN_NOT_EXECUTABLE` if passed to instantiate.
- Treat `artifact instantiate` as Spec creation only. Always validate through the selected workflow before rendering.
- Never treat `--confirm-plan` as authorization to render, send, publish, or expose sensitive data.

## Plan

Analyze the local data once, then create a minimal Draft Brief containing `schemaVersion`, `rawRequest`, and only fields clearly established by the user. Do not ask about density, tone, evidence policy, locale, or other defaultable fields.

```bash
miao-viz data analyze /path/to/data.csv \
  --intent "user request" \
  --compact \
  --output SYSTEM_TEMP/miao-vision/context.json

miao-viz artifact plan \
  --brief SYSTEM_TEMP/miao-vision/brief.json \
  --context SYSTEM_TEMP/miao-vision/context.json \
  --compact \
  --output SYSTEM_TEMP/miao-vision/plan.json
```

Display only:

- recommended form;
- target id;
- at most three consequential assumptions;
- share-safety or draft warning;
- one confirmation or clarification question when required.

Do not expose hashes, full Context, intermediate paths, or low-risk defaults unless needed to explain an error.

## Follow `nextAction`

| `nextAction` | Required behavior |
|---|---|
| `instantiate` | Instantiate the Spec without asking another question. |
| `confirm` | Summarize the form, target, consequential assumptions, and safety warning; obtain confirmation before using `--confirm-plan`. |
| `clarify` | Ask exactly `clarification.question`, using its options. Update the Draft Brief from the answer and rerun `artifact plan`; do not patch the Plan. |
| `stop` | Explain the first selection reason and stop; do not guess another workflow. |

For confirmation, use concise language such as:

```text
建议生成 business-overview Report，用于外部交付；严格证据策略和隐私范围来自默认值，需要确认。是否继续生成草稿 Spec？
```

## Instantiate

For `instantiate`:

```bash
miao-viz artifact instantiate \
  --plan SYSTEM_TEMP/miao-vision/plan.json \
  --context SYSTEM_TEMP/miao-vision/context.json \
  --output SYSTEM_TEMP/miao-vision/artifact-spec.yaml
```

For a confirmed `confirm` Plan, add `--confirm-plan`. Do not use the flag before receiving confirmation.

Handle structured failures without fallback guessing:

- `PLAN_CONTEXT_MISMATCH`: rerun `artifact plan` with the current Context.
- `PLAN_CONFIRMATION_REQUIRED`: obtain confirmation; do not silently add the flag.
- `PLAN_STATUS_BLOCKED`: follow the Plan clarification or unsupported reason.
- `PLAN_TARGET_BLOCKED` or `PLAN_TARGET_UNAVAILABLE`: stop and report that the planned Catalog target is no longer executable.
- `PLAN_NOT_EXECUTABLE`: create a fresh V2 Plan; do not translate V1 by guessing.

## Return to the established workflow

If `specKind` is `report`, read `report.md` and continue at profile plus strict Spec validation. If `specKind` is `deck`, read `deck.md` and continue at strict Deck validation. Preserve the same Context used by the Plan.

Do not render until the corresponding validation succeeds. Do not claim that density, tone, locale, brand, quality gates, or output formats were applied when they appear in `deferredConstraints`.
