#!/usr/bin/env node
/**
 * Runs every tests/*.test.js and exits non-zero on the first failure.
 * Dependency-free and offline: `node tests/run.js` works on a fresh clone.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const harness = require("./harness");

const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).sort();
if (files.length === 0) {
  console.error("no test files found");
  process.exit(1);
}
for (const f of files) require(path.join(__dirname, f));

process.exit(harness.run() === 0 ? 0 : 1);
