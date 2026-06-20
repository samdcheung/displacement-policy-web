# Displacement Governance Mapping — consolidated interface update

Build: 20260620 consolidated sources-visible interface

This package updates the mapping page structure without changing the current dataset.

## What changed

- Replaced the separate tab structure with one consolidated mapping explorer.
- The explorer now has three entry points: select by country, select by governance layer, or select by fault line.
- Illustrative cases now appear contextually inside the selected view rather than as a separate selector.
- Confidence labels have been removed from rendered cards.
- Expandable source sections remain visible in country, layer, fault-line, and case views.
- The overall dashboard has been simplified into a systematic summary of the mapping contents: profiles, layers, fault lines, and cases.
- Country profiles now use a smaller, full-width country summary and emphasize governance-layer analysis rather than a large standalone descriptive heading.
- The page keeps the embedded fallback database and still attempts to load the external JSON first when the build ID matches.

## Dataset counts

- Countries: 8
- Governance dimensions: 7
- Country-dimension cells: 56
- Illustrative cases: 14
- Build ID: 20260620-ccea2719d0d7

## Deployment structure

Upload or replace these files:

```
mapping.html
assets/data/displacement-governance-database.json
assets/data/mapping.json
displacement-governance-database.json
mapping.json
```

The root-level JSON copies are included for fallback compatibility.
