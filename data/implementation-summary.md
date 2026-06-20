# Displacement Governance Mapping JSON Update

Generated from: `displacement-governance-json-review.xlsx`  
Compared against: `displacement-governance-json-review old.xlsx`

## Files generated

- `mapping.json`
- `displacement-governance-database.json`

These should replace the corresponding files in the site's JSON/data assets directory.

## Validation

- `mapping.json`: valid JSON, 8 countries.
- `displacement-governance-database.json`: valid JSON, 7 dimensions, 8 countries, 14 case examples.
- Every database country has 7 dimension cells.

## Change summary

### displacement-governance-database.json
- 38 existing fields updated.
- 43 new fields added.
- 3 new case examples added:
  - `thailand_id_cards_2026`
  - `malaysia_dpp_2026`
  - `myanmar_earthquake_2025`

Updated country areas:
- Thailand: 13 changed fields.
- Malaysia: 9 changed fields.
- Myanmar: 6 changed fields.
- Vietnam: 4 changed fields.
- Philippines: 3 changed fields.
- Cambodia: 3 changed fields.

### mapping.json
- 18 public-facing country summary/comparison fields updated.
- Countries updated: Cambodia, Malaysia, Myanmar, Philippines, Thailand, Vietnam.

## Implementation note

The sync applied non-empty `revise_*` / `revised_value` cells and preserved current values elsewhere. Review columns and reviewer notes were not exported to JSON. Source fields were included where present in the updated workbook.
