# Outcome Brief Shadow Planning

Use this reference only when the user explicitly asks to inspect or evaluate artifact planning. Do not insert it into the Report, Deck, or Article generation workflows.

## Boundary

- Accept a Draft Outcome Brief plus a full or compact Analyze Context.
- Support only `tabular` source planning to Report or Presentation in V1.
- Return a deterministic plan; do not generate or edit a Spec.
- Do not render, call an LLM, persist a project, or make an artifact recipient-ready.
- Treat `brief`, Infographic, Article, brand expansion, and public auto-routing as unsupported unless the returned plan explicitly maps `brief` to the Report renderer.

## Command

```bash
miao-viz artifact plan \
  --brief ./brief.json \
  --context ./context.json \
  --compact
```

Use `--output ./plan.json` to write the structured result. `--compact` removes the full resolved Brief and explanatory text, but preserves the decision, status, pattern, gates, reason codes, and hash.

## Draft Brief

The minimum input is:

```json
{
  "schemaVersion": "1",
  "rawRequest": "给老板开会看本月经营情况"
}
```

Optionally provide `audience`, `goal`, `delivery`, `trust`, `presentation`, and `lifecycle`. Explicit fields take priority over project values, source hints, and defaults.

## Status examples

Ready for a requested presentation:

```json
{
  "ok": true,
  "value": {
    "status": "ready_with_assumptions",
    "sourceKind": "tabular",
    "form": "presentation",
    "renderer": "deck",
    "pattern": "executive-brief",
    "clarification": null
  }
}
```

Needs one clarification before choosing a form:

```json
{
  "ok": true,
  "value": {
    "status": "needs_clarification",
    "form": null,
    "renderer": null,
    "pattern": null,
    "clarification": {
      "field": "delivery.form",
      "question": "这份成果主要用于会议讲述，还是由读者自行阅读？",
      "options": ["会议讲述", "自行阅读"],
      "reasonCode": "presentation_or_reading"
    }
  }
}
```

Unsupported public auto-routing:

```json
{
  "ok": true,
  "value": {
    "status": "unsupported",
    "form": null,
    "renderer": null,
    "pattern": null,
    "selectionReasons": [
      { "code": "public_requires_infographic_adapter" }
    ],
    "clarification": null
  }
}
```

These examples are abbreviated for readability. Consume the actual CLI response rather than reconstructing omitted fields.
