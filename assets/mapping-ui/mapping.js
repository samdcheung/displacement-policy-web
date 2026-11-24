(async()=>{'use strict';
// Only approved public JSON from the established three-file exporter may be loaded here.
// No workbook preview, research notes, diagnostic drafts or AI queue are embedded.
const BASE=(window.MAPPING_JSON_BASE||'/data/mapping').replace(/\/$/,'');
// The live repository uses {meta,records}, {meta,references}, {meta,countries} wrappers.
// Accept bare arrays only to allow non-production fixture tests; never silently substitute a draft fixture.
async function getJson(name,collection){
 const response=await fetch(BASE+'/'+name,{cache:'no-store'});
 if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
 const data=await response.json();
 const items=Array.isArray(data)?data:data?.[collection];
 if(!Array.isArray(items))throw new Error(`${name}: missing ${collection} array`);
 return items;
}
let publicRecords,publicRefs,publicProfiles;
try {[publicRecords,publicRefs,publicProfiles]=await Promise.all([
  getJson('mapping-records.json','records'),getJson('mapping-references.json','references'),getJson('mapping-country-profiles.json','countries')
]);}catch(err){
 const area=document.getElementById('cards');
 if(area)area.textContent='The Mapping is temporarily unavailable. The public research data could not be loaded.';
 const summary=document.getElementById('result-label');if(summary)summary.textContent='Data unavailable';
 console.error('Mapping data unavailable:',err);return;
}
// Exact legacy public JSON contract -> presentation view model.
const DATA={
 records:publicRecords.map(r=>({id:r.id,slug:r.slug,title:r.title,geo:r.countryRegion||[],
  status:r.recordStatus||'',system:r.publicSystem||'',contexts:r.displacementContext||[],
  type:r.instrumentResponseType||'',description:r.description||'',why:r.whyItMatters||'',
  refIds:r.referenceIds||[]})),
 references:publicRefs.map(r=>({id:r.id,slug:r.slug,title:r.referenceTitle,institution:r.authorInstitution,
  type:r.referenceType,year:r.year,url:r.url,sourceStatus:r.sourceStatus})),
 profiles:publicProfiles.map(p=>({country:p.country,profileType:p.profileType,overview:p.overview,
  contexts:p.mainDisplacementContexts||[],institutions:p.institutionalArchitecture||[],
  patterns:p.mainGovernancePatterns||[],opportunities:p.reformOpportunities||[],
  systems:p.priorityPublicSystems||[],refIds:p.keyReferenceIds||[],relatedRecordIds:p.relatedMappingRecordIds||[]})),
 researchQueue:[
  {id:'G1',theme:'Continuity',question:'When people move across categories or borders, which public responsibilities continue?',sources:'Review published laws, programme documents and evaluations.',output:'Research question'},
  {id:'G2',theme:'Ordinary public systems',question:'Under what conditions are refugees or displaced people included in health, education and social protection?',sources:'Use sector policies, published evaluations and comparative research.',output:'Research question'},
  {id:'G3',theme:'Development-induced displacement',question:'What happens to safeguards and livelihood responsibilities after a project closes?',sources:'Consult MDB safeguard documentation, project evaluations and independent studies.',output:'Research question'},
  {id:'G4',theme:'Fiscal architecture',question:'Which documented financing arrangements sustain the responsible institution over time?',sources:'Consult budgets, public expenditure reviews and development-finance operations.',output:'Research question'},
  {id:'G5',theme:'Conflict and solutions',question:'How do responsibilities shift from humanitarian response to recovery and ordinary service provision?',sources:'Consult IDMC, UNHCR, government strategies and evaluations.',output:'Research question'},
  {id:'G6',theme:'Evidence limitations',question:'What do available documents establish—and what remains unknown?',sources:'Record dated sources, differing interpretations and gaps.',output:'Research question'}
 ]
};
const stats=document.getElementById('stats');if(stats)stats.innerHTML=`<div class="stat"><strong>${DATA.records.length}</strong><span>mapping arrangements</span></div><div class="stat"><strong>${DATA.references.length}</strong><span>references</span></div><div class="stat"><strong>${DATA.profiles.length}</strong><span>country profiles</span></div>`;
const recordMap=new Map(DATA.records.map(r=>[r.id,r]));const refMap=new Map(DATA.references.map(r=>[r.id,r]));
const el=(s)=>document.querySelector(s);const all=(s)=>Array.from(document.querySelectorAll(s));
const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clip=(v,n=185)=>v.length>n?v.slice(0,n).replace(/\s+\S*$/,'')+'…':v;
const unique=(arr)=>[...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
const selected=new Set();let visible=10, active='explore',currentDetail=null;
function fill(id,values){const s=el(id);values.forEach(v=>{const opt=document.createElement('option');opt.value=v;opt.textContent=v;s.appendChild(opt)})}
fill('#geo',unique(DATA.records.flatMap(r=>r.geo)));fill('#system',unique(DATA.records.map(r=>r.system)));fill('#context',unique(DATA.records.flatMap(r=>r.contexts)));
function readFilters(){return{q:el('#query').value.trim().toLocaleLowerCase(),geo:el('#geo').value,system:el('#system').value,context:el('#context').value}}
function filtered(){const f=readFilters();return DATA.records.filter(r=>{const pool=[r.title,r.description,r.why,r.system,r.type,...r.geo,...r.contexts].join(' ').toLocaleLowerCase();return(!f.q||pool.includes(f.q))&&(!f.geo||r.geo.includes(f.geo))&&(!f.system||r.system===f.system)&&(!f.context||r.contexts.includes(f.context))})}
function render(){const items=filtered();el('#result-label').textContent=`${items.length} arrangement${items.length===1?'':'s'} · ${DATA.references.length} linked references`;
 el('#cards').innerHTML=items.length?items.slice(0,visible).map(r=>`<article class="entry"><div class="entry-top"><span class="geo">${safe(r.geo.join(' / '))}</span><span class="chip secondary">${safe(r.type)}</span></div><h3><a href="/mapping/${encodeURIComponent(r.slug)}">${safe(r.title)}</a></h3><p>${safe(clip(r.why||r.description,205))}</p><div class="entry-foot"><span class="chip">${safe(r.system)}</span>${r.contexts.slice(0,2).map(x=>`<span class="chip secondary">${safe(x)}</span>`).join('')}</div><div class="card-actions"><button class="read" data-open="${safe(r.id)}">Read the evidence <span aria-hidden="true">→</span></button><label class="select-compare"><input type="checkbox" data-compare="${safe(r.id)}" ${selected.has(r.id)?'checked':''} ${selected.size>=3&&!selected.has(r.id)?'disabled':''}> Compare</label></div></article>`).join(''):`<div class="empty"><h3>No matches found</h3><p>Try another term or remove a filter.</p><button class="outline-btn" data-reset="true">Clear filters</button></div>`;
 el('#more').hidden=visible>=items.length;updateCompare()}
function setTab(name){active=name;all('.tab').forEach(b=>{let yes=b.dataset.tab===name;b.classList.toggle('active',yes);b.setAttribute('aria-current',yes?'page':'false')});all('.view').forEach(v=>v.hidden=v.id!=='view-'+name);document.getElementById('main').scrollIntoView({block:'start',behavior:'instant'})}
const questions=['What governance problem does the arrangement address?','Which institution, policy or public-system arrangement exists?','How does it connect to ordinary public services and entitlements?','What published evidence exists about implementation and continuity?','What financing is documented, if materially relevant?','What constraints, plausible explanations and evidence gaps remain?'];
el('#six-questions').innerHTML=questions.map((q,i)=>`<div class="step"><b>0${i+1}</b><p>${safe(q)}</p></div>`).join('');
el('#research-questions').innerHTML=DATA.researchQueue.map(q=>`<article class="question"><div class="type">${safe(q.theme)} / Desk-review prompt</div><h3>${safe(q.question)}</h3><p><b>Suggested sources:</b> ${safe(q.sources)}</p><div class="actions"><span class="chip secondary">${safe(q.output)}</span><span class="chip secondary">Research prompt</span></div></article>`).join('');
el('#rail-questions').innerHTML=DATA.researchQueue.slice(0,3).map(q=>`<button class="question-link" data-tab-go="research"><span>${safe(q.theme)}</span>${safe(clip(q.question,100))}</button>`).join('');
const findprofile=country=>DATA.records.filter(r=>r.geo.includes(country));
el('#profiles').innerHTML=DATA.profiles.map(p=>`<article class="profile"><div class="geo">${safe(p.profileType||'Country context')}</div><h3>${safe(p.country)}</h3><p>${safe(clip(p.overview,220))}</p><small>${findprofile(p.country).length} linked editorial arrangements by geography</small><div style="margin-top:16px"><button data-profile="${safe(p.country)}">Read profile →</button></div></article>`).join('');
let previousFocus=null;let inertSiblings=[];function openDrawer(html,key){if(!currentDetail){previousFocus=document.activeElement;inertSiblings=Array.from(document.body.children).filter(n=>!['drawer','overlay'].includes(n.id)&&n.tagName!=='SCRIPT'&&!n.inert);inertSiblings.forEach(n=>n.inert=true)}currentDetail=key;el('#drawer').inert=false;el('#drawer-body').innerHTML=html;el('#overlay').classList.add('open');el('#drawer').classList.add('open');el('#drawer').setAttribute('aria-hidden','false');el('#overlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';el('#drawer-body').scrollTop=0;el('#close').focus()}
function closeDrawer(){el('#overlay').classList.remove('open');el('#drawer').classList.remove('open');el('#drawer').setAttribute('aria-hidden','true');el('#overlay').setAttribute('aria-hidden','true');document.body.style.overflow='';el('#drawer').inert=true;inertSiblings.forEach(n=>n.inert=false);inertSiblings=[];currentDetail=null;if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();previousFocus=null}
function openRecord(id){const r=recordMap.get(id);if(!r)return;const referenceRows=r.refIds.map(i=>refMap.get(i)).filter(Boolean);const sourceHtml=referenceRows.length?referenceRows.map(x=>`<div class="ref-item">${x.url&&/^https?:\/\//.test(x.url)?`<a href="${safe(x.url)}" target="_blank" rel="noopener noreferrer">${safe(x.title||x.id)} ↗</a>`:`<b>${safe(x.title||x.id)}</b>`}<a href="/mapping/references/${encodeURIComponent(x.slug)}">Reference details →</a><small>${safe([x.institution,x.year,x.type].filter(Boolean).join(' · '))}${x.sourceStatus?' · '+safe(x.sourceStatus):''}</small></div>`).join(''):'<p>No reference links recorded.</p>';
 openDrawer(`<div class="geo">${safe(r.geo.join(' / '))} · ${safe(r.system)}</div><h2 id="drawer-title">${safe(r.title)}</h2><div class="tagline">${r.contexts.map(x=>`<span class="chip">${safe(x)}</span>`).join('')}<span class="chip secondary">${safe(r.type)}</span></div><h3>Institutional arrangement</h3><p class="lead">${safe(r.description)}</p><h3>Why it matters</h3><p>${safe(r.why)}</p><h3>References and evidence</h3><p style="font-size:12px;color:var(--muted)">${referenceRows.length} editorial references. Links identify documentary sources; their existence does not constitute claim-by-claim verification.</p><div class="refs-list">${sourceHtml}</div><div class="divider"></div><div class="drawer-note">Sources linked to an entry provide documentary context; they should not be understood as independent verification of each statement. Read the underlying sources when interpreting findings.</div><div class="info-table"><b>Stable record ID</b><span>${safe(r.id)}</span><b>Published entry</b><span><a href="/mapping/${encodeURIComponent(r.slug||r.id)}">Open dedicated page</a></span></div>`,id)}
function openProfile(country){const p=DATA.profiles.find(p=>p.country===country);if(!p)return;let entries=findprofile(country);openDrawer(`<div class="geo">Country and governance context</div><h2 id="drawer-title">${safe(p.country)}</h2><p class="lead">${safe(p.overview)}</p><h3>Institutional architecture</h3><p>${p.institutions.length?p.institutions.map(safe).join('; '):'Not documented in the editorial profile.'}</p><h3>Governance patterns</h3><p>${p.patterns.length?p.patterns.map(safe).join('; '):'Not documented in the editorial profile.'}</p><h3>Reform opportunities</h3><p>${p.opportunities.length?p.opportunities.map(safe).join('; '):'Not documented in the editorial profile.'}</p><h3>Profile references</h3><div class="refs-list">${p.refIds.map(id=>refMap.get(id)).filter(Boolean).map(ref=>`<div class="ref-item"><a href="/mapping/references/${encodeURIComponent(ref.slug)}">${safe(ref.title)}</a></div>`).join('')||'<p>No references recorded.</p>'}</div><h3>Related editorial arrangements</h3><div class="refs-list">${entries.length?entries.map(r=>`<div class="ref-item"><a href="#record=${encodeURIComponent(r.id)}" data-open="${safe(r.id)}">${safe(r.title)} →</a></div>`).join(''):'<p>No corresponding entries by country label in the published dataset.</p>'}</div><div class="divider"></div><div class="drawer-note">Country narrative supplied by the approved country-profile dataset; consult sources when interpreting claims.</div>`,'profile:'+country)}
function updateCompare(){const bar=el('#compare-bar');bar.classList.toggle('show',selected.size>0);el('#compare-count').textContent=`${selected.size} of 3 arrangements selected for qualitative comparison`}
function doCompare(){const items=[...selected].map(id=>recordMap.get(id)).filter(Boolean);if(!items.length)return;openDrawer(`<div class="geo">Side-by-side thematic comparison</div><h2 id="drawer-title">Compare arrangements</h2><p>Comparison of authored descriptions and implications only; not a diagnostic rating.</p>${items.map(r=>`<div class="divider"></div><h3>${safe(r.geo.join(' / '))} · ${safe(r.system)}</h3><h2 style="font-size:24px;margin-bottom:13px">${safe(r.title)}</h2><p>${safe(r.why)}</p><div class="tagline">${r.contexts.map(x=>`<span class="chip secondary">${safe(x)}</span>`).join('')}</div>`).join('')}<div class="divider"></div><div class="drawer-note">Differences in available documentation should not be mistaken for differences in governance performance. For a diagnostic comparison, consult linked primary sources.</div>`,'compare')}
function resetFilters(){el('#query').value='';['#geo','#system','#context'].forEach(id=>el(id).value='');visible=10;render()}
all('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));['#query','#geo','#system','#context'].forEach(id=>el(id).addEventListener(id==='#query'?'input':'change',()=>{visible=10;render()}));el('#reset').addEventListener('click',resetFilters);el('#more').addEventListener('click',()=>{visible+=10;render()});el('#method-link').addEventListener('click',()=>setTab('about'));el('#about-method').addEventListener('click',()=>setTab('about'));el('#close').addEventListener('click',closeDrawer);el('#overlay').addEventListener('click',closeDrawer);
el('#compare-open').addEventListener('click',doCompare);el('#compare-clear').addEventListener('click',()=>{selected.clear();render()});
document.addEventListener('change',e=>{if(e.target.matches('[data-compare]')){let id=e.target.dataset.compare;e.target.checked?selected.add(id):selected.delete(id);render()}});
document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){e.preventDefault();openRecord(open.dataset.open);return}const prof=e.target.closest('[data-profile]');if(prof){openProfile(prof.dataset.profile);return}const go=e.target.closest('[data-tab-go]');if(go){setTab(go.dataset.tabGo);return}if(e.target.matches('[data-reset]'))resetFilters()});
document.addEventListener('keydown',e=>{
 if(!currentDetail)return;
 if(e.key==='Escape'){closeDrawer();return}
 if(e.key==='Tab'){
  const buttons=Array.from(el('#drawer').querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])'));
  if(!buttons.length)return;
  const first=buttons[0],last=buttons[buttons.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
render();const hash=decodeURIComponent(location.hash.replace(/^#record=/,''));if(recordMap.has(hash))openRecord(hash);
})();
