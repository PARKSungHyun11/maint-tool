#!/usr/bin/env node
/**
 * Renders the SVG sources to the PNG icons the manifest and iOS need.
 *
 *   node tools/build-icons.js
 *
 * The PNGs are generated artefacts: edit icon.svg / icon-maskable.svg and
 * re-run this, never hand-edit or hand-copy the PNGs. (icon-512.png was once
 * a copy of the 192px file, which is exactly what this script prevents.)
 *
 * Needs Playwright's Chromium. Everything runs locally — no network.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const TARGETS = [
  { svg: "icon.svg", out: "icon-180.png", size: 180 }, // iOS apple-touch-icon
  { svg: "icon.svg", out: "icon-192.png", size: 192 },
  { svg: "icon.svg", out: "icon-512.png", size: 512 },
  { svg: "icon-maskable.svg", out: "icon-maskable-512.png", size: 512 },
];

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("playwright is not installed. Run: npm install");
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    for (const { svg, out, size } of TARGETS) {
      const source = fs.readFileSync(path.join(ROOT, svg), "utf8");
      const page = await browser.newPage({
        viewport: { width: size, height: size },
        deviceScaleFactor: 1,
      });
      await page.setContent(
        `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
        { waitUntil: "load" }
      );
      await page.screenshot({
        path: path.join(ROOT, out),
        clip: { x: 0, y: 0, width: size, height: size },
        omitBackground: true,
      });
      await page.close();

      const buf = fs.readFileSync(path.join(ROOT, out));
      console.log(`  ${out.padEnd(24)} ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}  ${buf.length} bytes`);
    }
  } finally {
    await browser.close();
  }
  console.log("\nicons rebuilt. Run `npm test` to check the manifest still matches.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
