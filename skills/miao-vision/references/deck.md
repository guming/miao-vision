# Browser Deck Workflow

Use this workflow for an HTML or PDF deck from local structured data. Do not offer native PowerPoint, 4:3 output, speaker-note export, or a live data connection.

## Create

1. Analyze the data:

```bash
miao-viz data analyze /path/to/data.csv \
  --intent "user request and audience" \
  --output /tmp/miao-vision/context.json
```

2. Instantiate the closest deterministic DeckSpec:

```bash
miao-viz deck instantiate executive-brief \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/deck.yaml
```

Use `business-review` for a longer periodic review. Preserve generated evidence metadata and omit blocked slides.

3. Review the narrative:

| Intent | Length | Default sequence |
|---|---:|---|
| `executive-brief` | 5–7 slides | claim, KPI, change/ranking, risk, next step |
| `business-review` | 6–10 slides | summary, KPI, trend, ranking, composition, caveat/appendix |

Use at most one claim, four metrics, and one chart per main slide. Put detailed tables in an appendix or report. Add a trend slide only with at least three time periods; use a delta for two periods.

4. Validate with the same context:

```bash
miao-viz deck validate \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --verify \
  --strict
```

Repair the first issue path and rerun validation. Never remove grounding metadata to silence a warning.

5. Render:

```bash
miao-viz render deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --strict \
  --theme <theme> \
  --output /tmp/miao-vision/deck.html
```

Default to `magazine` when the user has no theme preference. Supported themes are `standard-white`, `magazine`, `standard-dark`, `minimal`, `nyt`, `bloomberg`, and `tableau`.

## Grounding

Use factual claims only when they declare `claimType`, `evidence`, `derivedFrom`, and `check`. Descriptive, ranking, delta, trend, share, comparative, and evaluative claims need structured grounding. Evaluative claims also require a benchmark, target, baseline, or historical comparison.

Block causal and predictive claims. An `analytical-next-step` may propose more analysis; an `operational-recommendation` requires evidence, derived paths, and a caveat. Do not generate strategic decisions, budget commitments, staffing actions, or deterministic forecasts from descriptive data.

Required slide roles:

| Role | Requirement |
|---|---|
| `cover-claim` | One verified claim, or a question when no claim is reliable |
| `kpi-snapshot` | Up to four grounded metrics |
| `trend-overview-slide` | Time plus measure over at least three periods |
| `ranking-slide` | Dimension, measure, and ordered-row evidence |
| `data-quality-slide` | Relevant `sampleWarnings` caveats |

## PDF And Repair

For PDF, use the same validated spec with `--format pdf` and a `.pdf` output. Deck PDF is fixed at 16:9 and each slide must produce one page. Playwright Chromium is required; surface `PDF_*` errors and layout diagnostics.

Repair structured errors as follows:

- Evidence id/path errors: use an existing `context.evidence` id and valid `$evidence:` path.
- Ungrounded numeric claim: add `claimType`, `evidence`, `derivedFrom`, and `check`.
- Trend-period error: rewrite as delta or remove the trend slide.
- Evaluative claim without benchmark: add a real benchmark or use descriptive language.
- Missing caveat: reference applicable `sampleWarnings[].code`.
- Overloaded slide: split it or reduce metrics/charts.

Return only after strict validation succeeds and the requested artifact is rendered.
