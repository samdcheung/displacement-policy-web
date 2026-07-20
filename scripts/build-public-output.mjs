import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = resolve(root, "public");

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

console.log("Built Vercel public output directory.");
