import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = resolve(root, "public");
const siteOrigin = "https://displacementpolicy.org";
const isProduction = process.env.VERCEL_ENV === "production" || process.env.DP_EXCLUDE_UNPUBLISHED === "1";
const obsoleteSitemapPaths = new Set([
  "/mapping/oecd-social-protection-for-forcibly-displaced",
  "/mapping/adb-safeguards-environmental-social-framework"
]);

const rootFiles = [
  "index.html",
  "about.html",
  "research.html",
  "perspectives.html",
  "publications.html",
  "mapping.html",
  "footer.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml"
];

const directories = [
  "assets",
  "images",
  "blogposts",
  "perspectives",
  "publications",
  "research",
  "mapping"
];

function isPublishedPerspective(item) {
  return item?.published !== false && item?.status !== "draft" && item?.status !== "unpublished";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function publicRouteExists(routePath) {
  if (routePath === "/") {
    return fileExists(resolve(outDir, "index.html"));
  }

  const cleanPath = routePath.replace(/^\/+/, "");
  return (
    await fileExists(resolve(outDir, `${cleanPath}.html`)) ||
    await fileExists(resolve(outDir, cleanPath, "index.html"))
  );
}

function removeUnpublishedPerspectiveFromHtml(html, item) {
  const hrefPattern = escapeRegExp(item.href);
  const articlePattern = new RegExp(`<article class="perspective-list-item">[\\s\\S]*?href="${hrefPattern}"[\\s\\S]*?<\\/article>\\s*`, "g");
  let nextHtml = html.replace(articlePattern, "");

  nextHtml = nextHtml.replace(
    /(<script type="application\/json" id="perspectives-data">\s*)([\s\S]*?)(\s*<\/script>)/,
    (match, open, json, close) => {
      const data = JSON.parse(json);
      return `${open}${JSON.stringify(data.filter((entry) => entry.slug !== item.slug), null, 4)}${close}`;
    }
  );

  nextHtml = nextHtml.replace(
    /(<script type="application\/ld\+json">\s*)([\s\S]*?)(\s*<\/script>)/,
    (match, open, json, close) => {
      const data = JSON.parse(json);
      if (Array.isArray(data.hasPart)) {
        data.hasPart = data.hasPart.filter((part) => part.url !== `${siteOrigin}${item.href}`);
      }
      return `${open}${JSON.stringify(data, null, 8)}${close}`;
    }
  );

  return nextHtml;
}

async function removeUnpublishedPerspective(item) {
  await rm(resolve(outDir, "perspectives", `${item.slug}.html`), { force: true });

  for (const indexPath of [
    resolve(outDir, "perspectives.html"),
    resolve(outDir, "perspectives", "index.html")
  ]) {
    if (await fileExists(indexPath)) {
      const html = await readFile(indexPath, "utf8");
      await writeFile(indexPath, removeUnpublishedPerspectiveFromHtml(html, item));
    }
  }
}

async function writeSitemap(perspectives) {
  const sitemapPath = resolve(outDir, "sitemap.xml");
  const sitemap = await readFile(sitemapPath, "utf8");
  const locMatches = [...sitemap.matchAll(/<loc>https:\/\/displacementpolicy\.org([^<]*)<\/loc>/g)];
  const sitemapPaths = locMatches.map((match) => match[1]);
  const unpublishedPerspectivePaths = new Set(
    perspectives.filter((item) => !isPublishedPerspective(item)).map((item) => item.href)
  );
  const nextPaths = [];
  const seen = new Set();

  for (const routePath of sitemapPaths) {
    if (
      seen.has(routePath) ||
      obsoleteSitemapPaths.has(routePath) ||
      unpublishedPerspectivePaths.has(routePath)
    ) {
      continue;
    }

    if (await publicRouteExists(routePath)) {
      seen.add(routePath);
      nextPaths.push(routePath);
    }
  }

  for (const item of perspectives.filter(isPublishedPerspective)) {
    if (!seen.has(item.href) && await publicRouteExists(item.href)) {
      seen.add(item.href);
      nextPaths.push(item.href);
    }
  }

  const urls = nextPaths
    .map((routePath) => `  <url>\n    <loc>${siteOrigin}${routePath}</loc>\n  </url>`)
    .join("\n");

  await writeFile(
    sitemapPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const file of rootFiles) {
  await cp(resolve(root, file), resolve(outDir, file));
}

for (const directory of directories) {
  await cp(resolve(root, directory), resolve(outDir, directory), { recursive: true });
}

await mkdir(resolve(outDir, "data"), { recursive: true });
await cp(resolve(root, "data", "mapping"), resolve(outDir, "data", "mapping"), { recursive: true });

const perspectives = JSON.parse(await readFile(resolve(root, "data", "perspectives.json"), "utf8"));

if (isProduction) {
  for (const item of perspectives.filter((entry) => !isPublishedPerspective(entry))) {
    await removeUnpublishedPerspective(item);
  }
}

await writeSitemap(perspectives);

console.log("Built Vercel public output directory.");
