// ═══ COST_INDEX — quarterly construction-cost inflation multiplier ═══
//
// Anchors hard-coded $/SF baselines in index.html to the BLS Producer
// Price Index for Residential Construction (series PCU236116). When this
// file's `current` value is bumped, every cost estimate in the app
// re-baselines to today's construction cost climate. ENR CCI is paywalled;
// BLS PPI is the free public-data analog and tracks the same labor +
// materials inputs.
//
// Baseline anchor: 2024-Q1 (when the original $380/$220 numbers were set).
// Source for `current`: https://data.bls.gov/timeseries/PCU2361162361162
//
// Update procedure (manual until the auto-refresh workflow lands):
//   1. Visit the data.bls.gov URL above.
//   2. Note the most recent monthly value (e.g., 145.6).
//   3. Note the 2024-Q1 baseline value (e.g., 137.4).
//   4. Set `current = round(latest / baseline, 3)` and `asOf` to the
//      data month. Commit.
//
// A planned follow-up is a GitHub Actions workflow that does this fetch
// + commit on a quarterly cron (parallel to .github/workflows/fetch-
// schemas.yml). Tracked in STATUS.md.
//
// Conservative default: when this file fails to load (offline / standalone
// HTML use), index.html falls back to `1.06` inline so cost estimates are
// still inflation-aware.

window.COST_INDEX = {
  baseline: '2024-Q1',
  baselineSeries: 'BLS PCU236116 (Producer Price Index — Residential Construction)',
  current: 1.06,
  asOf: '2026-04',
  source: 'https://data.bls.gov/timeseries/PCU2361162361162',
  notes: 'Multiplier applied to costPerSF and valuePerUnit. Update quarterly. Real ENR CCI subscription would be more accurate but is paywalled; BLS PPI tracks the same underlying labor + materials inputs and is free.',
};
