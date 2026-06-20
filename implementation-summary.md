# Displacement Governance Mapping Revision

Build ID: `20260620-ccea2719d0d7`

Generated from: `displacement-governance-json-review.xlsx`

## Outputs

- `mapping.html`
- `assets/data/displacement-governance-database.json`
- `assets/data/mapping.json`
- root-level copies of both JSON files for emergency fallback/path testing

## Counts

- Countries in database: 8
- Governance dimensions: 7
- Country-dimension cells: 56
- Illustrative cases: 14
- Overview countries in `mapping.json`: 8

## Revised database country profiles

thailand, malaysia, philippines, myanmar, cambodia

## Revised database country-dimension cells

- thailand / mobility
- thailand / public_systems
- thailand / institutional
- thailand / fiscal
- thailand / data
- malaysia / mobility
- malaysia / institutional
- malaysia / data
- philippines / disaster_idp
- myanmar / disaster_idp
- myanmar / fiscal
- vietnam / mobility
- vietnam / data
- cambodia / data

## Revised mapping overview countries

cambodia, malaysia, myanmar, philippines, thailand, vietnam

## Deployment

Deploy the files using this structure:

```text
mapping.html
assets/data/displacement-governance-database.json
assets/data/mapping.json
```

Direct test after deployment:

```text
https://www.displacementpolicy.org/assets/data/displacement-governance-database.json
```

Search inside it for:

```text
20260620-ccea2719d0d7
thailand_id_cards_2026
malaysia_dpp_2026
myanmar_earthquake_2025
```

The revised `mapping.html` includes the same database as an embedded fallback. It will use the external JSON only if it exists and has a matching `meta.build_id`, reducing the risk that a stale deployed JSON overrides the embedded revision.
