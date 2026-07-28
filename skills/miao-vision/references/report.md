# Data Report Workflow

Use this workflow for a report, static dashboard, evidence-backed findings artifact, recurring report, or report-spec validation from local CSV, TSV, XLSX, or JSON.

## Contents

- Create
- Evidence and claims
- Chart and spec rules
- Recurring reports
- Edit and final check

## Create

1. Derive the analytical question and at most two analysis types: trend, comparison, distribution, correlation, or KPI. Identify the likely measure, dimension, and time focus without reading unrelated files.

2. Analyze and profile:

```bash
miao-viz data analyze /path/to/data.csv \
  --intent "user intent" \
  --compact \
  --output /tmp/miao-vision/context.json

miao-viz data profile /path/to/data.csv \
  > /tmp/miao-vision/profile.json
```

Read `context.json`; treat the profile only as validation input. Follow `promptRules[]`, surface `sampleWarnings[]`, use only `fields[]`, `metricCandidates[]`, `catalog.charts`, and `catalog.blocks/templates`, and reject anything in `catalog.blockedCharts` or `catalog.blockedBlocks`. Ask at most one question, and only when `clarificationQuestions[]` identifies a blocking ambiguity.

If the primary field assumption is wrong, rerun analyze with `--correct-assumption`. Add `--extra-query` only for a required aggregation missing from the standard evidence. Do not run `spec catalog --for-llm` unless compact context lacks a necessary rule.

3. Prefer a matching template, then a block:

```bash
miao-viz spec template instantiate <id> \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.yaml

# Use only when no template matches:
miao-viz spec block instantiate <id> \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.yaml
```

Review field names, variables, generated insights, evidence ids, and quality checks. Fall back to manual charts only when no suitable template or block exists.

4. Validate:

```bash
miao-viz spec validate \
  --spec /tmp/miao-vision/report.yaml \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --verify \
  --strict
```

Fix every error and warning before rendering. Use `--patch-hints` for machine-fixable issues; apply only returned patches and fill unresolved field names manually.

5. Render:

```bash
miao-viz render report \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --theme <theme> \
  --format html \
  --output /tmp/miao-vision/report.html
```

Default to `magazine` when the user has no preference. Supported themes are `standard-white`, `magazine`, `standard-dark`, `minimal`, `nyt`, `bloomberg`, and `tableau`. Use `--no-interactive` only when explicitly requested.

For PDF, render the same validated report with `--format pdf`. For both formats, use `--format html,pdf --output-dir <dir>`. PDF defaults to A4 portrait and requires Playwright. Surface blocking `PDF_*` errors; do not switch renderers.

## Evidence And Claims

Every numeric, ranking, share, change, threshold, outlier, relationship, and comparison claim must cite an existing evidence id. Use values from `evidence[]` or `metricCandidates[]`; never calculate new prose metrics.

```yaml
insights:
  - text: "East contributed $evidence:by_dimension.rows[0].total."
    evidence: [by_dimension]
    caveat: "Based on limited rows only."
    severity: info
```

Valid paths include `$evidence:total.values.total_sales` and `$evidence:by_dimension.rows[0].region`. Strict validation must resolve every path.

Reflect sample warnings:

- `extreme_small_sample`: mark rankings/comparisons as based on an extremely small sample.
- `small_sample`: qualify distribution and outlier claims.
- `two_period_only`: describe period-over-period change, not a trend.
- `one_period_only`: avoid time-based analysis.

Do not use causal, predictive, significant, or strong-correlation language without corresponding statistical evidence. Do not label performance good or bad without a benchmark, target, or historical comparison.

## Chart And Spec Rules

Use the CLI catalog as the source of truth. Never aggregate ids or use a field with `chartUsage.asMeasure: forbidden`.

| Intent | Preferred chart | Hard condition |
|---|---|---|
| KPI | `bigvalue` | Aggregate, sort, and limit to one row |
| Category comparison or Top N | `bar`, `dot`, or `lollipop` | Nominal dimension; ordered rows |
| Time trend | `line` or `area` | Time field, at least 3 periods, ascending sort |
| Part-to-whole | `pie`/donut | Meaningful whole, at most 7 slices |
| Two measures | `scatter` | No relationship claim without evidence |
| Distribution | `histogram` | Measure field and adequate rows |
| Exact detail | `table` | Explicit aggregate/filter, sort, and limit |
| Two endpoints | `dumbbell` | Exactly 2 comparable endpoints, at most 20 categories |
| Actual versus target | `bullet` | Explicit target |
| Lower/upper interval | `range` | Every lower value ≤ upper value |
| Ranked contribution | `pareto` | Non-negative values sorted descending |
| Different-unit measures | bar-line combo | Ordered dimension and explicit axis units |

Use only fields in the source or created earlier in the same transform chain. Add transforms that produce exactly the intended rows; the renderer does not aggregate, sort, or limit automatically. Keep reports to at most six charts, counting four bigvalues as one, and avoid redundant views.

## Recurring Reports

After the first report passes validation, preview initialization:

```bash
miao-viz report init /path/to/project \
  --input /path/to/period-1.xlsx \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --period 2026-W28 \
  --dry-run
```

Present the contract, frozen evidence ids, hashes, path, and risks. Initialize without `--dry-run` only after acceptance; use `--copy-input` only when requested.

For later periods:

```bash
miao-viz report info /path/to/project
miao-viz report update /path/to/project \
  --input /path/to/period-2.xlsx \
  --period 2026-W29 \
  --format html
```

Replay the saved spec and evidence recipes. Do not redesign, change evidence ids, or guess mappings. Treat data-contract, evidence-plan, validation, and PDF errors as failed runs. Run `report clean` only when the user explicitly requests deletion: show the preview, then obtain confirmation for the exact project and retention count before `--confirm`.

## Edit And Final Check

For an existing report, read the full source spec, make the minimum requested change, then validate and render. Rewrite the spec only for an explicitly requested redesign or when most of its structure must change.

Before returning, confirm strict validation passed, every claim is evidence-grounded, sample caveats are present, all charts are allowed and nonredundant, fields and transforms are valid, and the requested artifact exists.
