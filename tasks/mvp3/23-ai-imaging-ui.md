# AI Imaging and Oral Health Score UI

> **Status:** 🔲 Queued
> **Priority:** P2

## What & Why

Expose the gated imaging-analysis records and oral-health score snapshots to dentists through clinical workflows.

## Done looks like

- Eligible radiographs show an analysis action only to authorized dentists with `ai.imaging` entitlement.
- Findings are labeled advisory and require explicit dentist confirmation.
- Annotation overlay is added only after provider evaluation and clinical validation.
- Patient profile shows score, timestamp, contributing categories, and trend explanation without overstating clinical certainty.
- Provider/model metadata is safe; no pixels, prompts, or clinical text enter logs.
- Loading, unsupported, provider-failure, confirmation, responsive, and test states.

## Dependencies

- Provider evaluation and validation gates in `mvp3/12-ai-imaging.md`.
