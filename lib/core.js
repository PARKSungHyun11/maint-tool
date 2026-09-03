/**
 * Pure calculation helpers shared by the React app and Node tests.
 * Keep this module free of DOM, React, storage, and native APIs.
 */

const PARTS_FORMATTERS = new Map();

function getPartsFormatter(timeZone) {
  if (!PARTS_FORMATTERS.has(timeZone)) {
    PARTS_FORMATTERS.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }));
  }
  return PARTS_FORMATTERS.get(timeZone);
}

export function getPartsInZone(date, timeZone) {
  const parts = getPartsFormatter(timeZone).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );
}

export function getOffsetMs(date, timeZone) {
  const parts = getPartsInZone(date, timeZone);
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ) - date.getTime();
}

export function zonedDateToUtc(year, month, day, hour, minute, timeZone) {
  const wallClockMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  let utcMs = wallClockMs;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    utcMs = wallClockMs - getOffsetMs(new Date(utcMs), timeZone);
  }
  return utcMs;
}

/**
 * Calculate 23:59 due dates in UTC and a selected local timezone.
 *
 * Calendar intervals are applied in the calendar that owns the deadline.
 * Adding a fixed number of milliseconds to a local instant drifts across DST
 * and can display the following date instead of the intended deadline.
 */
export function calcDuePair(
  type,
  customDays,
  useCustom,
  customDateStr,
  localZone = "Asia/Seoul",
  customTz = "UTC",
  now = new Date(),
) {
  const daysMap = { A: parseInt(customDays, 10) || 0, B: 3, C: 10, D: 120, MOI: 240 };

  function applyType(baseMs, zone) {
    const parts = getPartsInZone(new Date(baseMs), zone);
    const days = daysMap[type] ?? 0;
    return new Date(zonedDateToUtc(
      parts.year,
      parts.month - 1,
      parts.day + days,
      parts.hour,
      parts.minute,
      zone,
    ));
  }

  if (useCustom && customDateStr) {
    const match = customDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return { utc: null, local: null };

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const zone = customTz === "UTC" ? "UTC" : localZone;
    const baseMs = zone === "UTC"
      ? Date.UTC(year, month, day, 23, 59, 0, 0)
      : zonedDateToUtc(year, month, day, 23, 59, zone);
    const due = applyType(baseMs, zone);
    return { utc: due, local: due };
  }

  const utcBaseMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    0,
    0,
  );
  const localNow = getPartsInZone(now, localZone);
  const localBaseMs = zonedDateToUtc(
    localNow.year,
    localNow.month - 1,
    localNow.day,
    23,
    59,
    localZone,
  );

  return {
    utc: applyType(utcBaseMs, "UTC"),
    local: applyType(localBaseMs, localZone),
  };
}

export function lengthFactorToInch(unit) {
  if (unit === "ft") return 12;
  if (unit === "cm") return 1 / 2.54;
  return 1;
}

export const LENGTH_CONVERSION_UNITS = ["inch", "ft", "cm"];

export function orderedLengthConversionUnits(sourceUnit) {
  if (!LENGTH_CONVERSION_UNITS.includes(sourceUnit)) return LENGTH_CONVERSION_UNITS;
  return LENGTH_CONVERSION_UNITS.filter((unit) => unit !== sourceUnit).concat(sourceUnit);
}

export function makeLengthConversion(value, unit) {
  const order = orderedLengthConversionUnits(unit);
  return {
    kind: "length",
    baseInch: value * lengthFactorToInch(unit),
    unit: order[0],
    sourceUnit: unit,
  };
}

// ─── Formatting and unit/duration arithmetic ─────────────────────────────────
// These moved out of app.jsx so the Node suite can reach them. They were the
// other half of the conversion path already living here: app.jsx carried its
// own copies of lengthFactorToInch and orderedLengthConversionUnits, so a fix
// to one table silently left the other behind.

export const pad = (n) => String(n).padStart(2, "0");

export function tMins({ h, m }) {
  return h * 60 + m;
}

export function toHM(tm) {
  const neg = tm < 0;
  const abs = Math.abs(Math.round(tm));
  return { h: Math.floor(abs / 60), m: abs % 60, neg };
}

export function fmtNum(value) {
  return parseFloat(Number(value).toFixed(10)).toLocaleString(undefined, { maximumFractionDigits: 10 });
}

export function toSup(n) {
  const map = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
  return String(n).split("").map((ch) => map[ch] ?? ch).join("");
}

export function fmtHMStr({ h, m, neg }) {
  return `${neg ? "-" : ""}${h.toLocaleString()}hour ${pad(m)}min`;
}

export function fmtHMShort({ h, m }) {
  return `${h.toLocaleString()}hour ${pad(m)}min`;
}

export function fmtLengthStr({ value, unit, dim = 1, neg }) {
  return `${neg ? "-" : ""}${fmtNum(Math.abs(value))}${unit}${dim > 1 ? toSup(dim) : ""}`;
}

export function fmtResultStr(result) {
  if (!result) return "";
  if (result.type === "scalar") return result.v.toLocaleString(undefined, { maximumFractionDigits: 10 });
  if (result.type === "length") return fmtLengthStr(result);
  return fmtHMStr(result);
}

export function fmtRoundedValue(value) {
  return parseFloat(value.toFixed(4)).toLocaleString();
}

export function fmtLength(value, unit) {
  return `${fmtRoundedValue(value)} ${unit}`;
}

export function fmtUnitValue(value, unit) {
  return `${fmtRoundedValue(value)} ${unit}`;
}

export function lengthValueFromBase(baseInch, unit) {
  if (unit === "ft") return baseInch / 12;
  if (unit === "cm") return baseInch * 2.54;
  return baseInch;
}

export function lengthValueFromBaseDim(base, unit, dim = 1) {
  return base / Math.pow(lengthFactorToInch(unit), dim);
}

export function makeLengthToken(value, unit) {
  return {
    type: "length",
    value,
    unit,
    dim: 1,
    base: value * lengthFactorToInch(unit),
    display: `${value}${unit}`,
  };
}

export function timeValueFromBase(baseMin, unit) {
  return unit === "hour" ? baseMin / 60 : baseMin;
}

export function makeTimeConversion(baseMin, sourceUnit) {
  return { kind: "time", baseMin, unit: sourceUnit === "min" ? "hour" : "min" };
}

export function advanceConversion(result) {
  if (!result) return null;
  if (result.kind === "length") {
    const order = orderedLengthConversionUnits(result.sourceUnit);
    const idx = order.indexOf(result.unit);
    return { ...result, unit: order[(idx + 1) % order.length], sourceUnit: result.sourceUnit || result.unit };
  }
  if (result.kind === "time") {
    return { ...result, unit: result.unit === "hour" ? "min" : "hour" };
  }
  return result;
}

export function formatConvertResult(result) {
  if (!result) return "";
  if (result.kind === "length") {
    return orderedLengthConversionUnits(result.sourceUnit || result.unit)
      .map((unit) => fmtUnitValue(lengthValueFromBase(result.baseInch, unit), unit))
      .join(" < ");
  }
  if (result.kind === "time") return fmtUnitValue(timeValueFromBase(result.baseMin, result.unit), result.unit);
  return fmtUnitValue(result.value, result.unit);
}
