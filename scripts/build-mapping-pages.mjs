import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataPath = resolve(root, "data", "mapping-entries.json");
const siteUrl = "https://displacementpolicy.org";

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const stripHtml = (value = "") => String(value).replace(/<[^>]+>/g, "");
const metaDescription = (entry) => stripHtml(entry.one_line_finding).slice(0, 155);
const entryUrl = (entry) => `${siteUrl}/mapping/${entry.slug}`;

function sourceList(items) {
  const sources = asArray(items);
  if (!sources.length) return "<p>No sources listed yet.</p>";
  return `<ul class="mapping-source-list">${sources.map((source) => `
    <li><a class="text-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>
  `).join("")}</ul>`;
}

function chips(items) {
  return asArray(items).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("");
}

function textSection(id, heading, body) {
  return `
    <section class="mapping-entry-section" aria-labelledby="${id}">
      <h2 id="${id}">${heading}</h2>
      <p>${escapeHtml(body)}</p>
    </section>
  `;
}

function relationList(items, emptyText) {
  const values = asArray(items);
  if (!values.length) return `<p>${emptyText}</p>`;
  return `<ul class="compact-bullets">${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function page(entry) {
  const canonical = entryUrl(entry);
  const description = metaDescription(entry);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${canonical}#creativework`,
    "url": canonical,
    "headline": entry.title,
    "name": entry.title,
    "description": entry.one_line_finding,
    "datePublished": entry.date_added,
    "dateModified": entry.date_updated,
    "isPartOf": {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/mapping#webpage`,
      "name": "Displacement Governance Mapping"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Displacement Policy",
      "url": `${siteUrl}/`,
      "logo": `${siteUrl}/assets/brand/dp-logo-primary.svg`
    },
    "about": [
      entry.country_or_region,
      entry.governance_layer,
      entry.sector,
      entry.political_economy_archetype,
      ...asArray(entry.population_groups),
      ...asArray(entry.fault_lines)
    ].filter(Boolean)
  };

  const codingRows = [
    ["Political economy archetype", entry.political_economy_archetype],
    ["Responsibility", entry.responsibility],
    ["Eligibility", entry.eligibility],
    ["Financing", entry.financing],
    ["Data systems", entry.data_systems],
    ["Delivery system", entry.delivery_system],
    ["Portability", entry.portability],
    ["Accountability", entry.accountability],
    ["Time horizon", entry.time_horizon]
  ];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(entry.title)} | Mapping | Displacement Policy</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${escapeHtml(entry.title)} | Mapping | Displacement Policy">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="Displacement Policy">
    <meta property="og:image" content="${siteUrl}/assets/images/dp-linkedin-card.png">
    <meta property="og:image:secure_url" content="${siteUrl}/assets/images/dp-linkedin-card.png">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="627">
    <meta property="og:image:alt" content="Displacement Policy - research on displacement governance and public systems">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(entry.title)} | Mapping | Displacement Policy">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${siteUrl}/assets/images/dp-linkedin-card.png">
    <link rel="icon" href="/assets/brand/dp-favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
    <script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
    <style>
      .mapping-entry-page .page-masthead { margin:0; padding:clamp(4.5rem,8vw,7rem) 0 clamp(2.25rem,4vw,3.5rem); background:var(--paper-deep); border-bottom:1px solid var(--line); }
      .mapping-entry-page .page-masthead .container, .mapping-entry-page .page-content .container { width:min(calc(100% - 2rem), 980px); max-width:980px; }
      .mapping-entry-page .article-meta { color:var(--blue-grey); font-size:.9rem; margin-bottom:.7rem; }
      .mapping-entry-page .mapping-entry-finding { max-width:780px; color:var(--atlantic); font-size:clamp(1.05rem,1.35vw,1.22rem); line-height:1.5; margin:.6rem 0 1.1rem; }
      .mapping-entry-page .mapping-entry-archetype { max-width:780px; border-left:3px solid var(--bronze); padding-left:.85rem; margin:0 0 1rem; }
      .mapping-entry-page .mapping-entry-archetype strong { display:block; color:var(--blue,#156082); font-size:.72rem; text-transform:uppercase; letter-spacing:.09em; margin-bottom:.2rem; }
      .mapping-entry-page .mapping-entry-archetype span { display:block; color:var(--ink); font-family:var(--serif); font-size:1.08rem; line-height:1.3; }
      .mapping-entry-page .mapping-entry-archetype p { margin:.35rem 0 0; color:var(--muted); line-height:1.55; }
      .mapping-entry-page .metadata-chips { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:1rem; }
      .mapping-entry-page .page-content { padding:clamp(2.25rem,4vw,3.5rem) 0 clamp(4rem,7vw,6rem); background:var(--white); }
      .mapping-entry-layout { display:grid; gap:1.2rem; }
      .mapping-entry-section { border-top:1px solid var(--line); padding-top:1.1rem; }
      .mapping-entry-section h2 { font-size:clamp(1.22rem,1.6vw,1.55rem); margin-bottom:.55rem; }
      .mapping-entry-section p, .mapping-entry-section li { color:var(--muted); line-height:1.62; }
      .mapping-coding-table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:var(--white); }
      .mapping-coding-table th, .mapping-coding-table td { border-bottom:1px solid var(--line); padding:.78rem .85rem; text-align:left; vertical-align:top; }
      .mapping-coding-table th { width:28%; color:var(--blue,#156082); font-size:.72rem; text-transform:uppercase; letter-spacing:.09em; }
      .mapping-source-list { display:grid; gap:.5rem; margin:0; padding-left:1.1rem; }
      .mapping-entry-related { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
      .back-link { margin-top:2rem; }
      @media (max-width:720px) { .mapping-entry-related { grid-template-columns:1fr; } .mapping-coding-table th, .mapping-coding-table td { display:block; width:100%; } }
    </style>
  </head>
  <body class="mapping-entry-page">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="/" aria-label="Displacement Policy home"><img src="/assets/brand/dp-logo-primary.svg" alt="Displacement Policy" width="420" height="180" decoding="async"></a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-line"></span><span class="nav-toggle-line"></span><span class="nav-toggle-line"></span><span class="sr-only">Toggle navigation</span></button>
        <nav class="site-nav" id="site-nav" aria-label="Primary navigation"><a href="/research">Research</a><a href="/mapping" aria-current="page">Mapping</a><a href="/perspectives">Perspectives</a><a href="/publications">Publications</a><a href="/about">About</a></nav>
      </div>
    </header>
    <main id="main">
      <section class="page-masthead">
        <div class="container">
          <p class="eyebrow">Mapping Entry</p>
          <h1>${escapeHtml(entry.title)}</h1>
          <p class="mapping-entry-finding">${escapeHtml(entry.one_line_finding)}</p>
          <div class="mapping-entry-archetype">
            <strong>Political economy archetype</strong>
            <span>${escapeHtml(entry.political_economy_archetype || "Not coded")}</span>
            <p>${escapeHtml(entry.archetype_explanation || "")}</p>
          </div>
          <p class="article-meta">${escapeHtml(entry.country_or_region)} | ${escapeHtml(entry.governance_layer)} | Updated ${escapeHtml(entry.date_updated)}</p>
          <div class="metadata-chips">
            ${chips([entry.country_or_region, entry.governance_layer, entry.sector, entry.instrument_type, entry.inclusion_type, entry.political_economy_archetype, ...asArray(entry.population_groups), ...asArray(entry.fault_lines)])}
          </div>
        </div>
      </section>
      <section class="page-content">
        <div class="container mapping-entry-layout">
          ${textSection("what-it-is", "What it is", entry.what_it_is)}
          ${textSection("governance-function", "Governance function", entry.governance_function)}
          ${textSection("who-is-included", "Who is included", entry.who_is_included)}
          ${textSection("who-is-left-out", "Who is left out", entry.who_is_left_out)}
          ${textSection("where-continuity-breaks", "Where continuity breaks", entry.where_continuity_breaks)}
          ${textSection("why-it-matters", "Why it matters", entry.why_it_matters)}
          <section class="mapping-entry-section" aria-labelledby="governance-coding">
            <h2 id="governance-coding">Governance coding table</h2>
            <table class="mapping-coding-table">
              <tbody>
                ${codingRows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
              </tbody>
            </table>
          </section>
          <section class="mapping-entry-section" aria-labelledby="sources">
            <h2 id="sources">Sources</h2>
            <h3>Official sources</h3>
            ${sourceList(entry.official_sources)}
            <h3>Secondary sources</h3>
            ${sourceList(entry.secondary_sources)}
          </section>
          <section class="mapping-entry-section" aria-labelledby="related">
            <h2 id="related">Related</h2>
            <div class="mapping-entry-related">
              <div>
                <h3>Related Mapping entries</h3>
                ${relationList(entry.related_mapping_entries, "No related Mapping entries listed yet.")}
              </div>
              <div>
                <h3>Related research</h3>
                ${relationList(entry.related_research, "No related research listed yet.")}
              </div>
            </div>
          </section>
          <p class="back-link"><a class="text-link" href="/mapping">Back to Mapping</a></p>
        </div>
      </section>
    </main>
    <div id="footer-placeholder"></div>
    <script>fetch('/footer.html').then(response => response.text()).then(html => { document.getElementById('footer-placeholder').innerHTML = html; }).catch(() => {});</script>
    <script src="/script.js"></script>
  </body>
</html>`;
}

const payload = JSON.parse(await readFile(dataPath, "utf8"));

for (const entry of payload.entries) {
  const outputPath = resolve(root, "mapping", entry.slug, "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, page(entry), "utf8");
}

await writeFile(resolve(root, "mapping", "index.html"), await readFile(resolve(root, "mapping.html"), "utf8"), "utf8");

console.log(`Generated ${payload.entries.length} mapping entry pages and refreshed mapping/index.html.`);
