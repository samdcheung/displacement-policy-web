import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteUrl = "https://displacementpolicy.org";
const dataDir = resolve(root, "data", "mapping");
const recordsPath = resolve(dataDir, "mapping-records.json");
const referencesPath = resolve(dataDir, "mapping-references.json");
const profilesPath = resolve(dataDir, "mapping-country-profiles.json");
const legacyDiagnosticPath = resolve(root, "data", "archive", "mapping-diagnostic-v1", "mapping-diagnostic.json");

const pageTitle = "Displacement Governance Mapping";
const pageDescription = "A qualitative mapping of governance, institutional responsibility, and fiscal authority across displacement-related sectors in Southeast Asia.";
const heroImage = "/assets/images/southeast-asia-mapping-hero-20260707.png";
const socialImage = `${siteUrl}/assets/images/dp-linkedin-card-202607.png`;

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const clean = (value) => value !== undefined && value !== null && value !== "";
const byId = (items) => new Map(items.map((item) => [item.id, item]));
const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}[char]));
const jsonForHtml = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

function sentenceList(items) {
  const values = asArray(items).filter(clean);
  return values.length ? values.join("; ") : "Not specified";
}

function metaTags({ title, description = pageDescription, path, type = "website", canonicalPath = path }) {
  const canonical = `${siteUrl}${canonicalPath}`;
  const url = `${siteUrl}${path}`;
  return `<title>${esc(title)} | Displacement Policy</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)} | Displacement Policy"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${esc(url)}"><meta property="og:site_name" content="Displacement Policy"><meta property="og:image" content="${socialImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)} | Displacement Policy"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${socialImage}">`;
}

function documentShell({ title, description, path, canonicalPath, body, extraHead = "", current = "mapping" }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${metaTags({ title, description, path, canonicalPath })}<link rel="preconnect" href="https://f.convertkit.com"><link rel="preconnect" href="https://app.kit.com"><link rel="icon" href="/assets/brand/dp-favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css">${mappingStyles()}${extraHead}</head><body class="mapping-page"><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="Displacement Policy home"><img src="/assets/brand/dp-logo-primary.svg" alt="Displacement Policy" width="420" height="180" decoding="async"></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-line"></span><span class="nav-toggle-line"></span><span class="nav-toggle-line"></span><span class="sr-only">Toggle navigation</span></button><nav class="site-nav" id="site-nav" aria-label="Primary navigation"><a href="/research">Research</a><a href="/mapping"${current === "mapping" ? " aria-current=\"page\"" : ""}>Mapping</a><a href="/perspectives">Perspectives</a><a href="/publications">Publications</a><a href="/about">About</a></nav></div></header><main id="main">${body}</main><div id="footer-placeholder"></div><script>fetch('/footer.html').then(response=>response.text()).then(html=>{document.getElementById('footer-placeholder').innerHTML=html}).catch(()=>{});</script><script src="/script.js"></script></body></html>`;
}

function mappingStyles() {
  return `<style>.mapping-page{--mapping-blue:var(--navy-2,#0d4154);--border-subtle:var(--line,rgba(8,23,35,.14));--surface:var(--white,#fff);--dashboard-surface:rgba(234,220,195,.22);--tag-surface:rgba(13,65,84,.09);--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:24px;--space-6:32px;--space-7:48px}.mapping-project-hero{position:relative;min-height:380px;display:flex;align-items:center;padding:clamp(46px,7vw,76px) 0;overflow:hidden;background:linear-gradient(90deg,rgba(8,47,63,.96),rgba(8,47,63,.84) 50%,rgba(8,47,63,.45)),url("${heroImage}") center/cover no-repeat;color:var(--white);border-bottom:0}.mapping-project-hero .eyebrow{color:var(--bronze-soft)}.mapping-project-hero h1{max-width:860px;margin-bottom:14px;color:var(--white);font-size:clamp(2.2rem,5vw,3.75rem);line-height:1.02}.mapping-project-hero .subtitle{max-width:820px;color:rgba(255,255,255,.9)}.mapping-shell{max-width:1180px;margin:0 auto;padding:32px 24px 64px}.mapping-control-surface{display:grid;gap:var(--space-3);margin-bottom:var(--space-6);padding:var(--space-5);border:1px solid var(--border-subtle);background:rgba(255,255,255,.74)}.mapping-search input,.mapping-select{width:100%;height:44px;border:1px solid var(--border-subtle);background:#fff;padding:0 var(--space-3);color:var(--ink);font:inherit;font-size:.95rem}.mode-switch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}.mode-switch button{height:44px;border:1px solid var(--border-subtle);background:#fff;color:var(--ink);padding:0 var(--space-4);font:inherit;font-size:.9rem;font-weight:700;cursor:pointer;text-align:left}.mode-switch button.is-active{background:var(--mapping-blue);border-color:var(--mapping-blue);color:#fff}.mapping-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-3)}.mapping-filter-grid label{display:grid;gap:var(--space-2)}.mapping-filter-grid span,.mapping-label{color:var(--blue-grey,var(--muted));font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}.mapping-section{margin-bottom:var(--space-6)}.mapping-section-title{margin:0 0 var(--space-4);font-family:var(--serif);font-size:1.5rem;line-height:1.2}.mapping-section-intro{max-width:760px;margin:calc(-1 * var(--space-2)) 0 var(--space-5);color:var(--muted);font-size:1rem;line-height:1.55}.mapping-summary,.mapping-country-dashboard{margin-bottom:var(--space-6);padding:var(--space-5);border:1px solid var(--border-subtle);background:var(--dashboard-surface)}.mapping-summary h2,.mapping-country-dashboard h2{margin:0 0 var(--space-2);font-size:clamp(1.55rem,2vw,2rem);line-height:1.12}.mapping-summary p,.mapping-country-dashboard p{max-width:900px;color:var(--muted);font-size:1rem;line-height:1.6}.result-count{margin:var(--space-3) 0 0;color:var(--muted);font-size:.95rem}.mapping-diagnostic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4);margin-top:var(--space-5)}.mapping-diagnostic-item{padding:var(--space-5);border:1px solid rgba(8,23,35,.1);background:rgba(255,255,255,.58)}.mapping-diagnostic-item h3,.mapping-country-heading{margin:0 0 var(--space-3);font-family:var(--serif);font-size:1.02rem;line-height:1.25}.mapping-diagnostic-item ul{display:grid;gap:var(--space-2);margin:0;padding-left:18px;color:var(--muted);font-size:.96rem;line-height:1.55}.mapping-country-heading{margin:var(--space-5) 0 var(--space-3)}.mapping-country-heading:first-of-type{margin-top:0}.mapping-record-grid,.mapping-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}.mapping-country-group{margin-top:var(--space-5)}.mapping-country-group:first-of-type{margin-top:0}.mapping-record-card{width:100%;min-width:0;padding:20px;border:1px solid var(--border-subtle);background:var(--surface)}.mapping-record-country{margin:0 0 var(--space-2);color:var(--blue-grey,var(--muted));font-size:.78rem;font-weight:700;letter-spacing:.02em;line-height:1.3}.mapping-record-tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 var(--space-3)}.mapping-tag{display:inline-flex;align-items:center;max-width:100%;border:1px solid var(--border-subtle);padding:4px 8px;color:var(--muted);background:#fff;font-size:.78rem;font-weight:700;line-height:1.3}.mapping-tag--system{border-color:rgba(13,65,84,.22);background:var(--tag-surface);color:var(--navy-2)}.mapping-tag--instrument{border-color:rgba(8,23,35,.16);background:#fff;color:var(--ink)}.mapping-tag--context{border-color:transparent;background:rgba(184,130,52,.12);color:#6f4a17}.mapping-record-title{margin:0 0 10px;font-family:var(--serif);font-size:1.2rem;line-height:1.3}.mapping-record-title a{color:inherit;text-decoration:none}.mapping-record-title a:hover,.mapping-record-title a:focus{color:var(--navy-2);text-decoration:underline;text-decoration-color:var(--bronze);text-underline-offset:4px}.mapping-record-body{margin:0 0 14px;color:var(--muted);font-size:1rem;line-height:1.6}.mapping-record-body:last-of-type{margin-bottom:var(--space-4)}.mapping-record-link,.text-link{color:var(--navy-2);font-size:.95rem;font-weight:780;text-decoration-color:var(--bronze);text-underline-offset:4px}.reference-panel{margin-bottom:var(--space-6)}.reference-list{margin:0;padding:0;list-style:none}.reference-item{padding:var(--space-4) 0;border-top:1px solid var(--border-subtle)}.reference-item:first-child{border-top:0;padding-top:0}.reference-item strong{display:block;margin-bottom:var(--space-1);font-family:var(--serif);font-size:1.05rem;line-height:1.28}.reference-item p{margin:var(--space-2) 0 0;max-width:900px;color:var(--muted);font-size:.96rem;line-height:1.55}.reference-item__meta{margin:0;color:var(--blue-grey,var(--muted));font-size:.78rem;line-height:1.35}.inline-empty{margin:var(--space-3) 0 var(--space-5);color:var(--muted);font-size:1rem}.clear-filters{border:0;background:transparent;color:var(--navy-2);font:inherit;font-weight:780;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:var(--bronze);text-underline-offset:4px}.mapping-footer-links{display:flex;flex-wrap:wrap;gap:var(--space-5);margin-top:var(--space-5);font-size:.92rem}@media(max-width:980px){.mapping-filter-grid,.mapping-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mapping-diagnostic-grid{grid-template-columns:1fr}}@media(max-width:760px){.mapping-record-grid{grid-template-columns:1fr}}@media(max-width:720px){.mapping-project-hero{min-height:315px;padding:44px 0}.mapping-shell{padding:24px 16px 48px}.mapping-control-surface,.mapping-summary,.mapping-country-dashboard{padding:var(--space-4)}.mode-switch,.mapping-filter-grid,.mapping-grid{grid-template-columns:1fr}.mapping-record-card{padding:var(--space-4)}}</style>`;
}
function hero() {
  return `<section class="mapping-project-hero" aria-labelledby="mapping-title"><div class="container editorial-column mapping-hero-column"><p class="eyebrow">Mapping</p><h1 id="mapping-title">${esc(pageTitle)}</h1><p class="subtitle">${esc(pageDescription)}</p></div></section>`;
}

function metaLine(items) {
  return `<p class="mapping-record-country">${esc(items.filter(clean).join(" · "))}</p>`;
}

function recordCard(record) {
  const country = sentenceList(record.countryRegion);
  const contextTags = (Array.isArray(record.displacementContext) ? record.displacementContext : record.displacementContext ? [record.displacementContext] : []).map((context) => `<span class="mapping-tag mapping-tag--context">${esc(context)}</span>`).join("");
  return `<article class="mapping-record-card"><p class="mapping-record-country">${esc(country)}</p><div class="mapping-record-tags"><span class="mapping-tag mapping-tag--system">${esc(record.publicSystem)}</span><span class="mapping-tag mapping-tag--instrument">${esc(record.instrumentResponseType)}</span>${contextTags}</div><h3 class="mapping-record-title"><a href="/mapping/${esc(record.slug)}/">${esc(record.title)}</a></h3><p class="mapping-record-body">${esc(record.description)}</p><p class="mapping-record-body"><strong>Why it matters:</strong> ${esc(record.whyItMatters)}</p><a class="mapping-record-link" href="/mapping/${esc(record.slug)}/">View record</a></article>`;
}

function compactApplicability(reference) {
  const text = reference.applicability || "";
  return /continuity|break|constraint|limit|depends|when|where|without|unless/i.test(text) ? text : "";
}

function referenceList(references, heading = "References and instruments") {
  if (!references.length) return "";
  return `<section class="reference-panel mapping-section"><h2 class="mapping-section-title">${esc(heading)}</h2><ul class="reference-list">${references.slice(0, 8).map((ref) => `<li class="reference-item"><strong><a href="/mapping/references/${esc(ref.slug)}/">${esc(ref.referenceTitle)}</a></strong><p class="reference-item__meta">${esc([ref.authorInstitution, ref.year, ref.referenceType].filter(clean).join(" · "))}</p>${ref.relevance ? `<p>${esc(ref.relevance)}</p>` : ""}${compactApplicability(ref) ? `<p>${esc(compactApplicability(ref))}</p>` : ""}${ref.url ? `<a class="text-link" href="${esc(ref.url)}">Source link</a>` : ""}</li>`).join("")}</ul>${references.length > 8 ? `<a class="text-link" href="/mapping/references/">View all related references</a>` : ""}</section>`;
}

function landingPage(records, references, profiles) {
  const data = { records, references, profiles };
  const extraHead = `<script id="mapping-data" type="application/json">${jsonForHtml(data)}</script>`;
  const body = `${hero()}<section class="section section-compact" aria-labelledby="mapping-tool-title"><div class="container mapping-shell"><div class="mapping-control-surface"><div class="mapping-search"><input type="search" data-search placeholder="Search countries, systems, institutions, policies or cases" aria-label="Search countries, systems, institutions, policies or cases"></div><div class="mode-switch" aria-label="Mapping route"><button type="button" data-mode="country" class="is-active">By country</button><button type="button" data-mode="publicSystem">By public system</button></div><div class="mapping-filter-grid"><label><span>Country</span><select class="mapping-select" data-country></select></label><label><span>Public system</span><select class="mapping-select" data-system></select></label><label><span>Displacement context</span><select class="mapping-select" data-context></select></label><label><span>Instrument / response type</span><select class="mapping-select" data-instrument></select></label></div></div><div data-output></div><div class="mapping-footer-links"><a href="/mapping/references/">Browse references and instruments</a><a href="/mapping/methodology/">Methodology</a></div></div></section><script>${clientScript()}</script>`;
  return documentShell({ title: `${pageTitle} | Mapping`, description: pageDescription, path: "/mapping", canonicalPath: "/mapping", body, extraHead });
}

function clientScript() {
  return String.raw`const data=JSON.parse(document.getElementById('mapping-data').textContent);
const ALL='all';
const defaultCountry=data.profiles[0]?.country||ALL;
const defaultPublicSystem=data.records[0]?.publicSystem||ALL;
const filters={mode:'country',search:'',country:defaultCountry,publicSystem:ALL,displacementContext:ALL,instrumentResponseType:ALL};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:v?[v]:[];
const uniq=v=>Array.from(new Set(v.filter(Boolean)));
const option=(value,label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
const refsById=Object.fromEntries(data.references.map(ref=>[ref.id,ref]));
function searchable(record){return [record.title,...arr(record.countryRegion),record.publicSystem,...arr(record.displacementContext),record.instrumentResponseType,record.description,record.whyItMatters].join(' ').toLowerCase()}
function applyMappingFilters(records, activeFilters){return records.filter(record=>(activeFilters.country===ALL||arr(record.countryRegion).includes(activeFilters.country))&&(activeFilters.publicSystem===ALL||record.publicSystem===activeFilters.publicSystem)&&(activeFilters.displacementContext===ALL||arr(record.displacementContext).includes(activeFilters.displacementContext))&&(activeFilters.instrumentResponseType===ALL||record.instrumentResponseType===activeFilters.instrumentResponseType)&&(!activeFilters.search||searchable(record).includes(activeFilters.search.toLowerCase())))}
function tag(label,kind){return label?'<span class="mapping-tag mapping-tag--'+kind+'">'+esc(label)+'</span>':''}
function tags(labels,kind){return arr(labels).map(label=>tag(label,kind)).join('')}
function card(record,showCountry=true){const country=arr(record.countryRegion).join('; ');const countryLine=showCountry?'<p class="mapping-record-country">'+esc(country)+'</p>':'';return '<article class="mapping-record-card">'+countryLine+'<div class="mapping-record-tags">'+tag(record.publicSystem,'system')+tag(record.instrumentResponseType,'instrument')+tags(record.displacementContext,'context')+'</div><h3 class="mapping-record-title"><a href="/mapping/'+esc(record.slug)+'/">'+esc(record.title)+'</a></h3><p class="mapping-record-body">'+esc(record.description)+'</p><p class="mapping-record-body"><strong>Why it matters:</strong> '+esc(record.whyItMatters)+'</p><a class="mapping-record-link" href="/mapping/'+esc(record.slug)+'/">View record</a></article>'}
function listItems(items){items=arr(items).filter(Boolean);return items.length?'<ul>'+items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>':''}
function diagnosticItem(title,items){const body=listItems(items);return body?'<div class="mapping-diagnostic-item"><h3>'+esc(title)+'</h3>'+body+'</div>':''}
function visibleReferences(filteredRecords,extraIds=[],extraFirst=true){const recordIds=filteredRecords.flatMap(record=>arr(record.referenceIds));const ordered=extraFirst?[...extraIds,...recordIds]:[...recordIds,...extraIds];const seen=new Set();return ordered.map(id=>refsById[id]).filter(ref=>ref&&!seen.has(ref.id)&&seen.add(ref.id))}
function compactApplicability(ref){const text=ref.applicability||'';return /continuity|break|constraint|limit|depends|when|where|without|unless/i.test(text)?text:''}
function refMeta(ref){return [ref.authorInstitution,ref.year,ref.referenceType].filter(Boolean).join(' · ')}
function referencePanel(refs,heading){if(!refs.length)return '';return '<section class="reference-panel mapping-section"><h2 class="mapping-section-title">'+esc(heading)+'</h2><ul class="reference-list">'+refs.slice(0,8).map(ref=>'<li class="reference-item"><strong><a href="/mapping/references/'+esc(ref.slug)+'/">'+esc(ref.referenceTitle)+'</a></strong><p class="reference-item__meta">'+esc(refMeta(ref))+'</p>'+(ref.relevance?'<p>'+esc(ref.relevance)+'</p>':'')+(compactApplicability(ref)?'<p>'+esc(compactApplicability(ref))+'</p>':'')+(ref.url?'<a class="text-link" href="'+esc(ref.url)+'">Source link</a>':'')+'</li>').join('')+'</ul>'+(refs.length>8?'<a class="text-link" href="/mapping/references/">View all related references</a>':'')+'</section>'}
function grouped(records,keyFn){return records.reduce((acc,record)=>{const key=keyFn(record)||'Other';(acc[key]??=[]).push(record);return acc},{})}
function emptyMessage(){return '<p class="inline-empty">No mapping examples are currently available for this combination. <button type="button" class="clear-filters" data-clear-filters>Clear filters</button></p>'}
function sectionExamples(groups,{showCountry=true}={}){const entries=Object.entries(groups);if(!entries.length)return '';return '<section class="mapping-section"><h2 class="mapping-section-title">Governance records</h2><p class="mapping-section-intro">Laws, programmes, institutional arrangements and implementation cases relevant to the selected country or public system.</p>'+entries.map(([heading,items])=>'<section class="mapping-country-group"><h3 class="mapping-country-heading">'+esc(heading)+'</h3><div class="mapping-record-grid">'+items.map(record=>card(record,showCountry)).join('')+'</div></section>').join('')+'</section>'}
function dashboard(profile,filteredRecords){const diagnostic=diagnosticItem('Institutional architecture',profile.institutionalArchitecture)+diagnosticItem('Main governance patterns',profile.mainGovernancePatterns)+diagnosticItem('Reform opportunities',profile.reformOpportunities);return '<section class="mapping-country-dashboard"><p class="eyebrow">Country profile</p><h2>'+esc(profile.country)+'</h2><p>'+esc(profile.overview)+'</p><p class="result-count">'+filteredRecords.length+' mapping '+(filteredRecords.length===1?'example':'examples')+'</p>'+(diagnostic?'<div class="mapping-diagnostic-grid">'+diagnostic+'</div>':'')+'</section>'}
function renderCountry(filteredRecords){const profile=data.profiles.find(item=>item.country===filters.country)||data.profiles[0];const secondaryActive=filters.publicSystem!==ALL||filters.displacementContext!==ALL||filters.instrumentResponseType!==ALL||Boolean(filters.search);let html=dashboard(profile,filteredRecords);if(filteredRecords.length){html+=sectionExamples(grouped(filteredRecords,record=>record.publicSystem));html+=referencePanel(visibleReferences(filteredRecords,arr(profile.keyReferenceIds),!secondaryActive),'References and instruments')}else{html+=emptyMessage()}$('[data-output]').innerHTML=html}
function renderPublicSystem(filteredRecords){let html='<section class="mapping-summary"><p class="eyebrow">Public system</p><h2>'+esc(filters.publicSystem)+'</h2><p>'+esc(systemIntro(filters.publicSystem))+'</p><p class="result-count">'+filteredRecords.length+' mapping '+(filteredRecords.length===1?'example':'examples')+'</p></section>';if(filteredRecords.length){html+=sectionExamples(grouped(filteredRecords,record=>arr(record.countryRegion).join('; ')||'Regional / global'),{showCountry:false});html+=referencePanel(visibleReferences(filteredRecords),'References and instruments')}else{html+=emptyMessage()}$('[data-output]').innerHTML=html}
function systemIntro(system){const intros={'Health':'Health examples show how displaced and mobile populations are included or excluded through ordinary coverage systems, sectoral insurance, and public health financing.','Social protection':'Social protection examples trace how cash, registries, targeting rules, and portability shape continuity after displacement.','Disaster risk management':'Disaster risk management examples focus on the handoff from preparedness and response into recovery, financing, and sustained public support.','Migration and labour':'Migration and labour examples examine how legal status, work authorization, and administrative recognition affect access to public systems.','Civil registration and identity':'Civil registration and identity examples show how documentation, registration, and databases mediate access to rights and services.','Local government':'Local government examples examine the municipal and subnational responsibilities that absorb displacement-related costs.','Housing, land and resettlement':'Housing, land and resettlement examples focus on relocation, compensation, tenure, and post-project inclusion.','Public and development finance':'Public and development finance examples examine how grants, loans, budget windows, and concessional instruments allocate fiscal responsibility.','Cross-sector governance':'Cross-sector governance examples show how responsibility is coordinated across institutions, sectors, and levels of government.'};return intros[system]||'Examples in this public system show how responsibility is assigned, financed, and handed off across displacement-related sectors.'}
function syncControls(){document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('is-active',button.dataset.mode===filters.mode));$('[data-search]').value=filters.search;$('[data-country]').value=filters.country;$('[data-system]').value=filters.publicSystem;$('[data-context]').value=filters.displacementContext;$('[data-instrument]').value=filters.instrumentResponseType}
function render(){syncControls();const filteredRecords=applyMappingFilters(data.records,filters);if(filters.mode==='country')renderCountry(filteredRecords);else renderPublicSystem(filteredRecords)}
function setCountryMode(){filters.mode='country';filters.search='';filters.country=defaultCountry;filters.publicSystem=ALL;filters.displacementContext=ALL;filters.instrumentResponseType=ALL;render()}
function setPublicSystemMode(){filters.mode='publicSystem';filters.search='';filters.country=ALL;filters.publicSystem=defaultPublicSystem;filters.displacementContext=ALL;filters.instrumentResponseType=ALL;render()}
function clearFilters(){filters.search='';filters.displacementContext=ALL;filters.instrumentResponseType=ALL;if(filters.mode==='country')filters.publicSystem=ALL;if(filters.mode==='publicSystem')filters.country=ALL;render()}
function init(){const countries=uniq(data.profiles.map(profile=>profile.country));const systems=uniq(data.records.map(record=>record.publicSystem));const contexts=uniq(data.records.flatMap(record=>arr(record.displacementContext)));const instruments=uniq(data.records.map(record=>record.instrumentResponseType));$('[data-country]').innerHTML=option(ALL,'All countries')+countries.map(country=>option(country,country)).join('');$('[data-system]').innerHTML=option(ALL,'All public systems')+systems.map(system=>option(system,system)).join('');$('[data-context]').innerHTML=option(ALL,'All displacement contexts')+contexts.map(context=>option(context,context)).join('');$('[data-instrument]').innerHTML=option(ALL,'All instrument / response types')+instruments.map(instrument=>option(instrument,instrument)).join('');$('[data-search]').addEventListener('input',event=>{filters.search=event.target.value;render()});$('[data-country]').addEventListener('change',event=>{filters.country=event.target.value;if(filters.mode==='country'){filters.publicSystem=ALL;filters.displacementContext=ALL;filters.instrumentResponseType=ALL}render()});$('[data-system]').addEventListener('change',event=>{filters.publicSystem=event.target.value;if(filters.mode==='publicSystem'){filters.country=ALL;filters.displacementContext=ALL;filters.instrumentResponseType=ALL}render()});$('[data-context]').addEventListener('change',event=>{filters.displacementContext=event.target.value;render()});$('[data-instrument]').addEventListener('change',event=>{filters.instrumentResponseType=event.target.value;render()});$('[data-output]').addEventListener('click',event=>{if(event.target.matches('[data-clear-filters]'))clearFilters()});$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.mode==='country')setCountryMode();else setPublicSystemMode()}));render()}
init();`;
}
function recordPage(record, references) {
  const refs = asArray(record.referenceIds).map((id) => references.get(id)).filter(Boolean);
  const body = `${hero()}<section class="section section-compact"><div class="container mapping-shell"><section class="mapping-panel"><p class="eyebrow">Mapping record</p><h2>${esc(record.title)}</h2>${metaLine([sentenceList(record.countryRegion), record.publicSystem, sentenceList(record.displacementContext), record.instrumentResponseType])}<p>${esc(record.description)}</p><p><strong>Why it matters:</strong> ${esc(record.whyItMatters)}</p></section>${referenceList(refs)}<section class="mapping-panel"><a href="/mapping/">Back to mapping</a></section></div></section>`;
  return documentShell({ title: record.title, description: record.description, path: `/mapping/${record.slug}`, body });
}

function referencePage(reference, records, aliasSlug = null) {
  const relatedRecords = asArray(reference.relatedMappingRecordIds).map((id) => records.get(id)).filter(Boolean);
  const path = aliasSlug ? `/mapping/${aliasSlug}` : `/mapping/references/${reference.slug}`;
  const canonicalPath = aliasSlug ? `/mapping/references/${reference.slug}` : path;
  const body = `${hero()}<section class="section section-compact"><div class="container mapping-shell"><section class="mapping-panel"><p class="eyebrow">Reference / instrument</p><h2>${esc(reference.referenceTitle)}</h2>${metaLine([sentenceList(reference.countryRegion), reference.referenceType, reference.authorInstitution, reference.year])}${reference.relevance ? `<p><strong>Relevance:</strong> ${esc(reference.relevance)}</p>` : ""}${reference.applicability ? `<p><strong>Applicability:</strong> ${esc(reference.applicability)}</p>` : ""}${reference.url ? `<p><a href="${esc(reference.url)}">Source link</a></p>` : ""}</section><section class="mapping-panel"><h2>Related mapping records</h2><div class="mapping-grid">${relatedRecords.map(recordCard).join("") || `<p class="inline-empty">No mapping records are linked to this reference.</p>`}</div></section><section class="mapping-panel"><a href="/mapping/references/">Browse references and instruments</a></section></div></section>`;
  return documentShell({ title: reference.referenceTitle, description: reference.relevance || pageDescription, path, canonicalPath, body });
}

function referencesIndex(references) {
  const extraHead = `<script id="references-data" type="application/json">${jsonForHtml(references)}</script>`;
  const body = `${hero()}<section class="section section-compact"><div class="container mapping-shell"><section class="mapping-panel"><p class="eyebrow">Evidence base</p><h2>References and instruments</h2><p>Explore the laws, policies, public systems, financing arrangements and implementation cases underlying the mapping.</p><div class="mapping-search"><input type="search" data-reference-search placeholder="Search references and instruments" aria-label="Search references and instruments"></div></section><div data-reference-output></div></div></section><script>const refs=JSON.parse(document.getElementById('references-data').textContent);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function render(q=''){q=q.toLowerCase();const items=refs.filter(r=>!q||[r.referenceTitle,r.referenceType,r.authorInstitution,r.year,(r.countryRegion||[]).join(' '),r.relevance,r.applicability].join(' ').toLowerCase().includes(q));document.querySelector('[data-reference-output]').innerHTML='<section class="reference-panel"><h2>'+items.length+' references</h2><ul class="reference-list">'+items.map(r=>'<li><strong><a href="/mapping/references/'+esc(r.slug)+'/">'+esc(r.referenceTitle)+'</a></strong><br><span>'+esc([r.referenceType,r.authorInstitution,r.year].filter(Boolean).join(' | '))+'</span>'+(r.relevance?'<p>'+esc(r.relevance)+'</p>':'')+'</li>').join('')+'</ul></section>'}document.querySelector('[data-reference-search]').addEventListener('input',e=>render(e.target.value));render();</script>`;
  return documentShell({ title: "References and instruments | Mapping", description: "Explore the laws, policies, public systems, financing arrangements and implementation cases underlying the mapping.", path: "/mapping/references", body, extraHead });
}

function methodologyPage() {
  const body = `${hero()}<section class="section section-compact"><div class="container mapping-shell"><section class="mapping-panel"><p class="eyebrow">Methodology</p><h2>Mapping method</h2><p>This mapping uses three simplified authored datasets: mapping records, country profiles, and references. Country views render authored country-profile assessments. Public-system views group matching records by country or region. Filters use AND logic across search, country, public system, displacement context, and instrument or response type.</p><p>The interface does not generate comparative prose from aggregated fields. Record descriptions, why-it-matters text, country overviews, and reference notes are rendered from the simplified source datasets.</p><a href="/mapping/">Back to mapping</a></section></div></section>`;
  return documentShell({ title: "Mapping methodology", description: "Methodology for the Displacement Governance Mapping interface.", path: "/mapping/methodology", body });
}

function scoreReference(legacyCase, reference) {
  const haystack = [reference.referenceTitle, reference.citation, reference.relevance, reference.applicability, reference.authorInstitution].filter(clean).join(" ").toLowerCase();
  const titleWords = new Set(String(legacyCase.title || legacyCase.slug || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  const sourceWords = asArray(legacyCase.evidence?.officialSources).concat(asArray(legacyCase.evidence?.secondarySources)).flatMap((source) => String(source.label || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4));
  let score = 0;
  for (const word of titleWords) if (haystack.includes(word)) score += 3;
  for (const word of sourceWords) if (haystack.includes(word)) score += 1;
  return score;
}

async function legacyAliases(newSlugs, references) {
  try {
    const legacy = JSON.parse(await readFile(legacyDiagnosticPath, "utf8"));
    const aliases = [];
    for (const item of asArray(legacy.cases)) {
      if (!item.slug || newSlugs.has(item.slug)) continue;
      let best = null;
      let bestScore = -1;
      for (const ref of references) {
        const score = scoreReference(item, ref);
        if (score > bestScore) {
          best = ref;
          bestScore = score;
        }
      }
      if (best) aliases.push({ slug: item.slug, reference: best, score: bestScore });
    }
    return aliases;
  } catch {
    return [];
  }
}

async function write(path, html) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html, "utf8");
}

async function main() {
  const recordsData = JSON.parse(await readFile(recordsPath, "utf8"));
  const referencesData = JSON.parse(await readFile(referencesPath, "utf8"));
  const profilesData = JSON.parse(await readFile(profilesPath, "utf8"));
  const records = asArray(recordsData.records);
  const references = asArray(referencesData.references);
  const profiles = asArray(profilesData.countries);
  const recordsById = byId(records);
  const referencesById = byId(references);
  const mappingDir = resolve(root, "mapping");

  await rm(mappingDir, { recursive: true, force: true });
  await write(resolve(root, "mapping.html"), landingPage(records, references, profiles));

  for (const record of records) await write(resolve(mappingDir, record.slug, "index.html"), recordPage(record, referencesById));
  await write(resolve(mappingDir, "references", "index.html"), referencesIndex(references));
  for (const reference of references) await write(resolve(mappingDir, "references", reference.slug, "index.html"), referencePage(reference, recordsById));
  await write(resolve(mappingDir, "methodology", "index.html"), methodologyPage());

  const aliases = await legacyAliases(new Set(records.map((record) => record.slug)), references);
  for (const alias of aliases) await write(resolve(mappingDir, alias.slug, "index.html"), referencePage(alias.reference, recordsById, alias.slug));

  const expectedRoutes = [resolve(root, "mapping.html"), resolve(mappingDir, "references", "index.html"), resolve(mappingDir, "methodology", "index.html"), ...records.map((record) => resolve(mappingDir, record.slug, "index.html")), ...references.map((reference) => resolve(mappingDir, "references", reference.slug, "index.html")), ...aliases.map((alias) => resolve(mappingDir, alias.slug, "index.html"))];
  const missing = [];
  for (const route of expectedRoutes) {
    try { await readFile(route, "utf8"); } catch { missing.push(route); }
  }
  if (missing.length) throw new Error(`Missing generated mapping routes:\n${missing.join("\n")}`);
  console.log(`Built mapping pages from simple datasets: ${records.length} records, ${references.length} reference pages, ${profiles.length} country profiles, ${aliases.length} preserved legacy URLs.`);
}

await main();












