#!/usr/bin/env python3
"""Export public mapping JSON from the editorial workbook."""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = ROOT.parent / "Displacement Policy Platform" / "Mapping Project" / "country-displacement-governance-editorial-source.xlsx"
OUTPUT_DIR = ROOT / "data" / "mapping"
VALIDATION_PATH = OUTPUT_DIR / "mapping-validation.json"
NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "office_rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

SHEET_SPECS = {
    "Mapping Records": {
        "container": "records",
        "output": "mapping-records.json",
        "meta": {
            "title": "Country Displacement Governance Diagnostics",
            "version": "editorial-workbook",
            "description": "A concise mapping of country and comparative governance arrangements, programmes, laws, financing mechanisms and implementation cases.",
        },
        "fields": [
            ("ID", "id", "text"),
            ("Slug", "slug", "text"),
            ("Title", "title", "text"),
            ("Country / Region", "countryRegion", "array"),
            ("Record Status", "recordStatus", "text"),
            ("Public System", "publicSystem", "text"),
            ("Displacement Context", "displacementContext", "array"),
            ("Instrument / Response Type", "instrumentResponseType", "text"),
            ("Description", "description", "text"),
            ("Why It Matters", "whyItMatters", "text"),
            ("Reference IDs", "referenceIds", "array"),
        ],
    },
    "References": {
        "container": "references",
        "output": "mapping-references.json",
        "meta": {
            "title": "References and Instruments",
            "version": "editorial-workbook",
            "description": "Canonical instruments and supporting sources linked to the country displacement governance mapping.",
        },
        "fields": [
            ("ID", "id", "text"),
            ("Slug", "slug", "text"),
            ("Reference Title", "referenceTitle", "text"),
            ("Reference Type", "referenceType", "text"),
            ("Author / Institution", "authorInstitution", "text"),
            ("Year", "year", "integer_or_null"),
            ("Country / Region", "countryRegion", "array"),
            ("URL", "url", "text"),
            ("Citation", "citation", "text"),
            ("Relevance", "relevance", "text"),
            ("Applicability", "applicability", "text"),
            ("Related Mapping Record IDs", "relatedMappingRecordIds", "array"),
            ("Source Status", "sourceStatus", "text"),
        ],
    },
    "Country Profiles": {
        "container": "countries",
        "output": "mapping-country-profiles.json",
        "meta": {"title": "Country Profiles", "version": "editorial-workbook"},
        "fields": [
            ("Country", "country", "text"),
            ("Profile Type", "profileType", "text"),
            ("Overview", "overview", "text"),
            ("Main Displacement Contexts", "mainDisplacementContexts", "array"),
            ("Institutional Architecture", "institutionalArchitecture", "array"),
            ("Main Governance Patterns", "mainGovernancePatterns", "array"),
            ("Reform Opportunities", "reformOpportunities", "array"),
            ("Priority Public Systems", "priorityPublicSystems", "array"),
            ("Key Reference IDs", "keyReferenceIds", "array"),
            ("Related Mapping Record IDs", "relatedMappingRecordIds", "array"),
        ],
    },
}
REQUIRED_MAPPING_FIELDS = ["id", "slug", "title", "countryRegion", "recordStatus", "publicSystem", "displacementContext", "instrumentResponseType", "description", "whyItMatters"]
REQUIRED_REFERENCE_FIELDS = ["id", "slug", "referenceTitle"]
REQUIRED_PROFILE_FIELDS = ["country", "profileType", "overview"]


def xml(zip_file: zipfile.ZipFile, name: str) -> ET.Element:
    return ET.fromstring(zip_file.read(name))


def text_of(node: ET.Element | None) -> str:
    return "" if node is None else "".join(node.itertext())


def read_shared_strings(zip_file: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []
    root = xml(zip_file, "xl/sharedStrings.xml")
    return [text_of(item) for item in root.findall("main:si", NS)]


def read_sheet_paths(zip_file: zipfile.ZipFile) -> dict[str, str]:
    workbook = xml(zip_file, "xl/workbook.xml")
    rels = xml(zip_file, "xl/_rels/workbook.xml.rels")
    rel_by_id = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("rel:Relationship", NS)}
    paths = {}
    for sheet in workbook.findall("main:sheets/main:sheet", NS):
        rel_id = sheet.attrib[f"{{{NS['office_rel']}}}id"]
        target = rel_by_id[rel_id].lstrip("/")
        paths[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"
    return paths


def column_index(cell_ref: str) -> int:
    value = 0
    for letter in re.sub(r"[^A-Z]", "", cell_ref.upper()):
        value = value * 26 + ord(letter) - ord("A") + 1
    return value - 1


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return text_of(cell.find("main:is", NS)).strip()
    raw = text_of(cell.find("main:v", NS)).strip()
    if cell_type == "s" and raw:
        return shared_strings[int(raw)].strip()
    return raw.strip()


def read_sheet(zip_file: zipfile.ZipFile, path: str, shared_strings: list[str]) -> list[list[str]]:
    root = xml(zip_file, path)
    rows = []
    for row in root.findall("main:sheetData/main:row", NS):
        values = []
        for cell in row.findall("main:c", NS):
            index = column_index(cell.attrib.get("r", "A1"))
            while len(values) <= index:
                values.append("")
            values[index] = cell_value(cell, shared_strings)
        rows.append(values)
    return rows


def split_multi(value: str) -> list[str]:
    seen = set()
    items = []
    for item in (part.strip() for part in value.split("|")):
        if item and item not in seen:
            seen.add(item)
            items.append(item)
    return items


def as_integer_or_null(value: str) -> int | None:
    if value == "":
        return None
    try:
        return int(float(value))
    except ValueError as exc:
        raise ValueError(f'expected integer year or blank, got "{value}"') from exc


def convert(value: str, kind: str):
    value = value.strip()
    if kind == "array":
        return split_multi(value)
    if kind == "integer_or_null":
        return as_integer_or_null(value)
    return value


def is_blank(value) -> bool:
    return value is None or value == "" or value == []


def export_sheet(rows: list[list[str]], spec: dict, errors: list[str]) -> list[dict]:
    if not rows:
        errors.append("Sheet is empty.")
        return []
    headers = [str(value).strip() for value in rows[0]]
    header_index = {header: index for index, header in enumerate(headers) if header}
    missing_headers = [source for source, _, _ in spec["fields"] if source not in header_index]
    if missing_headers:
        errors.append(f"Missing required columns: {', '.join(missing_headers)}.")
        return []
    items = []
    for row_number, row in enumerate(rows[1:], start=2):
        if not any(str(value).strip() for value in row):
            continue
        item = {}
        for source, target, kind in spec["fields"]:
            raw = row[header_index[source]] if header_index[source] < len(row) else ""
            try:
                item[target] = convert(str(raw), kind)
            except ValueError as exc:
                errors.append(f"row {row_number}: {source}: {exc}.")
                item[target] = None
        items.append(item)
    return items


def require_fields(items: list[dict], fields: list[str], label: str, errors: list[str]) -> None:
    for item in items:
        item_label = item.get("id") or item.get("slug") or item.get("country") or "(unknown)"
        for field in fields:
            if is_blank(item.get(field)):
                errors.append(f"{label} {item_label}: missing required field {field}.")


def require_unique(items: list[dict], field: str, label: str, errors: list[str]) -> set[str]:
    seen = set()
    for item in items:
        value = item.get(field)
        item_label = item.get("id") or item.get("slug") or item.get("country") or "(unknown)"
        if is_blank(value):
            errors.append(f"{label} {item_label}: missing {field}.")
        elif value in seen:
            errors.append(f'{label}: duplicate {field} "{value}".')
        else:
            seen.add(value)
    return seen


def validate_arrays(items: list[dict], label: str, errors: list[str]) -> None:
    for item in items:
        item_label = item.get("id") or item.get("slug") or item.get("country") or "(unknown)"
        for key, value in item.items():
            if isinstance(value, list):
                if any(not entry for entry in value):
                    errors.append(f"{label} {item_label}: {key} contains a blank value.")
                if len(value) != len(set(value)):
                    errors.append(f"{label} {item_label}: {key} contains duplicate values.")


def validate_links(records: list[dict], references: list[dict], profiles: list[dict], errors: list[str]) -> None:
    record_ids = {item["id"] for item in records if item.get("id")}
    reference_ids = {item["id"] for item in references if item.get("id")}
    for record in records:
        for reference_id in record.get("referenceIds", []):
            if reference_id not in reference_ids:
                errors.append(f'Mapping record {record.get("id")}: broken referenceId "{reference_id}".')
    for reference in references:
        for record_id in reference.get("relatedMappingRecordIds", []):
            if record_id not in record_ids:
                errors.append(f'Reference {reference.get("id")}: broken relatedMappingRecordId "{record_id}".')
    for profile in profiles:
        for reference_id in profile.get("keyReferenceIds", []):
            if reference_id not in reference_ids:
                errors.append(f'Country profile {profile.get("country")}: broken keyReferenceId "{reference_id}".')
        for record_id in profile.get("relatedMappingRecordIds", []):
            if record_id not in record_ids:
                errors.append(f'Country profile {profile.get("country")}: broken relatedMappingRecordId "{record_id}".')


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    args = parser.parse_args()
    workbook_path = args.workbook.resolve()
    errors = []
    if not workbook_path.exists():
        print(f"Workbook not found: {workbook_path}", file=sys.stderr)
        return 1
    with zipfile.ZipFile(workbook_path) as workbook:
        shared_strings = read_shared_strings(workbook)
        sheet_paths = read_sheet_paths(workbook)
        missing_sheets = [name for name in SHEET_SPECS if name not in sheet_paths]
        if missing_sheets:
            print(f"Missing required sheets: {', '.join(missing_sheets)}", file=sys.stderr)
            return 1
        exported = {}
        for sheet_name, spec in SHEET_SPECS.items():
            sheet_errors = []
            rows = read_sheet(workbook, sheet_paths[sheet_name], shared_strings)
            exported[sheet_name] = export_sheet(rows, spec, sheet_errors)
            errors.extend(f"{sheet_name}: {error}" for error in sheet_errors)
    records = exported["Mapping Records"]
    references = exported["References"]
    profiles = exported["Country Profiles"]
    require_fields(records, REQUIRED_MAPPING_FIELDS, "Mapping record", errors)
    require_fields(references, REQUIRED_REFERENCE_FIELDS, "Reference", errors)
    require_fields(profiles, REQUIRED_PROFILE_FIELDS, "Country profile", errors)
    require_unique(records, "id", "Mapping records", errors)
    require_unique(records, "slug", "Mapping records", errors)
    require_unique(references, "id", "References", errors)
    require_unique(references, "slug", "References", errors)
    validate_arrays(records, "Mapping record", errors)
    validate_arrays(references, "Reference", errors)
    validate_arrays(profiles, "Country profile", errors)
    validate_links(records, references, profiles, errors)
    report = {
        "status": "failed" if errors else "passed",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceWorkbook": str(workbook_path),
        "counts": {
            "mappingRecordCount": len(records),
            "referenceCount": len(references),
            "countryProfileCount": len(profiles),
        },
        "errors": errors,
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(VALIDATION_PATH, report)
    if errors:
        print("Mapping export failed validation:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        print(f"Validation report written to {VALIDATION_PATH}", file=sys.stderr)
        return 1
    for sheet_name, spec in SHEET_SPECS.items():
        items = exported[sheet_name]
        meta = dict(spec["meta"])
        count_key = "recordCount" if spec["container"] == "records" else "referenceCount" if spec["container"] == "references" else "countryProfileCount"
        meta[count_key] = len(items)
        write_json(OUTPUT_DIR / spec["output"], {"meta": meta, spec["container"]: items})
    print(f"Mapping export passed: {len(records)} records, {len(references)} references, {len(profiles)} country profiles.")
    print(f"Validation report written to {VALIDATION_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
