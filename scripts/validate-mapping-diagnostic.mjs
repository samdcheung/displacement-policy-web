import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataDir = resolve(root, "data", "mapping");
const recordsPath = resolve(dataDir, "mapping-records.json");
const referencesPath = resolve(dataDir, "mapping-references.json");
const profilesPath = resolve(dataDir, "mapping-country-profiles.json");
const validationPath = resolve(dataDir, "mapping-validation.json");

const errors = [];
const warnings = [];
const requiredRecordFields = [
  "id",
  "slug",
  "title",
  "countryRegion",
  "publicSystem",
  "displacementContext",
  "instrumentResponseType",
  "description",
  "whyItMatters"
];

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const isBlank = (value) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
const slugOk = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || "");

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function checkUnique(items, field, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item?.[field];
    if (isBlank(value)) {
      fail(`${label}: missing ${field}.`);
      continue;
    }
    if (seen.has(value)) fail(`${label}: duplicate ${field} "${value}".`);
    seen.add(value);
  }
  return seen;
}

const recordsData = await readJson(recordsPath);
const referencesData = await readJson(referencesPath);
const profilesData = await readJson(profilesPath);
let expected = null;
try {
  expected = await readJson(validationPath);
} catch {
  warn("mapping-validation.json is missing; using embedded expected counts.");
}

const records = asArray(recordsData.records);
const references = asArray(referencesData.references);
const countries = asArray(profilesData.countries);
const expectedCounts = {
  mappingRecordCount: expected?.counts?.mappingRecordCount ?? 23,
  referenceCount: expected?.counts?.referenceCount ?? 143,
  countryProfileCount: expected?.counts?.countryProfileCount ?? 10
};

if (records.length !== expectedCounts.mappingRecordCount) fail(`Expected ${expectedCounts.mappingRecordCount} mapping records, found ${records.length}.`);
if (references.length !== expectedCounts.referenceCount) fail(`Expected ${expectedCounts.referenceCount} references, found ${references.length}.`);
if (countries.length !== expectedCounts.countryProfileCount) fail(`Expected ${expectedCounts.countryProfileCount} country profiles, found ${countries.length}.`);

const recordIds = checkUnique(records, "id", "Mapping records");
const recordSlugs = checkUnique(records, "slug", "Mapping records");
const referenceIds = checkUnique(references, "id", "References");
const referenceSlugs = checkUnique(references, "slug", "References");

for (const record of records) {
  const label = record?.id || record?.slug || "(unknown record)";
  for (const field of requiredRecordFields) {
    if (isBlank(record?.[field])) fail(`${label}: missing required field "${field}".`);
  }
  if (record?.slug && !slugOk(record.slug)) fail(`${label}: malformed slug "${record.slug}".`);
  for (const referenceId of asArray(record?.referenceIds)) {
    if (!referenceIds.has(referenceId)) fail(`${label}: unresolved referenceId "${referenceId}".`);
  }
}

for (const reference of references) {
  const label = reference?.id || reference?.slug || "(unknown reference)";
  if (isBlank(reference?.referenceTitle)) fail(`${label}: missing referenceTitle.`);
  if (reference?.slug && !slugOk(reference.slug)) fail(`${label}: malformed slug "${reference.slug}".`);
  for (const recordId of asArray(reference?.relatedMappingRecordIds)) {
    if (!recordIds.has(recordId)) fail(`${label}: unresolved relatedMappingRecordId "${recordId}".`);
  }
  if (!isBlank(reference?.url)) {
    try {
      new URL(reference.url);
    } catch {
      fail(`${label}: malformed url "${reference.url}".`);
    }
  }
}

for (const profile of countries) {
  const label = profile?.country || "(unknown country profile)";
  if (isBlank(profile?.country)) fail("Country profile missing country.");
  if (isBlank(profile?.overview)) fail(`${label}: missing authored overview.`);
  for (const recordId of asArray(profile?.relatedMappingRecordIds)) {
    if (!recordIds.has(recordId)) fail(`${label}: unresolved relatedMappingRecordId "${recordId}".`);
  }
  for (const referenceId of asArray(profile?.keyReferenceIds)) {
    if (!referenceIds.has(referenceId)) fail(`${label}: unresolved keyReferenceId "${referenceId}".`);
  }
}

for (const slug of recordSlugs) {
  if (referenceSlugs.has(slug)) fail(`Route collision: record and reference share slug "${slug}".`);
}

const publicDiagnosticPath = resolve(dataDir, "mapping-diagnostic.json");
try {
  await access(publicDiagnosticPath);
  warn("Superseded mapping-diagnostic.json still exists in data/mapping; archive/remove it after the simple build passes.");
} catch {
  // Expected once migration cleanup is complete.
}

if (warnings.length) {
  console.warn("Mapping validation warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Mapping validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Mapping validation passed: ${records.length} records, ${countries.length} country profiles, ${references.length} references.`);
