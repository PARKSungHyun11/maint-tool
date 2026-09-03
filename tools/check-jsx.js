#!/usr/bin/env node
/**
 * Parses the JSX bundle inside index.html and reports syntax errors.
 *
 *   node tools/check-jsx.js
 *
 * The app has no build step — Babel compiles the bundle in the browser — so a
 * syntax error there is invisible until the page renders blank. TypeScript is
 * used purely as a parser here; no type checking is performed.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

function loadTypeScript() {
  try {
    return require("typescript");
  } catch {}
  // Fall back to a global install (npm root -g), so this works without
  // `npm install` on a machine that already has tsc.
  try {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    return require(path.join(root, "typescript"));
  } catch {}
  return null;
}

const ts = loadTypeScript();
if (!ts) {
  console.log("check-jsx: typescript not found — skipping. Run `npm install` to enable this check.");
  process.exit(0);
}

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const match = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!match) {
  console.error("check-jsx: no <script type=\"text/babel\"> block found in index.html");
  process.exit(1);
}

// Line offset so reported positions map back onto index.html.
const offset = html.slice(0, match.index).split("\n").length;
const source = ts.createSourceFile("index.html.jsx", match[1], ts.ScriptTarget.ES2020, true, ts.ScriptKind.JSX);

const diagnostics = source.parseDiagnostics || [];
if (diagnostics.length) {
  for (const d of diagnostics) {
    const { line, character } = source.getLineAndCharacterOfPosition(d.start);
    const message = ts.flattenDiagnosticMessageText(d.messageText, " ");
    console.error(`index.html:${offset + line}:${character + 1}  ${message}`);
  }
  console.error(`\ncheck-jsx: ${diagnostics.length} syntax error(s)`);
  process.exit(1);
}

console.log(`check-jsx: ${match[1].split("\n").length} lines of JSX parsed cleanly`);
