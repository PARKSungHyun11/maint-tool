/**
 * A ~50 line test harness. No dependencies on purpose: `node tests/run.js`
 * has to work on a fresh clone, offline, for whichever agent picks up the repo.
 */
"use strict";

const suites = [];
let current = null;

function describe(name, fn) {
  current = { name, tests: [] };
  suites.push(current);
  fn();
  current = null;
}

function it(name, fn) {
  if (!current) throw new Error("it() outside describe()");
  current.tests.push({ name, fn });
}

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + ": " : ""}expected ${e}, got ${a}`);
}

function ok(value, msg) {
  if (!value) throw new Error(msg || `expected truthy, got ${JSON.stringify(value)}`);
}

function run() {
  let passed = 0;
  const failures = [];
  for (const suite of suites) {
    console.log(`\n  ${suite.name}`);
    for (const t of suite.tests) {
      try {
        t.fn();
        passed++;
        console.log(`    \x1b[32m✓\x1b[0m ${t.name}`);
      } catch (err) {
        failures.push({ suite: suite.name, test: t.name, err });
        console.log(`    \x1b[31m✗\x1b[0m ${t.name}`);
        console.log(`        ${err.message}`);
      }
    }
  }
  console.log(
    `\n  ${passed} passed, ${failures.length} failed\n`
  );
  return failures.length;
}

module.exports = { describe, it, eq, ok, run };
