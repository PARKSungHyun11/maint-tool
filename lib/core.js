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
