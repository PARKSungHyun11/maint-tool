"use strict";

const fs = require("fs");
const path = require("path");
const { describe, it, eq, ok } = require("./harness");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const html = read("index.html");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.json"));

/** Width/height straight out of a PNG's IHDR chunk. */
function pngSize(file) {
  const buf = fs.readFileSync(path.join(ROOT, file));
  ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("manifest", () => {
  it("declares the fields an install prompt needs", () => {
    for (const key of ["name", "short_name", "start_url", "scope", "display", "icons"]) {
      ok(manifest[key] !== undefined, `manifest is missing ${key}`);
    }
    eq(manifest.display, "standalone");
  });

  it("uses relative paths so a GitHub Pages subpath works", () => {
    for (const key of ["start_url", "scope"]) {
      ok(!manifest[key].startsWith("/"), `${key} must stay relative, got ${manifest[key]}`);
    }
    for (const icon of manifest.icons) {
      ok(!icon.src.startsWith("/"), `icon src must stay relative, got ${icon.src}`);
    }
  });

  it("points every icon at a file that exists", () => {
    for (const icon of manifest.icons) ok(exists(icon.src), `missing icon file ${icon.src}`);
  });

  // Regression: icon-512.png was once a byte-for-byte copy of the 192px file,
  // so the manifest promised a size the asset could not deliver.
  it("declares sizes that match the real pixel dimensions", () => {
    for (const icon of manifest.icons) {
      if (!icon.src.endsWith(".png")) continue;
      const { width, height } = pngSize(icon.src);
      eq(`${width}x${height}`, icon.sizes, `${icon.src} pixel size vs declared sizes`);
    }
  });

  // An "any"-sized SVG is not enough here: Android builds the splash screen
  // from a raster icon, and this is the asset that regressed before.
  it("ships a raster icon of at least 512px for the install prompt and splash", () => {
    const big = manifest.icons.some((icon) => icon.src.endsWith(".png") && pngSize(icon.src).width >= 512);
    ok(big, "manifest has no PNG icon >= 512px");
  });

  // A maskable icon gets cropped to a circle; art that fills the square loses
  // its edges. Only assets drawn with the safe zone in mind may claim it.
  it("only claims 'maskable' for purpose-built assets", () => {
    for (const icon of manifest.icons) {
      if (!String(icon.purpose || "").includes("maskable")) continue;
      ok(/maskable/.test(icon.src), `${icon.src} claims maskable but is not a maskable asset`);
    }
  });

  it("has at least one plain 'any' icon", () => {
    ok(manifest.icons.some((i) => String(i.purpose || "any").split(/\s+/).includes("any")),
      "no icon usable outside a maskable context");
  });
});

describe("index.html", () => {
  it("loads the shared core before the app bundle", () => {
    const core = html.indexOf('src="lib/core.js"');
    const babel = html.indexOf('type="text/babel"');
    ok(core !== -1, "lib/core.js is not loaded");
    ok(core < babel, "lib/core.js must load before the JSX bundle");
  });

  // Safari ignores an SVG apple-touch-icon and falls back to a screenshot.
  it("uses a PNG for apple-touch-icon", () => {
    const m = html.match(/<link[^>]+rel="apple-touch-icon"[^>]*>/g) || [];
    ok(m.length > 0, "no apple-touch-icon link");
    for (const tag of m) {
      const href = (tag.match(/href="([^"]+)"/) || [])[1];
      ok(href && href.endsWith(".png"), `apple-touch-icon must be a PNG, got ${href}`);
      ok(exists(href), `apple-touch-icon file missing: ${href}`);
    }
  });

  // Destructuring a key the core does not export yields `undefined` instead of
  // throwing, so a typo here becomes a blank tab at runtime rather than a build
  // error. tsc cannot catch it either — this can.
  it("only destructures names the core actually exports", () => {
    const block = html.match(/const \{([^{}]*)\} = MaintCore;/);
    ok(block, "no `= MaintCore` destructuring found in index.html");
    const names = block[1]
      .replace(/\/\/.*$/gm, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    ok(names.length > 10, `expected the core binding list, got ${names.length} names`);
    const exported = new Set(Object.keys(require("../lib/core.js")));
    for (const name of names) ok(exported.has(name), `index.html binds ${name}, which lib/core.js does not export`);
  });

  it("does not redefine anything the core already provides", () => {
    const jsx = (html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/) || [])[1] || "";
    const body = jsx.slice(jsx.indexOf("} = MaintCore;"));
    for (const name of Object.keys(require("../lib/core.js"))) {
      const dup = new RegExp(`^(?:function ${name}\\s*\\(|const ${name}\\s*=)`, "m");
      ok(!dup.test(body), `${name} is defined in both lib/core.js and index.html`);
    }
  });

  it("links the manifest", () => {
    ok(/<link[^>]+rel="manifest"[^>]+href="manifest\.json"/.test(html), "manifest link missing");
  });

  // If a CDN script fails the page renders nothing at all, so the app has to
  // say something rather than show a white rectangle.
  it("shows a fallback when the CDN scripts fail", () => {
    ok(html.includes("cdn-fallback"), "no cdn-fallback element in index.html");
    ok(/MaintCore|React/.test(html), "fallback check does not test for a loaded global");
  });

  it("keeps every referenced local asset present", () => {
    const refs = [...html.matchAll(/(?:src|href)="(?!https?:|#|data:)([^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) ok(exists(ref), `index.html references a missing file: ${ref}`);
  });
});

describe("lib/core.js", () => {
  // Comments are allowed to name these; the code is not.
  const core = read("lib/core.js")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  it("stays free of DOM and React so it can run under Node", () => {
    for (const banned of ["document.", "window.", "localStorage", "React"]) {
      ok(!core.includes(banned), `lib/core.js must not touch ${banned}`);
    }
  });

  it("loads cleanly in Node", () => {
    const api = require("../lib/core.js");
    ok(typeof api.calcDuePair === "function");
    ok(Object.keys(api).length > 20);
  });
});

describe("service worker", () => {
  it("precaches only files that exist", () => {
    // caches.addAll rejects as a unit, so one missing entry kills the install.
    const listed = [...sw.matchAll(/assetUrl\('\.\/([^']*)'\)/g)].map((m) => m[1]).filter(Boolean);
    for (const file of listed) ok(exists(file), `sw.js precaches a missing file: ${file}`);
  });

  it("precaches the shared core", () => {
    ok(sw.includes("lib/core.js"), "sw.js must precache lib/core.js or the app breaks offline");
  });

  it("keeps html network-first so deploys are visible", () => {
    ok(/\.html/.test(sw) && sw.includes("fetch(e.request)"), "html should be served network-first");
  });
});
