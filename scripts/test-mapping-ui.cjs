// Run after npm run build. Uses Playwright with the installed Edge browser on Windows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const browserRequire = process.env.DP_BROWSER_NODE_MODULES
  ? createRequire(path.join(process.env.DP_BROWSER_NODE_MODULES, 'package.json')) : require;
const { chromium } = browserRequire('playwright');
const root = path.resolve(__dirname, '..', 'public');
const routes = require('../vercel.json').routes;
const records = require('../data/mapping/mapping-records.json').records;
const refs = require('../data/mapping/mapping-references.json').references;
const profiles = require('../data/mapping/mapping-country-profiles.json').countries;
const errors = [];
const preview = Boolean(process.env.DP_TEST_PREVIEW);
const cookies = process.env.DP_TEST_COOKIE_FILE ? fs.readFileSync(process.env.DP_TEST_COOKIE_FILE,'utf8').split('\n').map(line=>line.trim()).filter(line=>line.split('\t').length===7 && (!line.startsWith('#') || line.startsWith('#HttpOnly_'))).map(line=>{
  const [domain, ,cookiePath,secure,expires,name,value]=line.trim().split('\t');
  return {domain:domain.replace('#HttpOnly_',''),path:cookiePath,secure:secure==='TRUE',expires:Number(expires)||-1,name,value,httpOnly:domain.startsWith('#HttpOnly_')};
}) : [];
const mime = {'.html':'text/html; charset=utf-8','.json':'application/json','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const redirect = routes.find(r => r.src === pathname && r.status);
  if (redirect) { res.writeHead(redirect.status, redirect.headers); return res.end(); }
  const rewrite = routes.find(r => r.src === pathname && r.dest);
  let file = path.join(root, rewrite?.dest || (pathname === '/' ? 'index.html' : pathname));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file+'.html')) file += '.html';
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) {res.writeHead(404);return res.end();}
  res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const local = `http://127.0.0.1:${server.address().port}`;
  const origin = process.env.DP_TEST_ORIGIN || local;
  const browser = await chromium.launch({headless:true, ...(process.env.DP_BROWSER_EXECUTABLE ? {executablePath:process.env.DP_BROWSER_EXECUTABLE} : {channel:'msedge'})});
  try {
    for (const width of [1440,390,320]) {
      const page = await browser.newPage({viewport:{width,height:900}, reducedMotion:'reduce'});
      if(cookies.length) await page.context().addCookies(cookies);
      page.on('pageerror', e=>errors.push(e.message));
      await page.goto(origin+'/mapping');
      await page.waitForFunction(()=>document.querySelector('#result-label').textContent.startsWith('33 arrangements'));
      assert.equal(await page.locator('#cards .entry').count(),10);
      assert.equal(await page.locator('#drawer').evaluate(n=>n.inert),true);
      await page.locator('#query').fill('DTSEN');
      await page.waitForFunction(()=>document.querySelector('#result-label').textContent.startsWith('1 arrangement'));
      await page.locator('[data-open="indonesia-dtsen"]').click();
      assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'false');
      assert.ok(await page.locator('#drawer a[href^="https://"]').count()>0);
      assert.ok(await page.locator('#drawer a[href^="/mapping/references/"]').count()>0);
      assert.equal(await page.locator('#close').evaluate(n=>n===document.activeElement),true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator('#drawer a').last().evaluate(n=>n===document.activeElement),true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#close').evaluate(n=>n===document.activeElement),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-open="indonesia-dtsen"]').evaluate(n=>n===document.activeElement),true);
      await page.locator('#reset').click();
      await page.locator('#more').click();
      assert.equal(await page.locator('#cards .entry').count(),20);
      await page.locator('#geo').selectOption('Indonesia');
      const expected = records.filter(r=>r.countryRegion.includes('Indonesia'));
      assert.equal(await page.locator('#cards .entry').count(),expected.length);
      await page.locator('#system').selectOption(expected[0].publicSystem);
      await page.locator('#context').selectOption(expected[0].displacementContext[0]);
      const narrowed=expected.filter(r=>r.publicSystem===expected[0].publicSystem&&r.displacementContext.includes(expected[0].displacementContext[0]));
      assert.equal(await page.locator('#cards .entry').count(),narrowed.length);
      await page.locator('#query').fill('zz-no-matching-arrangement');
      await page.locator('[data-reset]').click();
      await page.locator('[data-compare]').nth(0).check();
      await page.locator('[data-compare]').nth(1).check();
      await page.locator('#compare-open').click();
      assert.equal(await page.locator('#drawer-title').innerText(),'Compare arrangements');
      await page.keyboard.press('Escape');
      await page.locator('#compare-clear').click();
      await page.locator('[data-tab="countries"]').click();
      assert.equal(await page.locator('#profiles .profile').count(),profiles.length);
      await page.locator('[data-profile="Indonesia"]').click();
      assert.equal(await page.locator('#drawer-title').innerText(),'Indonesia');
      assert.ok(await page.locator('#drawer a[href^="/mapping/references/"]').count()>0);
      await page.keyboard.press('Escape');
      await page.locator('[data-tab="research"]').click();
      assert.equal(await page.locator('#research-questions .question').count(),6);
      await page.locator('[data-tab="about"]').click();
      assert.equal(await page.locator('#six-questions .step').count(),6);
      if(width<=820){await page.locator('.nav-toggle').click();assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'true');}
      for(const href of ['/research','/mapping','/perspectives','/publications','/about']) assert.ok(await page.locator(`.site-nav a[href="${href}"]`).isVisible());
      if(width<=820) await page.locator('.nav-toggle').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await page.locator('[data-tab="explore"]').click();
      await page.screenshot({path:path.resolve(process.env.DP_TEST_ARTIFACTS||'.',`mapping-${width}.png`),fullPage:true});
      await page.goto(origin+'/mapping/indonesia-dtsen');
      assert.equal(await page.title(),'Indonesia DTSEN (National Socio-Economic Single Data) | Displacement Policy');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),(preview?origin:'https://displacementpolicy.org')+'/mapping/indonesia-dtsen');
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),preview?'noindex, nofollow':'index, follow');
      await page.close();
      console.log(`PASS ${width}px: search, combined filters, pagination, comparison, profiles, references, keyboard, navigation, DTSEN SEO`);
    }
    const context=await browser.newContext();
    if(cookies.length) await context.addCookies(cookies);
    const checkRoutes=['/mapping/references','/mapping/methodology',...records.map(r=>'/mapping/'+r.slug),...refs.map(r=>'/mapping/references/'+r.slug)];
    for(let offset=0;offset<checkRoutes.length;offset+=8) {
      await Promise.all(checkRoutes.slice(offset,offset+8).map(async route=>{
        const response=await context.request.get(origin+route);
        assert.equal(response.status(),200,route);
      }));
    }
    const redirect=await context.request.get(origin+'/mapping/indonesia-dtks-siks-ng',{maxRedirects:0});
    assert.equal(redirect.status(),308);
    assert.equal(redirect.headers().location,'/mapping/indonesia-dtsen');
    assert.deepEqual(errors,[]);
    console.log('PASS all record/reference routes and DTKS 308; no browser errors');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
