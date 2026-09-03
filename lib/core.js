/**
 * Maint Tool — pure calculation core.
 *
 * Everything here is free of React, JSX and DOM access so it can run both in
 * the browser (as a plain <script> that defines window.MaintCore) and in Node
 * (require('./lib/core.js')) for the test suite.
 *
 * Rule for both agents: date, timezone and unit maths belong in this file, not
 * in index.html. If it can be wrong, it must be testable.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MaintCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");
  const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON3 = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  // ─── Timezone primitives ───────────────────────────────────────────────────

  function getPartsInZone(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
  }

  function getOffsetMs(date, timeZone) {
    const p = getPartsInZone(date, timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
  }

  // Fixed-point iteration: the offset depends on the instant we are solving
  // for, so guess, correct, repeat. Converges in one step except across a DST
  // boundary, where it takes two.
  function zonedDateToUtc(y, mo, d, h, m, timeZone) {
    let utc = Date.UTC(y, mo, d, h, m, 0, 0);
    for (let i = 0; i < 3; i++) utc = Date.UTC(y, mo, d, h, m, 0, 0) - getOffsetMs(new Date(utc), timeZone);
    return utc;
  }

  // ─── Date formatting ───────────────────────────────────────────────────────

  const fmtDateCompact = (day, month, year) => `${pad(day)} ${MON3[month]} ${String(year).slice(2)}`;

  function fmt29MARZone(date, timeZone = "UTC") {
    if (!date || isNaN(date)) return "—";
    const p = getPartsInZone(date, timeZone);
    const dow = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
    return `${fmtDateCompact(p.day, p.month - 1, p.year)} (${dow})`;
  }

  function fmt29MAR(date) {
    if (!date || isNaN(date)) return "—";
    return `${fmtDateCompact(date.getUTCDate(), date.getUTCMonth(), date.getUTCFullYear())} (${DOW_EN[date.getUTCDay()]})`;
  }

  function fmtTimeZone(date, timeZone) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(date);
  }

  function fmtTimeUTC(date) {
    if (!date || isNaN(date)) return "";
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }

  function fmtUtcOffset(date, timeZone) {
    const mins = Math.round(getOffsetMs(date, timeZone) / 60000);
    const sign = mins >= 0 ? "+" : "-";
    const abs = Math.abs(mins);
    return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${pad(abs % 60)}` : ""}`;
  }

  // ─── Due date ──────────────────────────────────────────────────────────────

  /**
   * Returns {utc, local} due dates from a 23:59 cutoff.
   *
   * `customTz` is a mode flag, not a zone id: "UTC" means the custom date was
   * entered as a UTC date, anything else means it was entered in `localZone`.
   * In custom mode only one of the two rows is rendered, so both fields carry
   * the same instant by design.
   */
  function calcDuePair(type, customDays, useCustom, customDateStr, localZone = "Asia/Seoul", customTz = "UTC") {
    const daysMap = { A: parseInt(customDays) || 0, B: 3, C: 10, D: 120, MOI: 240 };

    // The interval is added on the calendar of the target zone, never to the
    // raw instant. Adding days * 24h drifts by an hour across a DST change,
    // which used to roll 23:59 over to 00:59 and report the due date a full
    // day late in every zone that observes DST. See tests/core.test.js.
    function applyType(baseMs, zone) {
      const p = getPartsInZone(new Date(baseMs), zone);
      if (type === "NEF") {
        // Note: a 29 FEB base rolls to 01 MAR two years on, matching the
        // original behaviour. Change deliberately, with a test, if the
        // maintenance rule says otherwise.
        return new Date(zonedDateToUtc(p.year + 2, p.month - 1, p.day, p.hour, p.minute, zone));
      }
      const days = daysMap[type] ?? 0;
      return new Date(zonedDateToUtc(p.year, p.month - 1, p.day + days, p.hour, p.minute, zone));
    }

    if (useCustom && customDateStr) {
      const parts = customDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!parts) return { utc: null, local: null };
      const y = parseInt(parts[1]), mo = parseInt(parts[2]) - 1, d = parseInt(parts[3]);
      const zone = customTz === "UTC" ? "UTC" : localZone;
      const baseMs = zone === "UTC"
        ? Date.UTC(y, mo, d, 23, 59, 0, 0)
        : zonedDateToUtc(y, mo, d, 23, 59, zone);
      const due = applyType(baseMs, zone);
      return { utc: due, local: due };
    }

    const now = new Date();
    const utcBaseMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 0, 0);
    const lp = getPartsInZone(now, localZone);
    const localBaseMs = zonedDateToUtc(lp.year, lp.month - 1, lp.day, 23, 59, localZone);
    return { utc: applyType(utcBaseMs, "UTC"), local: applyType(localBaseMs, localZone) };
  }

  // ─── Numbers and durations ─────────────────────────────────────────────────

  function tMins({ h, m }) { return h * 60 + m; }

  function toHM(tm) {
    const neg = tm < 0, abs = Math.abs(Math.round(tm));
    return { h: Math.floor(abs / 60), m: abs % 60, neg };
  }

  function fmtNum(value) {
    return parseFloat(Number(value).toFixed(10)).toLocaleString(undefined, { maximumFractionDigits: 10 });
  }

  function toSup(n) {
    const map = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
    return String(n).split("").map(ch => map[ch] ?? ch).join("");
  }

  const fmtHMStr = ({ h, m, neg }) => `${neg ? "-" : ""}${h.toLocaleString()}hour ${pad(m)}min`;
  const fmtHMShort = ({ h, m }) => `${h.toLocaleString()}hour ${pad(m)}min`;

  function fmtLengthStr({ value, unit, dim = 1, neg }) {
    return `${neg ? "-" : ""}${fmtNum(Math.abs(value))}${unit}${dim > 1 ? toSup(dim) : ""}`;
  }

  function fmtResultStr(result) {
    if (!result) return "";
    if (result.type === "scalar") return result.v.toLocaleString(undefined, { maximumFractionDigits: 10 });
    if (result.type === "length") return fmtLengthStr(result);
    return fmtHMStr(result);
  }

  // ─── Unit conversion ───────────────────────────────────────────────────────

  const LENGTH_CONVERSION_UNITS = ["inch", "ft", "cm"];

  function fmtLength(value, unit) {
    return `${parseFloat(value.toFixed(4)).toLocaleString()} ${unit}`;
  }
  const fmtUnitValue = fmtLength;

  function lengthValueFromBase(baseInch, unit) {
    if (unit === "ft") return baseInch / 12;
    if (unit === "cm") return baseInch * 2.54;
    return baseInch;
  }

  // How many inches one `unit` is worth.
  function lengthFactorToInch(unit) {
    if (unit === "ft") return 12;
    if (unit === "cm") return 1 / 2.54;
    return 1;
  }

  function lengthValueFromBaseDim(base, unit, dim = 1) {
    return base / Math.pow(lengthFactorToInch(unit), dim);
  }

  function makeLengthToken(value, unit) {
    return { type: "length", value, unit, dim: 1, base: value * lengthFactorToInch(unit), display: `${value}${unit}` };
  }

  function timeValueFromBase(baseMin, unit) {
    return unit === "hour" ? baseMin / 60 : baseMin;
  }

  function orderedLengthConversionUnits(sourceUnit) {
    if (!LENGTH_CONVERSION_UNITS.includes(sourceUnit)) return LENGTH_CONVERSION_UNITS;
    return LENGTH_CONVERSION_UNITS.filter(unit => unit !== sourceUnit).concat(sourceUnit);
  }

  // Goes through lengthFactorToInch so every unit converts consistently. The
  // old inline `unit === "ft" ? value * 12 : value` silently treated cm as
  // inches; identical for inch/ft, correct for cm.
  function makeLengthConversion(value, unit) {
    return { kind: "length", baseInch: value * lengthFactorToInch(unit), unit: orderedLengthConversionUnits(unit)[0], sourceUnit: unit };
  }

  function makeTimeConversion(baseMin, sourceUnit) {
    return { kind: "time", baseMin, unit: sourceUnit === "min" ? "hour" : "min" };
  }

  function advanceConversion(result) {
    if (!result) return null;
    if (result.kind === "length") {
      const order = orderedLengthConversionUnits(result.sourceUnit);
      const idx = order.indexOf(result.unit);
      return { ...result, unit: order[(idx + 1) % order.length], sourceUnit: result.sourceUnit || result.unit };
    }
    if (result.kind === "time") return { ...result, unit: result.unit === "hour" ? "min" : "hour" };
    return result;
  }

  function formatConvertResult(result) {
    if (!result) return "";
    if (result.kind === "length") {
      return orderedLengthConversionUnits(result.sourceUnit || result.unit)
        .map(unit => fmtUnitValue(lengthValueFromBase(result.baseInch, unit), unit))
        .join(" < ");
    }
    if (result.kind === "time") return fmtUnitValue(timeValueFromBase(result.baseMin, result.unit), result.unit);
    return fmtUnitValue(result.value, result.unit);
  }

  return {
    pad, DOW_EN, MON3,
    getPartsInZone, getOffsetMs, zonedDateToUtc,
    fmtDateCompact, fmt29MARZone, fmt29MAR, fmtTimeZone, fmtTimeUTC, fmtUtcOffset,
    calcDuePair,
    tMins, toHM, fmtNum, toSup, fmtHMStr, fmtHMShort, fmtLengthStr, fmtResultStr,
    LENGTH_CONVERSION_UNITS, fmtLength, fmtUnitValue,
    lengthValueFromBase, lengthFactorToInch, lengthValueFromBaseDim, makeLengthToken,
    timeValueFromBase, orderedLengthConversionUnits, makeLengthConversion,
    makeTimeConversion, advanceConversion, formatConvertResult
  };
});
