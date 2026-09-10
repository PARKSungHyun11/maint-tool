import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const html = read("index.html");
const app = read("app.jsx");
const core = read("lib/core.js");
const serviceWorker = read("sw.js");

function pngSize(path) {
  const buffer = readFileSync(join(root, path));
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${path} is not a PNG`,
  );
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
}

test("manifest icon declarations match real PNG dimensions", () => {
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(root, icon.src)), `missing icon ${icon.src}`);
    if (icon.type === "image/png") assert.equal(pngSize(icon.src), icon.sizes, icon.src);
  }
});

test("only purpose-built files may claim the maskable safe zone", () => {
  for (const icon of manifest.icons) {
    if (String(icon.purpose).split(/\s+/).includes("maskable")) {
      assert.match(icon.src, /maskable/, `${icon.src} is not a dedicated maskable asset`);
    }
  }
  assert.ok(manifest.icons.some((icon) => String(icon.purpose).split(/\s+/).includes("any")));
});

test("the Apple touch icon is a committed PNG", () => {
  const tag = html.match(/<link[^>]+rel="apple-touch-icon"[^>]*>/)?.[0];
  assert.ok(tag, "missing apple-touch-icon");
  const href = tag.match(/href="([^"]+)"/)?.[1];
  assert.match(href, /\.png$/);
  assert.ok(existsSync(join(root, href)), `missing ${href}`);
});

test("the viewport does not disable user zoom", () => {
  const viewport = html.match(/<meta[^>]+name="viewport"[^>]*>/)?.[0] ?? "";
  assert.ok(viewport, "missing viewport metadata");
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(viewport, /maximum-scale\s*=\s*1(?:\.0)?/i);
});

test("the app consumes pure calculation helpers instead of redefining them", () => {
  for (const name of ["calcDuePair", "getOffsetMs", "getPartsInZone", "makeLengthConversion"]) {
    assert.match(app, new RegExp(`import[\\s\\S]*?${name}[\\s\\S]*?from \\\"\\./lib/core\\.js\\\"`));
    assert.doesNotMatch(app, new RegExp(`(?:function|const)\\s+${name}\\b`));
  }
});

test("the calculation core stays browser- and framework-independent", () => {
  const executableCore = core
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of ["document.", "window.", "localStorage", "React"]) {
    assert.equal(executableCore.includes(forbidden), false, forbidden);
  }
});

test("every service-worker precache entry exists", () => {
  const staticBlock = serviceWorker.match(/const STATIC = \[([\s\S]*?)\];/)?.[1] ?? "";
  const entries = [...staticBlock.matchAll(/assetUrl\('\.\/([^']*)'\)/g)]
    .map((match) => match[1])
    .filter(Boolean);
  for (const entry of entries) assert.ok(existsSync(join(root, entry)), entry);
});

// The publish directory drifted once: netlify.toml still said "." long after
// the build started emitting dist/, so the deploy served the repository root —
// where config.js is gitignored and 404s, and ios/, android/, src/, tests/ and
// supabase/ are all reachable. These three have to name the same directory.
test("the build output, Netlify publish dir and Capacitor webDir agree", () => {
  const buildScript = read("scripts/build.mjs");
  const outDir = buildScript.match(/await mkdir\("([^"]+)"/)?.[1];
  assert.ok(outDir, "could not find the build output directory in scripts/build.mjs");

  const publishDir = read("netlify.toml").match(/^\s*publish\s*=\s*"([^"]+)"/m)?.[1];
  assert.equal(publishDir, outDir, "netlify.toml publish must be the build output directory");

  const { webDir } = JSON.parse(read("capacitor.config.json"));
  assert.equal(webDir, outDir, "capacitor.config.json webDir must be the build output directory");
});

// A deploy serves only the publish directory, so anything index.html asks for
// has to be copied into it. config.js is the one that bites: it is gitignored,
// and the build substitutes config.example.js for it.
test("the publish directory carries every local asset index.html references", () => {
  const buildScript = read("scripts/build.mjs");
  const outDir = buildScript.match(/await mkdir\("([^"]+)"/)?.[1];
  if (!existsSync(join(root, outDir))) return; // built by `pnpm run verify` before tests

  const referenced = [...html.matchAll(/(?:src|href)="(?!https?:|data:|#|\/\/)([^"?#]+)/g)]
    .map((match) => match[1])
    .filter((path) => !path.startsWith("/"));

  assert.ok(referenced.length > 0, "no local assets found in index.html");
  for (const asset of new Set(referenced)) {
    assert.ok(existsSync(join(root, outDir, asset)), `${outDir}/${asset} is missing from the build`);
  }
});
