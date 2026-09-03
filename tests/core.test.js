import assert from "node:assert/strict";
import test from "node:test";

import {
  calcDuePair,
  getPartsInZone,
  makeLengthConversion,
  zonedDateToUtc,
} from "../lib/core.js";

const pad = (value) => String(value).padStart(2, "0");

function wall(date, zone) {
  const parts = getPartsInZone(date, zone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

test("local due dates remain at 23:59 across DST transitions", () => {
  const cases = [
    ["America/Toronto", "2026-02-15", "D", null, "2026-06-15 23:59"],
    ["Europe/Paris", "2026-03-20", "C", null, "2026-03-30 23:59"],
    ["Australia/Sydney", "2026-09-20", "A", "30", "2026-10-20 23:59"],
    ["America/Santiago", "2026-08-01", "A", "30", "2026-08-31 23:59"],
    ["Europe/London", "2026-03-25", "B", null, "2026-03-28 23:59"],
  ];

  for (const [zone, date, type, days, expected] of cases) {
    const { local } = calcDuePair(type, days, true, date, zone, "LOCAL");
    assert.equal(wall(local, zone), expected, `${zone} ${type} from ${date}`);
  }
});

test("UTC and non-DST calculations keep their established results", () => {
  const utc = calcDuePair("D", null, true, "2026-02-15", "America/Toronto", "UTC").utc;
  assert.equal(wall(utc, "UTC"), "2026-06-15 23:59");

  const seoul = calcDuePair("D", null, true, "2026-02-15", "Asia/Seoul", "LOCAL").local;
  assert.equal(wall(seoul, "Asia/Seoul"), "2026-06-15 23:59");
});

test("maintenance interval types retain their existing day counts", () => {
  const from = (type, days, date) => wall(
    calcDuePair(type, days, true, date, "UTC", "UTC").utc,
    "UTC",
  );

  assert.equal(from("B", null, "2026-01-01"), "2026-01-04 23:59");
  assert.equal(from("C", null, "2026-01-01"), "2026-01-11 23:59");
  assert.equal(from("D", null, "2026-01-01"), "2026-05-01 23:59");
  assert.equal(from("MOI", null, "2026-01-01"), "2026-08-29 23:59");
  assert.equal(from("A", "45", "2026-01-01"), "2026-02-15 23:59");
});

test("NEF preserves the current 29 FEB to 01 MAR policy", () => {
  const due = calcDuePair("NEF", null, true, "2024-02-29", "UTC", "UTC").utc;
  assert.equal(wall(due, "UTC"), "2026-03-01 23:59");
});

test("today mode is deterministic when a clock is supplied", () => {
  const now = new Date("2026-03-07T12:00:00Z");
  const pair = calcDuePair("C", null, false, "", "America/Toronto", "UTC", now);
  assert.equal(wall(pair.utc, "UTC"), "2026-03-17 23:59");
  assert.equal(wall(pair.local, "America/Toronto"), "2026-03-17 23:59");
});

test("zonedDateToUtc round-trips wall-clock deadlines", () => {
  for (const zone of ["UTC", "Asia/Seoul", "America/Toronto", "Europe/Paris", "Australia/Sydney"]) {
    const instant = new Date(zonedDateToUtc(2026, 5, 15, 23, 59, zone));
    assert.equal(wall(instant, zone), "2026-06-15 23:59", zone);
  }
});

test("centimetres are converted through inches instead of treated as inches", () => {
  assert.ok(Math.abs(makeLengthConversion(254, "cm").baseInch - 100) < 1e-9);
  assert.equal(makeLengthConversion(1, "ft").baseInch, 12);
  assert.equal(makeLengthConversion(5, "inch").baseInch, 5);
});
