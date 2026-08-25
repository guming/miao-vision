# Client Outcome Reports PRD

> Date: 2026-08-25
> Status: Proposal
> Product scope: `packages/miao-viz-cli` and `skills/miao-vision`
> Working name: Client Outcome Report

## 1. Summary

Miao Vision can already turn local CSV, TSV, XLSX, and JSON files into evidence-backed reports. It can save a verified report project, replay its evidence recipes against a later dataset, compare the new evidence with a baseline, and export HTML or PDF.

The current recurring workflow records changes, but it does not decide which changes matter to a client. It also lacks business goals, materiality rules, a client-facing narrative, a publication review step, and reusable brand settings.

This project will extend recurring reports into client outcome reports. A user configures the reporting rules once, supplies a new local data file for each period, reviews the detected outcomes, and exports a branded report that can be sent to a client.

The first release will focus on material change detection and review. Brand profiles and audience-specific editions will follow only after the core workflow proves useful.

## 2. Product Position

The product is for service teams that must explain results to clients on a repeated schedule. Initial users include marketing agencies, consultants, ecommerce operators, and fractional business teams that receive or export structured data every week or month.

They need to answer five questions with reliable numbers:

- What changed during this period?
- Which changes were large enough to discuss?
- Did the result move toward or away from an agreed goal?
- What evidence supports the conclusion?
- What should the client or delivery team do next?

Miao Vision will remain local-first and artifact-first. The CLI will own analysis, validation, comparison, and rendering. The web app will remain a distribution and preview surface.

## 3. Problem

Teams that produce recurring client reports often repeat the same manual work:

- Export data from a business system.
- Copy values into last month's document.
- Update charts and date ranges.
- Find the changes worth mentioning.
- Rewrite conclusions that may still contain old numbers.
- Check that claims match the source data.
- Apply the client's logo and colors.
- Export a PDF and inspect it for layout errors.

This workflow creates three risks. A copied report can retain an old value, date, or conclusion. An AI-generated report can describe a change that the data does not support. A technically correct report can still fail as a client deliverable because it gives every metric equal weight and does not connect results to goals.

The existing recurring report workflow solves replay and lineage, but the generated period changes are still diagnostic data. A client needs a short account of outcomes, risks, and next actions.

## 4. Goals

### 4.1 Product goals

- Reduce the time required to prepare a new client report to ten minutes or less after the new data file is available.
- Keep every numeric claim, ranking, comparison, and performance label traceable to evidence.
- Distinguish a factual change from a business judgment.
- Require explicit rules before describing an increase as an improvement or a decrease as a deterioration.
- Stop publication when the data contract, evidence lineage, or report claims are invalid.
- Produce self-contained HTML and reproducible PDF artifacts.
- Preserve local operation with no backend, account, upload, or required API key.

### 4.2 User goals

- Configure metrics, goals, and reporting preferences once.
- Replace the input file for a new period without redesigning the report.
- Review only the changes that require attention.
- See why each outcome was included.
- Send the final artifact to a client without copying it into another tool.

## 5. Non-goals

This project will not add:

- A general dashboard builder.
- Remote database or SaaS connectors.
- Cloud scheduling or automatic email delivery.
- Login, permissions, or multi-user editing.
- An unrestricted CSS editor.
- Automatic causal analysis.
- Free-form metric invention by an AI agent.
- A universal industry metric library.
- A second report generation implementation in the web app.

## 6. Target User and Initial Use Case

The first target user is a small marketing or ecommerce service team that sends a monthly performance report to each client.

The team usually has a stable set of client metrics, a spreadsheet export for each period, a previous report, agreed targets or preferred metric directions, and a need to deliver branded HTML or PDF.

The initial product does not need to fetch advertising or analytics data. The user or an agent can export or normalize the source data before running Miao Vision.

## 7. User Experience

### 7.1 First period

The user prepares a verified report through the existing evidence-first workflow, then initializes a recurring project with a report profile.

```bash
miao-viz report init ./acme-monthly \
  --input ./2026-07.xlsx \
  --spec ./report.yaml \
  --context ./context.json \
  --profile ./report-profile.yaml \
  --period 2026-07 \
  --format html,pdf
```

The CLI validates the dataset, evidence plan, report spec, metric rules, and profile. The first run has no baseline, so it must not use period-over-period language.

### 7.2 Later period

```bash
miao-viz report update ./acme-monthly \
  --input ./2026-08.xlsx \
  --period 2026-08 \
  --edition client \
  --format html,pdf
```

The CLI will:

1. Validate the new dataset against the saved data contract.
2. Replay the saved evidence recipes.
3. Compare the current evidence with the latest successful baseline.
4. Apply goals, preferred directions, and materiality rules.
5. Build an evidence-backed outcome brief.
6. Determine whether the run is ready, needs review, or is blocked.
7. Render HTML and PDF artifacts from the same outcome brief.

### 7.3 Review

The user should review a short list instead of reading every raw change:

- Material positive, negative, and neutral outcomes.
- Goal status.
- New and resolved anomalies.
- Ranking entries that appeared, disappeared, or moved materially.
- Evidence that cannot be compared with the baseline.
- Suggested actions and the evidence behind them.

Raw evidence and change files remain available for diagnostics, but they are not the primary client experience.

## 8. Report Profile

Each recurring project may contain a YAML or JSON report profile. The CLI will store its normalized copy as `report-profile.json`.

```yaml
schemaVersion: 1

client:
  name: Acme
  reportTitle: Monthly Performance Report
  confidentiality: Client internal use

presentation:
  locale: en-US
  logo: ./assets/logo.png
  primaryColor: "#1648D8"
  accentColor: "#F0A202"
  footer: Prepared by Example Agency

audience:
  primary: client
  tone: executive

metrics:
  - evidenceId: totals
    metric: revenue
    label: Revenue
    desiredDirection: increase
    materiality:
      percent: 0.10
    target: 100000

  - evidenceId: quality
    metric: refund_rate
    label: Refund rate
    desiredDirection: decrease
    materiality:
      absolute: 0.01
```

### 8.1 Metric rules

Each configured metric may define:

- `evidenceId`: The saved evidence item that contains the metric.
- `metric`: The numeric field within the evidence values.
- `label`: The client-facing name.
- `desiredDirection`: `increase`, `decrease`, or `neutral`.
- `materiality.absolute`: The minimum absolute change worth reporting.
- `materiality.percent`: The minimum proportional change worth reporting.
- `target`: An optional numeric target for the current period.

The CLI must reject a profile that references an unknown evidence ID or a non-numeric metric.

If `desiredDirection` is absent or `neutral`, the report may say that a value increased or decreased. It must not call that change an improvement, deterioration, success, or failure.

If `target` is absent, the report must not claim that the metric met or missed a target.

### 8.2 Brand rules

The first brand profile will support client name, report title, a local logo file, primary and accent colors, footer text, locale, and a confidentiality label.

The profile will not accept arbitrary CSS, remote assets, or online font URLs. A missing logo will produce a warning and a valid unbranded artifact. An invalid color or unreadable profile will produce a structured validation error.

## 9. Outcome Brief

Every recurring run will produce `outcome-brief.json`. This file is the single interpreted fact layer used by HTML, PDF, delivery summaries, and later audience editions.

The outcome brief must contain:

- The current period and baseline run ID.
- Material positive, negative, and neutral outcomes.
- Goal results.
- Ranking changes.
- New and resolved anomalies.
- Data quality and comparability warnings.
- Suggested actions with supporting evidence references.
- A compact evidence reference for every reported statement.

Each outcome will have a stable ID and typed classification. A numeric outcome will record the previous value, current value, absolute change, proportional change when defined, materiality rule, and evidence ID.

The same project configuration, current evidence, and baseline evidence must produce the same outcome classifications and ordering.

## 10. Material Change Rules

A metric change is material when it meets at least one configured threshold.

- An absolute threshold compares the magnitude of the absolute change.
- A percentage threshold compares the magnitude of the proportional change.
- If both thresholds are present, meeting either threshold is sufficient.
- A change from a zero baseline has no valid percentage change. The system must use the absolute threshold or classify the percentage comparison as unavailable.
- A metric with no threshold is comparable but not eligible for the material outcome summary.

The system will use `desiredDirection` only after classifying the change as material.

- `increase`: A positive change is favorable and a negative change is adverse.
- `decrease`: A negative change is favorable and a positive change is adverse.
- `neutral`: The result is a neutral change.

Performance labels are business judgments. They must come from explicit profile configuration, never from field names or agent inference.

## 11. Ranking and Anomaly Rules

Rank comparison must distinguish an item that moved within both periods, entered the current ranking, left the current ranking, or cannot be compared because its recipe or label field changed.

The system must not report an entered or departed item as a numeric rank movement.

Anomaly comparison will continue to track new and resolved anomalies. A new anomaly will require review. A resolved anomaly may appear as a positive outcome only when the profile explicitly allows that interpretation.

## 12. Review and Publication States

The run manifest already supports `ready`, `needs_review`, and `failed`. This project will apply those states consistently and expose a publication state in `review.json`.

### 12.1 Ready

A run is ready when the data contract passes, every required evidence recipe succeeds, saved lineage hashes match, all client-facing claims pass verification, and no configured review trigger is active.

### 12.2 Needs review

A run needs review when it contains at least one of the following:

- A new anomaly.
- A material adverse outcome.
- An item entering or leaving a tracked ranking.
- A comparison with a zero baseline and no usable absolute threshold.
- Evidence that cannot be compared with the baseline.
- A suggested action without sufficient evidence references.
- A missing optional brand asset.

The run may still produce artifacts. The delivery response must show the review status and warnings.

### 12.3 Blocked or failed

A run must not be published when:

- The input violates the data contract.
- A required evidence recipe fails.
- The saved spec or evidence plan changed without a new project version.
- A client-facing claim cannot be verified.
- A required profile metric no longer exists.
- The input is empty.

The CLI will continue to return structured errors with repair information where a deterministic repair is available.

## 13. Client Report Structure

The client edition will use this order:

1. Cover and reporting period.
2. Executive outcome summary.
3. Up to three material positive outcomes.
4. Goal progress and material adverse outcomes.
5. Main category, channel, region, or project contributors.
6. Risks, anomalies, and data limitations.
7. Suggested next actions.
8. Evidence and methodology details in a collapsed HTML section or a PDF appendix.

The report must remain useful when there are no material changes. In that case, it will state that no configured material threshold was crossed and still show the current core metrics.

## 14. Audience Editions

Audience editions are a later extension. All editions will consume the same `outcome-brief.json`.

- The client edition emphasizes outcomes, goals, risks, and next actions.
- The operator edition emphasizes anomalies, data quality, replay issues, and delivery tasks.
- The manager edition emphasizes account risk, adverse outcomes, unresolved review items, and decisions that require escalation.

An edition may change ordering and presentation. It must not recalculate evidence or change the meaning of an outcome.

## 15. Generated Project Structure

```text
acme-monthly/
├── project.json
├── data-contract.json
├── evidence-plan.json
├── report-profile.json
├── report.yaml
├── preferences.json
├── assets/
│   └── logo.png
├── runs/
│   └── 2026-08/
│       ├── manifest.json
│       ├── context.json
│       ├── evidence.json
│       ├── changes.json
│       ├── outcome-brief.json
│       ├── review.json
│       ├── report.html
│       ├── report.pdf
│       └── report.preview.png
└── latest.json
```

Source data will not be copied unless the user explicitly enables the existing copy option.

## 16. CLI Response

A successful update will preserve the existing structured result style.

```json
{
  "ok": true,
  "value": {
    "project": "/path/to/acme-monthly",
    "runId": "2026-08",
    "status": "needs_review",
    "review": {
      "materialChanges": 4,
      "warnings": 1,
      "blockingIssues": 0
    },
    "artifacts": {
      "html": "/path/to/report.html",
      "pdf": "/path/to/report.pdf",
      "outcomeBrief": "/path/to/outcome-brief.json",
      "review": "/path/to/review.json"
    },
    "delivery": {}
  }
}
```

The delivery summary should include no more than three verified outcomes, up to two warnings, and up to three suggested actions. It must not expose internal context, evidence, or profile data unless the user requests diagnostics.

## 17. Implementation Plan

### 17.1 Phase 1: Material outcome brief

Phase 1 is the minimum useful release and does not depend on later phases.

It will:

- Add a versioned report profile schema for metric direction, targets, and materiality.
- Normalize and save the profile during `report init`.
- Extend evidence comparison for entered and departed ranking items.
- Generate deterministic `outcome-brief.json` and `review.json` files.
- Use `needs_review` when review triggers are active.
- Replace the raw period change JSON at the bottom of the report with a readable outcome section.
- Include review status and material outcome counts in the delivery response.
- Update the source Miao Vision skill with the new workflow.

Likely source changes:

- `packages/miao-viz-cli/src/report-project-types.ts`
- `packages/miao-viz-cli/src/report-project-storage.ts`
- `packages/miao-viz-cli/src/report-changes.ts`
- `packages/miao-viz-cli/src/cli-report.ts`
- New `report-profile.ts`
- New `report-outcome-schema.ts`
- New `report-outcome-brief.ts`
- New `report-review.ts`
- Focused schema, comparison, and workflow tests
- `skills/miao-vision/references/report.md`

This phase will touch more than eight files. It will not add a service or an external runtime dependency.

### 17.2 Phase 2: Brand delivery

Phase 2 is independently useful after Phase 1. It will add brand settings, copy approved local assets into the project, render the same profile in HTML and PDF, add a client cover, validate asset paths and colors, and add visual regression checks.

### 17.3 Phase 3: Audience editions

Phase 3 will proceed only when user research confirms demand. It will add `--edition client|operator|manager`, render each edition from the same outcome brief, record artifact hashes, and prevent templates from changing evidence or outcome classifications.

## 18. Validation and Testing

### 18.1 Happy paths

- Initialize a project with a valid profile and first-period dataset.
- Confirm that the first run has no baseline comparison language.
- Update with a compatible second-period dataset.
- Confirm that configured material changes appear in the outcome brief.
- Confirm that sub-threshold changes do not appear as material outcomes.
- Export matching HTML and PDF artifacts.
- Trace every displayed value and claim to an evidence reference.

### 18.2 Error paths

- Reject an unknown evidence ID or non-numeric metric in the profile.
- Stop an update when a required input field is missing.
- Stop an update when an evidence recipe or report spec changes silently.
- Mark a run for review when a required comparison is unavailable.
- Render without a missing optional logo and return a warning.
- Mark PDF export failure without reporting the full delivery as successful.

### 18.3 Edge cases

- A zero or negative baseline.
- A metric without a preferred direction or target.
- No material changes in the current period.
- An item entering or leaving a ranked result.
- Duplicate period IDs.
- A current dataset ten times larger than the initialization dataset.

### 18.4 Verification commands

```bash
npm run test:run
npm run build:cli
npm run check:size
```

The workflow smoke test must cover:

```text
data analyze
  -> spec block instantiate or explicit spec authoring
  -> spec validate --context --verify
  -> report init
  -> report update
  -> outcome brief and review validation
  -> HTML and PDF render
```

## 19. Success Metrics

Pilot users should meet most of these criteria:

- A later-period report takes ten minutes or less to prepare after the source file is available.
- The user does not correct any displayed number.
- The user rewrites fewer than 20 percent of generated outcome statements.
- The user is willing to send the generated PDF to a client.
- The same project is updated again in the next reporting period.
- At least half of pilot users configure materiality rules without implementation support.

Commercial validation should measure willingness to pay per client project, not per chart or AI prompt.

## 20. Risks and Mitigations

### 20.1 Users cannot define business meaning

Some users may know which metrics matter but may not be able to define a target, threshold, or favorable direction. The product will allow neutral comparison rules and provide a small set of explicit examples. The CLI must not infer business meaning from field names.

### 20.2 Reports become repetitive

A fixed structure can produce nearly identical reports when little changes. The report will rank content by configured materiality and show a concise no-material-change state instead of repeating every chart in the executive summary.

### 20.3 Users expect automated data connections

Client reporting often begins with exports from advertising, analytics, or commerce platforms. Fetching and normalization will remain in the agent or user script layer. Native connectors should be reconsidered only when repeated user evidence shows that file export prevents continued use.

### 20.4 A recommendation is mistaken for a fact

The report will type recommendations separately, label them in the artifact, and require supporting evidence references. It will never describe a recommendation as a verified outcome.

### 20.5 Brand customization creates layout failures

The CLI will accept a narrow brand schema, validate contrast and asset dimensions, and use fixed layout constraints. It will not accept arbitrary CSS.

## 21. Rollback and Compatibility

- Existing report projects without a profile will continue to use the current recurring behavior.
- Phase 1 will introduce a versioned profile without changing existing evidence IDs or query recipes.
- New run artifacts are additive. Older readers may ignore `outcome-brief.json` and `review.json`.
- A profile change that affects metric meaning will require an explicit project version change.
- Removing the outcome layer will not modify or delete source data, evidence files, report specs, or prior run artifacts.

## 22. Launch Gate

The first release is ready for pilot use when:

- All Phase 1 happy, error, and edge paths pass.
- Existing recurring report tests remain compatible.
- Reports with material changes, no material changes, and review warnings have been visually inspected.
- HTML and PDF show the same outcome values and review status.
- The skill documentation tells an agent when to request profile information and when to avoid performance judgments.
- At least three real two-period datasets produce useful outcome briefs without manual changes to computed values.

The product is not ready for paid release until installation, updates, trial or licensing boundaries, privacy language, support expectations, and refund triggers are defined. Pilot validation should come before connector work, audience editions, or a template marketplace.
