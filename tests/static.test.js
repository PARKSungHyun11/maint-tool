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
