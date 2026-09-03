"use strict";

const { describe, it, eq, ok } = require("./harness");
const C = require("../lib/core.js");

const pad = (n) => String(n).padStart(2, "0");

/** Wall-clock reading of an instant in a zone, e.g. "2026-06-15 23:59". */
function wall(date, zone) {
  const p = C.getPartsInZone(date, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

function close(actual, expected, eps, msg) {
  if (Math.abs(actual - expected) > (eps ?? 1e-9)) {
    throw new Error(`${msg ? msg + ": " : ""}expected ~${expected}, got ${actual}`);
  }
}

// ── The bug this suite exists for ────────────────────────────────────────────
// A due date is a calendar deadline. Adding days * 24h to the instant drifts by
// an hour across a DST change, turning 23:59 into 00:59 and reporting the due
// date one day late. Every case below crosses a spring-forward transition.
describe("calcDuePair — DST transitions must not move the due date", () => {
  const cases = [
    ["America/Toronto", "2026-02-15", "D", "2026-06-15 23:59"],
    ["Europe/Paris", "2026-03-20", "C", "2026-03-30 23:59"],
    ["Australia/Sydney", "2026-09-20", "A", "2026-10-20 23:59"],
    ["America/Santiago", "2026-08-01", "A", "2026-08-31 23:59"],
    ["Europe/London", "2026-03-25", "B", "2026-03-28 23:59"],
  ];
  for (const [zone, date, type, expected] of cases) {
    it(`${zone} ${type} from ${date}`, () => {
      const days = type === "A" ? "30" : null;
      const { local } = C.calcDuePair(type, days, true, date, zone, "LT");
      eq(wall(local, zone), expected);
    });
  }

  it("zones without DST are unaffected", () => {
    const { local } = C.calcDuePair("D", null, true, "2026-02-15", "Asia/Seoul", "LT");
    eq(wall(local, "Asia/Seoul"), "2026-06-15 23:59");
  });

  it("the UTC row stays on 23:59 UTC", () => {
    const { utc } = C.calcDuePair("D", null, true, "2026-02-15", "America/Toronto", "UTC");
    eq(wall(utc, "UTC"), "2026-06-15 23:59");
  });
});

describe("calcDuePair — interval types", () => {
  const from = (type, days, date) => wall(C.calcDuePair(type, days, true, date, "UTC", "UTC").utc, "UTC");

  it("B is 3 days", () => eq(from("B", null, "2026-01-01"), "2026-01-04 23:59"));
  it("C is 10 days", () => eq(from("C", null, "2026-01-01"), "2026-01-11 23:59"));
  it("D is 120 days", () => eq(from("D", null, "2026-01-01"), "2026-05-01 23:59"));
  it("MOI is 240 days", () => eq(from("MOI", null, "2026-01-01"), "2026-08-29 23:59"));
  it("A takes the custom day count", () => eq(from("A", "45", "2026-01-01"), "2026-02-15 23:59"));
  it("A with no day count is a no-op", () => eq(from("A", "", "2026-01-01"), "2026-01-01 23:59"));

  it("crosses month and year ends", () => {
    eq(from("C", null, "2026-12-28"), "2027-01-07 23:59");
    eq(from("B", null, "2028-02-27"), "2028-03-01 23:59"); // 2028 is a leap year
  });

  it("NEF adds 2 years", () => eq(from("NEF", null, "2026-03-01"), "2028-03-01 23:59"));

  // Documented, deliberate: 29 FEB has no counterpart two years later, so it
  // rolls to 01 MAR. Change this only if the maintenance rule says otherwise.
  it("NEF rolls 29 FEB over to 01 MAR", () => eq(from("NEF", null, "2024-02-29"), "2026-03-01 23:59"));

  it("rejects an unparseable date", () => {
    eq(C.calcDuePair("B", null, true, "not-a-date", "UTC", "UTC"), { utc: null, local: null });
  });
});

describe("calcDuePair — today mode", () => {
  it("UTC row is today 23:59 UTC plus the interval", () => {
    const now = new Date();
    const { utc } = C.calcDuePair("C", null, false, "", "Asia/Seoul", "UTC");
    const expected = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 10, 23, 59));
    eq(wall(utc, "UTC"), wall(expected, "UTC"));
  });

  it("local row lands on the local calendar date, not a UTC-shifted one", () => {
    const zone = "America/Toronto";
    const p = C.getPartsInZone(new Date(), zone);
    const { local } = C.calcDuePair("D", null, false, "", zone, "UTC");
    const expected = new Date(C.zonedDateToUtc(p.year, p.month - 1, p.day + 120, 23, 59, zone));
    eq(wall(local, zone), wall(expected, zone));
  });
});

describe("timezone primitives", () => {
  it("round-trips a wall time through zonedDateToUtc", () => {
    for (const zone of ["Asia/Seoul", "America/Toronto", "Europe/Paris", "Australia/Sydney", "UTC"]) {
      const ms = C.zonedDateToUtc(2026, 5, 15, 23, 59, zone);
      eq(wall(new Date(ms), zone), "2026-06-15 23:59", zone);
    }
  });

  it("reports offsets on both sides of a DST change", () => {
    const winter = new Date(Date.UTC(2026, 0, 15, 12));
    const summer = new Date(Date.UTC(2026, 6, 15, 12));
    eq(C.fmtUtcOffset(winter, "America/Toronto"), "UTC-5");
    eq(C.fmtUtcOffset(summer, "America/Toronto"), "UTC-4");
    eq(C.fmtUtcOffset(winter, "Asia/Seoul"), "UTC+9");
    eq(C.fmtUtcOffset(summer, "Asia/Kolkata"), "UTC+5:30");
  });

  it("formats a date with weekday", () => {
    const d = new Date(Date.UTC(2026, 2, 29, 12));
    eq(C.fmt29MAR(d), "29 MAR 26 (Sun)");
    eq(C.fmt29MARZone(d, "UTC"), "29 MAR 26 (Sun)");
  });

  it("returns a dash for an invalid date", () => {
    eq(C.fmt29MAR(new Date("nope")), "—");
    eq(C.fmt29MARZone(new Date("nope"), "UTC"), "—");
  });
});

describe("unit conversion", () => {
  it("converts inch and ft", () => {
    close(C.lengthValueFromBase(12, "ft"), 1);
    close(C.lengthValueFromBase(1, "cm"), 2.54);
    close(C.lengthValueFromBase(12, "inch"), 12);
  });

  // Regression: baseInch used to be `unit === "ft" ? value * 12 : value`, which
  // silently read a cm value as inches.
  it("treats cm as a real unit, not as inches", () => {
    close(C.makeLengthConversion(254, "cm").baseInch, 100, 1e-9);
    close(C.makeLengthConversion(1, "ft").baseInch, 12);
    close(C.makeLengthConversion(5, "inch").baseInch, 5);
  });

  it("agrees with makeLengthToken for every unit", () => {
    for (const unit of C.LENGTH_CONVERSION_UNITS) {
      close(C.makeLengthConversion(7, unit).baseInch, C.makeLengthToken(7, unit).base, 1e-9, unit);
    }
  });

  it("orders the target units with the source last", () => {
    eq(C.orderedLengthConversionUnits("inch"), ["ft", "cm", "inch"]);
    eq(C.orderedLengthConversionUnits("ft"), ["inch", "cm", "ft"]);
    eq(C.orderedLengthConversionUnits("cm"), ["inch", "ft", "cm"]);
  });

  it("cycles through units without escaping the set", () => {
    let r = C.makeLengthConversion(12, "inch");
    const seen = new Set();
    for (let i = 0; i < 6; i++) {
      seen.add(r.unit);
      ok(C.LENGTH_CONVERSION_UNITS.includes(r.unit), `unexpected unit ${r.unit}`);
      r = C.advanceConversion(r);
    }
    eq(seen.size, 3);
  });

  it("converts hours and minutes", () => {
    close(C.timeValueFromBase(90, "hour"), 1.5);
    close(C.timeValueFromBase(90, "min"), 90);
    eq(C.makeTimeConversion(90, "min").unit, "hour");
    eq(C.advanceConversion(C.makeTimeConversion(90, "min")).unit, "min");
  });

  it("handles squared units", () => {
    close(C.lengthValueFromBaseDim(144, "ft", 2), 1);
    close(C.lengthValueFromBaseDim(1, "cm", 2), 6.4516);
  });
});

describe("duration helpers", () => {
  it("converts to and from minutes", () => {
    eq(C.tMins({ h: 2, m: 30 }), 150);
    eq(C.toHM(150), { h: 2, m: 30, neg: false });
    eq(C.toHM(-90), { h: 1, m: 30, neg: true });
    eq(C.toHM(0), { h: 0, m: 0, neg: false });
  });

  it("formats durations with a padded minute", () => {
    eq(C.fmtHMStr({ h: 2, m: 5, neg: false }), "2hour 05min");
    eq(C.fmtHMStr({ h: 2, m: 5, neg: true }), "-2hour 05min");
    eq(C.fmtHMShort({ h: 0, m: 7 }), "0hour 07min");
  });

  it("superscripts exponents", () => {
    eq(C.toSup(2), "²");
    eq(C.toSup(-3), "⁻³");
  });
});
