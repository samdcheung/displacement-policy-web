import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const write = (path, text) => writeFile(resolve(root, path), text);
const origin = 'https://displacementpolicy.org';
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const publications = JSON.parse(await read('data/publications.json'));
const published = publications.filter(p => p.status === 'published').sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
const analyses = published.filter(p => p.type === 'Analysis');
const shell = await read('publications/governance-by-design.html');
const header = shell.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
const footer = shell.slice(shell.indexOf('<div id="footer-placeholder">'));
const paragraphs = values => values.map(p => `<p>${esc(p)}</p>`).join('\n');

for (const p of analyses) {
  const body = JSON.parse(await read(p.content));
  if (!body.reflections.length || body.reflections.some((r, i) => !r.heading.startsWith(`${i + 1}. `))) throw new Error(`Invalid reflection order: ${p.slug}`);
  await Promise.all([p.pdf, p.image].map(asset => access(resolve(root, asset.slice(1)))));
  const url = origin + p.href;
  const image = origin + p.image;
  const metadata = {
    'og:type': 'article', 'og:title': p.title, 'og:description': p.seoDescription,
    'og:url': url, 'og:site_name': 'Displacement Policy', 'og:image': image,
    'og:image:secure_url': image, 'og:image:type': 'image/png',
    'og:image:width': String(p.imageWidth || 1200), 'og:image:height': String(p.imageHeight || 630), 'og:image:alt': p.imageAlt,
    'article:published_time': `${p.publishedDate}T00:00:00+07:00`
  };
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: p.title,
    alternativeHeadline: p.subtitle, articleSection: 'Analysis', datePublished: p.publishedDate,
    description: p.seoDescription, url, image,
    author: { '@type': 'Person', name: p.author, url: origin + '/samuel-cheung' },
    publisher: { '@type': 'Organization', name: 'Displacement Policy', logo: origin + '/assets/brand/dp-logo-primary.svg' },
    encoding: { '@type': 'MediaObject', contentUrl: origin + p.pdf, encodingFormat: 'application/pdf' } };
  await write(`publications/${p.slug}.html`, `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(p.title)} | Displacement Policy</title>
<meta name="description" content="${esc(p.seoDescription)}"/>
<link rel="canonical" href="${url}"/>
${Object.entries(metadata).map(([key, value]) => `<meta property="${key}" content="${esc(value)}"/>`).join('\n')}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(p.title)}"/>
<meta name="twitter:description" content="${esc(p.seoDescription)}"/>
<meta name="twitter:image" content="${image}"/>
<meta name="twitter:image:alt" content="${esc(p.imageAlt)}"/>
<meta name="citation_title" content="${esc(p.title)}"/>
<meta name="citation_author" content="Cheung, Samuel"/>
<meta name="citation_publication_date" content="${p.publishedDate.replaceAll('-', '/')}"/>
<meta name="citation_pdf_url" content="${origin + p.pdf}"/>
<link href="/assets/brand/dp-favicon.svg" rel="icon" type="image/svg+xml"/>
<link href="/styles.css" rel="stylesheet"/>
<link href="/assets/analysis.css" rel="stylesheet"/>
<script type="application/ld+json">${JSON.stringify(schema, null, 2).replaceAll('<', '\\u003c')}</script>
</head><body class="publications-page publication-detail analysis-detail">
<a class="skip-link" href="#main">Skip to content</a>
${header}
<main id="main">
<article class="analysis-article">
<header class="analysis-masthead container">
<p class="analysis-institution">Displacement Policy</p>
<p class="eyebrow">Analysis <span aria-hidden="true">|</span> <time datetime="${p.publishedDate}">${esc(p.date)}</time></p>
<h1>${esc(p.title)}</h1>
<p class="analysis-subtitle">${esc(p.subtitle)}</p>
<p class="analysis-byline"><a href="/samuel-cheung">${esc(p.author)}</a> <span aria-hidden="true">|</span> ${esc(p.authorDesignation)}</p>
<a class="publication-download" href="${p.pdf}" download>Download PDF</a>
</header>
<div class="analysis-body container">
${paragraphs(body.intro)}
${body.reflections.map((r, i) => `<section aria-labelledby="reflection-${i + 1}"><h2 id="reflection-${i + 1}">${esc(r.heading)}</h2>${paragraphs(r.paragraphs)}</section>`).join('\n')}
${body.note ? `<p class="analysis-note">${esc(body.note)}</p>` : ''}
<a class="publication-back-link" href="/publications">Back to Publications</a>
</div></article></main>
${footer}`);
}

let listing = await read('publications.html');
const cards = analyses.map(p => `<article class="publication-card publication-visual-card">
<a class="publication-image-link" href="${p.href}"><img class="publication-image" src="${p.image}" alt="${esc(p.imageAlt)}" width="${p.imageWidth || 1200}" height="${p.imageHeight || 630}" loading="lazy" decoding="async"/></a>
<div class="publication-card-content"><p class="publication-number">Analysis</p><h3 class="publication-title"><a href="${p.href}">${esc(p.title)}</a></h3><p class="publication-subtitle">${esc(p.summary)}</p><p><time datetime="${p.publishedDate}">${esc(p.date)}</time></p><div class="publication-links"><a class="text-link" href="${p.href}">Read analysis</a></div></div></article>`).join('\n');
listing = listing.replace(/<!-- analysis:start -->[\s\S]*?<!-- analysis:end -->/, `<!-- analysis:start -->
<section class="section section-paper analysis-list-section" aria-labelledby="analysis-title"><div class="container publications-column">
<h2 id="analysis-title" class="section-title">Analysis</h2><p class="publication-series-intro">Independent analysis and timely reflections connecting displacement governance with wider developments in public policy, development finance and institutional practice.</p>
<div class="publication-visual-grid publication-grid">${cards}</div></div></section>
<!-- analysis:end -->`);
listing = listing.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, open, json, close) => {
  const schema = JSON.parse(json);
  schema.hasPart = schema.hasPart.filter(p => !analyses.some(a => origin + a.href === p.url));
  schema.hasPart.unshift(...analyses.map(p => ({ '@type': 'Article', headline: p.title, description: p.summary, url: origin + p.href, articleSection: 'Analysis', author: { '@id': origin + '/samuel-cheung#person' } })));
  return open + JSON.stringify(schema, null, 2) + close;
});
await write('publications.html', listing);
await write('publications/index.html', listing);

let home = await read('index.html');
const latest = published.slice(0, 3).map(p => `<article class="home-output-row home-publication-output">
${p.image ? `<a class="home-output-thumb home-publication-thumb" href="${p.href}" aria-label="View publication: ${esc(p.title)}"><img src="${p.image}" alt="${esc(p.imageAlt || p.title)}" width="${p.imageWidth || 1200}" height="${p.imageHeight || 630}" loading="lazy" decoding="async"/></a>` : `<span class="home-output-thumb home-publication-thumb" aria-hidden="true" style="aspect-ratio:1672 / 941;background:var(--paper)"></span>`}
<div class="home-output-copy"><p class="home-output-kicker">${esc(p.type)}</p><h3><a href="${p.href}">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p><p class="home-output-meta">${esc(p.date)}</p><a class="text-link" href="${p.href}">${p.type === 'Analysis' ? 'Read analysis' : 'View publication'}</a></div></article>`).join('\n');
home = home.replace(/<!-- latest-publications:start -->[\s\S]*?<!-- latest-publications:end -->/, `<!-- latest-publications:start --><div class="home-output-list home-publication-list" data-source="/data/publications.json" data-limit="3" data-filter="published">${latest}</div><!-- latest-publications:end -->`);
await write('index.html', home);
let sitemap = await read('sitemap.xml');
for (const p of analyses) if (!sitemap.includes(`<loc>${origin + p.href}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${origin + p.href}</loc></url>\n</urlset>`);
await write('sitemap.xml', sitemap);
console.log(`Built ${analyses.length} Analysis publication(s) and publication discovery.`);
