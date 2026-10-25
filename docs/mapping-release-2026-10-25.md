# Mapping landing redesign release evidence — 25 October 2026

## Scope and rollback

Generator-integrated landing/explorer redesign based on the supplied deployment package. The public editorial JSON files, IDs, individual detail-page generators and Vercel redirect configuration are unchanged. No AI workbook/draft data, ranking, public archive route or indexing change to existing production pages is introduced.

- Verified GitHub main: `d9676275dd56f5cf341229c57412b480e86a3d76`.
- Pushed backup: `backup/mapping-pre-redesign-2026-10-25` at that SHA.
- Pre-release Vercel production: `dpl_Bd7QEHJ2sGgwsefskKgNV6usHWdY` / `displacement-policy-cm6k247xj-samuel-cheung-s-projects.vercel.app`.
- Production deployment metadata reports that SHA with `gitDirty: 1`; the Git backup alone does not represent all live publication work. Raw production HTML/JSON and inventory were separately saved in the local sibling `.mapping-release-baseline/` directory. Do not upload its authentication cookie file.
- Final preview: https://displacement-policy-og3sd323a-samuel-cheung-s-projects.vercel.app (deployment `dpl_2bLLJjBMjYfNRF6koZNmy3LNjbtK`). Existing Vercel authentication protection remains enabled.
- Draft PR: https://github.com/samdcheung/displacement-policy-web/pull/1.

## 40 versus 33 reconciliation

The archived previous editorial list (`archive/mapping-legacy/mapping-entries.json`, retained in Git before this release) contains 40 entries: 23 arrangements and 17 reference instruments. Commit `be59b29` separated arrangements from references with 23 records; `fe91998` expanded the current arrangements to 33. This is a change of classification and scope, not seven records missing from today's deployment.

On 25 October 2026, the live `/mapping` embedded data and each live `/data/mapping/*.json` exactly matched the repository's parsed canonical collections: 33 arrangements, 218 references, 13 country profiles. All 23 old arrangement routes survive: 22 direct arrangement URLs and the intentional DTKS → DTSEN redirect. The 17 former reference URLs already returned 404 in the pre-release production inventory; the reference library contains their content, and the existing generator emits legacy aliases. This release keeps those generators intact and does not remove any existing successful URL.

The route audit covered the live sitemap plus every generated Mapping path: 276 requests including landing, sitemap and three JSON files; 259 final 200 responses and 17 pre-existing 404 responses. The DTKS request followed its 308 to DTSEN for content comparison; separate browser tests verify the 308 and exact Location header. Every successful individual Mapping page is byte-identical to the captured production response after generation (compare DTKS to its effective redirect destination).

## SEO and data protections

`/mapping/indonesia-dtsen` keeps its entire HTML, substantive content, title `Indonesia DTSEN (National Socio-Economic Single Data) | Displacement Policy`, canonical `https://displacementpolicy.org/mapping/indonesia-dtsen`, and `index, follow`. Both existing DTKS redirect rules are unchanged. All three canonical JSON files remain unchanged (allowing Windows checkout line-ending conversion), including stable record IDs.

Only preview output receives `noindex, nofollow`, preview canonical URLs, a robots crawl block and an empty sitemap. Production output retains its original metadata and sitemap behavior.

The package was adapted to retain the existing five-link site navigation and mobile menu, add normal links to dedicated records and references, expose profile sources, and make closed drawers inert with focus trapping/restoration. A malformed leading CSS fragment in the supplied file was removed. Research prompts are explicitly questions, with no unpublished diagnostic findings loaded.

## Validation

- `npm run build`: validation and all page generation/public output passed.
- Supplied `scripts/test-mapping-package-invariants.py`: passed, adapted only for explicit UTF-8 on Windows.
- `scripts/test-mapping-release.py`: all 271 tracked Mapping detail files unchanged from backup; 2,388 internal link occurrences across 272 pages resolve; canonical JSON and route configuration unchanged.
- Playwright/Edge at 1440px, 390px and 320px, locally and against the authenticated Vercel preview: search, empty-state/reset, combined geography/system/context filters, pagination, comparison, country profiles and profile sources, record sources/reference pages, modal keyboard behavior, responsive layout, original navigation and DTSEN SEO all passed, with no browser errors.
- All 33 record routes, 218 reference routes, reference index and methodology returned 200 in browser HTTP checks; DTKS returned the expected 308.
- Preview `/robots.txt` blocks crawling and `/sitemap.xml` is empty. These are preview-only safeguards.
- External documentary URLs are preserved and rendered as source links; the release does not assert that every third-party document remains reachable or passage-verified.

## Production hold — preserve already published non-Mapping work

A separate 25-route audit found that live `/`, `/publications`, and `/publications/displacement-and-the-future-of-development-finance` contain publication work absent from GitHub main. That work exists as uncommitted files in the primary checkout and was left untouched. All other audited non-Mapping pages match after normalizing checkout line endings.

**Do not merge/deploy this isolated branch to production until the already-live publication work is committed to main and this PR is rebased and retested.** Otherwise a site-wide build from this branch would revert the homepage/publication listing and remove the article. The tested preview is suitable for Mapping review, but reflects main's older publication pages. This is why production was not deployed automatically.

After that dependency is reconciled: rebase, build, rerun the supplied/invariant/browser checks against a fresh preview, verify the article and all live routes, merge the PR, and deploy the tested source. Record the resulting production deployment ID, then compare the 200/308 responses and DTSEN HTML/metadata. For immediate rollback, promote the recorded pre-release Vercel deployment so the unrelated live publication content is retained; a Git-only rollback must also include that publication dependency. GSC performance requires subsequent monitoring in the owner's Search Console account.

## Historical 40-entry URL disposition

| Previous entry URL under `/mapping/` | Current disposition |
| --- | --- |
| `aalco-bangkok-principles` | Reference instrument; available at `/mapping/references/aalco-official-website`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `guiding-principles-internal-displacement` | Reference instrument; available at `/mapping/references/un-digital-library-record`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `un-action-agenda-internal-displacement` | Reference instrument; available at `/mapping/references/2024-action-agenda-progress-report`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `global-compact-on-refugees` | Reference instrument; available at `/mapping/references/global-compact-on-refugees-official-platform`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `global-compact-safe-orderly-regular-migration` | Reference instrument; available at `/mapping/references/global-compact-for-migration-final-draft-pdf`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `world-bank-ess5` | Reference instrument; available at `/mapping/references/world-bank-environmental-and-social-framework-pdf`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `ifc-performance-standard-5` | Reference instrument; available at `/mapping/references/ifc-performance-standards-overview`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `thailand-migrant-health-insurance-scheme` | Current arrangement record (200) |
| `indonesia-dtks-siks-ng` | Existing 308 redirect to `/mapping/indonesia-dtsen` |
| `philippines-4ps` | Current arrangement record (200) |
| `asean-aadmer` | Current arrangement record (200) |
| `asean-five-point-consensus-myanmar` | Reference instrument; available at `/mapping/references/asean-chairman-s-statement-on-the-leaders-meeting-24-april-2021`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `thailand-universal-coverage-scheme` | Current arrangement record (200) |
| `thailand-civil-registration-statelessness` | Current arrangement record (200) |
| `indonesia-law-24-2007-disaster-management` | Current arrangement record (200) |
| `philippines-disaster-risk-reduction-management-act` | Current arrangement record (200) |
| `philippines-marawi-rehabilitation-architecture` | Current arrangement record (200) |
| `malaysia-foreign-worker-health-protection-scheme` | Current arrangement record (200) |
| `myanmar-maternal-child-cash-transfer` | Current arrangement record (200) |
| `bangladesh-unhcr-rohingya-registration` | Current arrangement record (200) |
| `asean-declaration-rights-migrant-workers` | Reference instrument; available at `/mapping/references/asean-official-website`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `indonesia-presidential-regulation-125-2016-refugees` | Current arrangement record (200) |
| `thailand-refugee-camp-border-assistance-architecture` | Current arrangement record (200) |
| `philippines-migrant-workers-overseas-filipinos-act` | Current arrangement record (200) |
| `vietnam-residence-law-household-registration-reform` | Current arrangement record (200) |
| `cambodia-land-law-economic-land-concessions` | Current arrangement record (200) |
| `lao-pdr-compensation-resettlement-development-projects` | Current arrangement record (200) |
| `thailand-cabinet-resolution-statelessness-2024` | Current arrangement record (200) |
| `unhcr-registration-humanitarian-identity-infrastructure` | Reference instrument; available at `/mapping/references/unhcr-operational-data-portal`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `humanitarian-cash-transfer-systems-parallel-social-protection` | Current arrangement record (200) |
| `adb-safeguards-environmental-social-framework` | Reference instrument; available at `/mapping/references/adb-environmental-and-social-requirements`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `world-bank-ida-window-host-communities-refugees` | Current arrangement record (200) |
| `global-concessional-financing-facility` | Current arrangement record (200) |
| `oecd-social-protection-for-forcibly-displaced` | Reference instrument; available at `/mapping/references/reliefweb-publication-entry`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `world-bank-adaptive-social-protection-framework` | Reference instrument; available at `/mapping/references/adaptive-social-protection-building-resilience-to-shocks-pdf`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `sendai-framework-disaster-risk-reduction` | Reference instrument; available at `/mapping/references/undrr-sendai-framework-publication-page`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `platform-disaster-displacement-nansen-protection-agenda` | Reference instrument; available at `/mapping/references/platform-on-disaster-displacement-official-website`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `iasc-framework-durable-solutions-idps` | Reference instrument; available at `/mapping/references/unhcr-hosted-copy-of-iasc-framework`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `kampala-convention` | Reference instrument; available at `/mapping/references/african-union-treaties-page`. Legacy URL already returned 404 before this release; existing generator also emits an alias. |
| `colombia-registro-unico-victimas` | Current arrangement record (200) |
