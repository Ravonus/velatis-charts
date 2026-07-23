import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
import {
  CHART_API_VERSION,
  type EphemerisOperationRequestV1,
  type EphemerisOperationResponseV1,
  type JsonValue,
} from "@velatis/charts-contracts";
import { getSwiss, type Swiss } from "./engine.js";

const require = createRequire(import.meta.url);
const MAX_SAMPLES = 5_000;
const MAX_CROSSING_QUERIES = 1_024;
const MAX_FIXED_STARS = 512;

type InputObject = Record<string, unknown>;

type OperationSettings = {
  zodiacMode: "tropical" | "sidereal";
  siderealAyanamsaKey: string;
  customAyanamsaDegrees: number;
};

function object(value: unknown, label: string): InputObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(`${label} must be an object`);
  return value as InputObject;
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`${label} must be a finite number`);
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function array(value: unknown, label: string, maximum: number): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  if (value.length > maximum)
    throw new RangeError(`${label} exceeds the ${maximum} item limit`);
  return value;
}

function integer(value: unknown, label: string): number {
  const parsed = number(value, label);
  if (!Number.isInteger(parsed))
    throw new TypeError(`${label} must be an integer`);
  return parsed;
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function operationSettings(value: unknown): OperationSettings {
  const input = value === undefined ? {} : object(value, "settings");
  const zodiacMode = input.zodiacMode === "sidereal" ? "sidereal" : "tropical";
  return {
    zodiacMode,
    siderealAyanamsaKey:
      typeof input.siderealAyanamsaKey === "string"
        ? input.siderealAyanamsaKey
        : "SE_SIDM_LAHIRI",
    customAyanamsaDegrees:
      typeof input.customAyanamsaDegrees === "number"
        ? input.customAyanamsaDegrees
        : 0,
  };
}

function calculationFlags(
  swe: Swiss,
  settings: OperationSettings,
  julianDay: number,
): number {
  let flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  if (settings.zodiacMode !== "sidereal") return flags;
  if (settings.siderealAyanamsaKey === "SE_SIDM_USER") {
    swe.swe_set_sid_mode(
      swe.SE_SIDM_USER | swe.SE_SIDBIT_USER_UT,
      julianDay,
      settings.customAyanamsaDegrees,
    );
  } else {
    const mode = swe[settings.siderealAyanamsaKey];
    if (
      !settings.siderealAyanamsaKey.startsWith("SE_SIDM_") ||
      typeof mode !== "number"
    ) {
      throw new TypeError("settings.siderealAyanamsaKey is unsupported");
    }
    swe.swe_set_sid_mode(mode, 0, 0);
  }
  return flags | swe.SEFLG_SIDEREAL;
}

function bodyPosition(
  swe: Swiss,
  julianDay: number,
  bodyId: number,
  settings: OperationSettings,
): Record<string, JsonValue> {
  const flags = calculationFlags(swe, settings, julianDay);
  const ecliptic = swe.swe_calc_ut(julianDay, bodyId, flags);
  if (ecliptic.error)
    throw new Error(`swe_calc_ut(${bodyId}): ${String(ecliptic.error)}`);
  const equatorial = swe.swe_calc_ut(
    julianDay,
    bodyId,
    flags | swe.SEFLG_EQUATORIAL,
  );
  if (equatorial.error) {
    throw new Error(
      `swe_calc_ut(${bodyId}, equatorial): ${String(equatorial.error)}`,
    );
  }
  return {
    bodyId,
    longitude: normalizeLongitude(number(ecliptic.longitude, "longitude")),
    latitude: typeof ecliptic.latitude === "number" ? ecliptic.latitude : 0,
    longitudeSpeed:
      typeof ecliptic.longitudeSpeed === "number" ? ecliptic.longitudeSpeed : 0,
    rightAscension:
      typeof equatorial.rectAscension === "number"
        ? equatorial.rectAscension
        : 0,
    declination:
      typeof equatorial.declination === "number" ? equatorial.declination : 0,
    distanceAu: typeof ecliptic.distance === "number" ? ecliptic.distance : 1,
    distanceSpeedAuPerDay:
      typeof ecliptic.distanceSpeed === "number" ? ecliptic.distanceSpeed : 0,
  };
}

function signedPhaseDistance(
  swe: Swiss,
  julianDay: number,
  targetAngle: number,
  settings: OperationSettings,
): number {
  const sun = bodyPosition(swe, julianDay, swe.SE_SUN, settings);
  const moon = bodyPosition(swe, julianDay, swe.SE_MOON, settings);
  return (
    ((number(moon.longitude, "moon.longitude") -
      number(sun.longitude, "sun.longitude") -
      targetAngle +
      540) %
      360) -
    180
  );
}

function bisectPhase(
  swe: Swiss,
  lower: number,
  upper: number,
  targetAngle: number,
  settings: OperationSettings,
): number {
  let left = lower;
  let right = upper;
  let leftValue = signedPhaseDistance(swe, left, targetAngle, settings);
  for (let index = 0; index < 48; index += 1) {
    const middle = (left + right) / 2;
    const middleValue = signedPhaseDistance(swe, middle, targetAngle, settings);
    if (Math.abs(middleValue) < 1e-7) return middle;
    if (
      (leftValue <= 0 && middleValue >= 0) ||
      (leftValue >= 0 && middleValue <= 0)
    ) {
      right = middle;
    } else {
      left = middle;
      leftValue = middleValue;
    }
  }
  return (left + right) / 2;
}

function nearestPrenatalSyzygy(
  swe: Swiss,
  julianDay: number,
  settings: OperationSettings,
): number {
  let best: { julianDay: number; target: 0 | 180 } | undefined;
  for (const target of [0, 180] as const) {
    let previousJd = julianDay - 30;
    let previous = signedPhaseDistance(swe, previousJd, target, settings);
    for (
      let currentJd = previousJd + 0.25;
      currentJd < julianDay;
      currentJd += 0.25
    ) {
      const current = signedPhaseDistance(swe, currentJd, target, settings);
      if (
        previous === 0 ||
        current === 0 ||
        (previous < 0 && current > 0) ||
        (previous > 0 && current < 0)
      ) {
        const exact = bisectPhase(swe, previousJd, currentJd, target, settings);
        if (exact < julianDay && (!best || exact > best.julianDay)) {
          best = { julianDay: exact, target };
        }
      }
      previousJd = currentJd;
      previous = current;
    }
  }
  const bodyId = best?.target === 180 ? swe.SE_MOON : swe.SE_SUN;
  return number(
    bodyPosition(swe, best?.julianDay ?? julianDay, bodyId, settings).longitude,
    "syzygy.longitude",
  );
}

function chartFrame(swe: Swiss, raw: unknown): JsonValue {
  const input = object(raw, "input");
  const julianDay = number(input.julianDay, "input.julianDay");
  const latitude = number(input.latitude, "input.latitude");
  const longitude = number(input.longitude, "input.longitude");
  const houseSystem = string(
    input.calculationHouseSystem,
    "input.calculationHouseSystem",
  );
  if (houseSystem.length !== 1)
    throw new TypeError("input.calculationHouseSystem must be one character");
  const settings = operationSettings(input.settings);
  const bodyIds = array(input.bodyIds, "input.bodyIds", 64).map(
    (value, index) => integer(value, `input.bodyIds[${index}]`),
  );
  const houses = swe.swe_houses(julianDay, latitude, longitude, houseSystem);
  if (houses.error) throw new Error(`swe_houses: ${String(houses.error)}`);
  const gauquelin = swe.swe_houses(julianDay, latitude, longitude, "G");
  if (gauquelin.error)
    throw new Error(`swe_houses(G): ${String(gauquelin.error)}`);
  const nutation = swe.swe_calc_ut(julianDay, swe.SE_ECL_NUT, swe.SEFLG_SWIEPH);
  if (nutation.error)
    throw new Error(`swe_calc_ut(SE_ECL_NUT): ${String(nutation.error)}`);
  return {
    julianDay,
    houses: ((houses.house as number[]) ?? []).slice(0, 12),
    ascendant: number(houses.ascendant, "houses.ascendant"),
    mc: number(houses.mc, "houses.mc"),
    obliquity: number(nutation.longitude, "nutation.longitude"),
    gauquelinSectors: ((gauquelin.house as number[]) ?? [])
      .slice(0, 36)
      .map((sectorLongitude, index) => ({
        sector: index + 1,
        longitude: sectorLongitude,
      })),
    positions: bodyIds.map((bodyId) =>
      bodyPosition(swe, julianDay, bodyId, settings),
    ),
    prenatalSyzygyLongitude:
      input.includePrenatalSyzygy === true
        ? nearestPrenatalSyzygy(swe, julianDay, settings)
        : null,
  };
}

function positions(swe: Swiss, raw: unknown): JsonValue {
  const input = object(raw, "input");
  const settings = operationSettings(input.settings);
  return array(input.samples, "input.samples", MAX_SAMPLES).map(
    (value, sampleIndex) => {
      const sample = object(value, `input.samples[${sampleIndex}]`);
      const julianDay = number(
        sample.julianDay,
        `input.samples[${sampleIndex}].julianDay`,
      );
      const bodyIds = array(
        sample.bodyIds,
        `input.samples[${sampleIndex}].bodyIds`,
        64,
      ).map((bodyId, bodyIndex) =>
        integer(bodyId, `input.samples[${sampleIndex}].bodyIds[${bodyIndex}]`),
      );
      return {
        julianDay,
        positions: bodyIds.map((bodyId) =>
          bodyPosition(swe, julianDay, bodyId, settings),
        ),
      };
    },
  );
}

function signedOrb(
  transitLongitude: number,
  targetLongitude: number,
  aspectAngle: number,
): number {
  const difference = ((transitLongitude - targetLongitude + 540) % 360) - 180;
  if (aspectAngle === 0) return difference;
  if (aspectAngle === 180) return Math.abs(difference) - 180;
  const arm = Math.abs(difference) - aspectAngle;
  return difference > 0 ? arm : -arm;
}

function bodyLongitude(
  swe: Swiss,
  julianDay: number,
  bodyId: number,
  settings: OperationSettings,
): number {
  return number(
    bodyPosition(swe, julianDay, bodyId, settings).longitude,
    "position.longitude",
  );
}

function bisectCrossing(
  swe: Swiss,
  input: {
    bodyId: number;
    targetLongitude: number;
    aspectAngle: number;
    lower: number;
    upper: number;
  },
  settings: OperationSettings,
): number {
  let lower = input.lower;
  let upper = input.upper;
  for (let index = 0; index < 40; index += 1) {
    const middle = (lower + upper) / 2;
    const middleDifference = signedOrb(
      bodyLongitude(swe, middle, input.bodyId, settings),
      input.targetLongitude,
      input.aspectAngle,
    );
    const lowerDifference = signedOrb(
      bodyLongitude(swe, lower, input.bodyId, settings),
      input.targetLongitude,
      input.aspectAngle,
    );
    if (Math.abs(middleDifference) < 0.001) return middle;
    if (Math.sign(middleDifference) === Math.sign(lowerDifference))
      lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function crossings(swe: Swiss, raw: unknown): JsonValue {
  const input = object(raw, "input");
  const settings = operationSettings(input.settings);
  return array(input.queries, "input.queries", MAX_CROSSING_QUERIES).map(
    (value, queryIndex) => {
      const query = object(value, `input.queries[${queryIndex}]`);
      const bodyId = integer(
        query.bodyId,
        `input.queries[${queryIndex}].bodyId`,
      );
      const targetLongitude = number(
        query.targetLongitude,
        `input.queries[${queryIndex}].targetLongitude`,
      );
      const aspectAngle = number(
        query.aspectAngle,
        `input.queries[${queryIndex}].aspectAngle`,
      );
      const fromJd = number(
        query.fromJd,
        `input.queries[${queryIndex}].fromJd`,
      );
      const toJd = number(query.toJd, `input.queries[${queryIndex}].toJd`);
      if (toJd < fromJd || toJd - fromJd > 20_000)
        throw new RangeError("crossing query range is invalid");
      const exactJulianDays: number[] = [];
      let previousJd = fromJd;
      let previousDifference = signedOrb(
        bodyLongitude(swe, previousJd, bodyId, settings),
        targetLongitude,
        aspectAngle,
      );
      for (let julianDay = fromJd + 1; julianDay <= toJd; julianDay += 1) {
        const currentDifference = signedOrb(
          bodyLongitude(swe, julianDay, bodyId, settings),
          targetLongitude,
          aspectAngle,
        );
        if (
          Math.sign(previousDifference) !== Math.sign(currentDifference) &&
          Math.abs(currentDifference) < 20 &&
          Math.abs(previousDifference) < 20
        ) {
          exactJulianDays.push(
            bisectCrossing(
              swe,
              {
                bodyId,
                targetLongitude,
                aspectAngle,
                lower: previousJd,
                upper: julianDay,
              },
              settings,
            ),
          );
        }
        previousJd = julianDay;
        previousDifference = currentDifference;
      }
      return {
        queryIndex,
        exactJulianDays,
      };
    },
  );
}

function eclipseType(swe: Swiss, flags: number): string {
  if (flags & swe.SE_ECL_TOTAL) return "total";
  if (flags & swe.SE_ECL_ANNULAR_TOTAL) return "annular-total";
  if (flags & swe.SE_ECL_ANNULAR) return "annular";
  if (flags & swe.SE_ECL_PARTIAL) return "partial";
  return "penumbral";
}

function eclipses(swe: Swiss, raw: unknown): JsonValue {
  const input = object(raw, "input");
  const fromJd = number(input.fromJd, "input.fromJd");
  const toJd = number(input.toJd, "input.toJd");
  if (toJd < fromJd || toJd - fromJd > 36_600)
    throw new RangeError("eclipse range is invalid");
  const output: Array<Record<string, JsonValue>> = [];
  let cursor = fromJd;
  for (let count = 0; count < 256; count += 1) {
    const result = swe.swe_sol_eclipse_when_glob(
      cursor,
      swe.SEFLG_SWIEPH,
      swe.SE_ECL_ALLTYPES_SOLAR,
      0,
    );
    if (result.error || result.maximum > toJd) break;
    const where = swe.swe_sol_eclipse_where(result.maximum, swe.SEFLG_SWIEPH);
    output.push({
      kind: "solar",
      maximum: result.maximum,
      begin: result.begin || result.maximum,
      end: result.end || result.maximum,
      eclipseType: eclipseType(swe, result.rflag),
      magnitude: where.error ? null : where.eclipseMagnitude,
      latitude: where.error ? null : where.latitude,
      longitude: where.error ? null : where.longitude,
    });
    cursor = result.maximum + 2;
  }
  cursor = fromJd;
  for (let count = 0; count < 256; count += 1) {
    const result = swe.swe_lun_eclipse_when(
      cursor,
      swe.SEFLG_SWIEPH,
      swe.SE_ECL_ALLTYPES_LUNAR,
      0,
    );
    if (result.error || result.maximum > toJd) break;
    const how = swe.swe_lun_eclipse_how(
      result.maximum,
      swe.SEFLG_SWIEPH,
      0,
      0,
      0,
    );
    output.push({
      kind: "lunar",
      maximum: result.maximum,
      begin:
        result.penumbralBegin ||
        result.partialBegin ||
        result.totalBegin ||
        result.maximum,
      end:
        result.penumbralEnd ||
        result.partialEnd ||
        result.totalEnd ||
        result.maximum,
      eclipseType: eclipseType(swe, result.rflag),
      magnitude: how.error ? null : how.umbralMagnitude,
      latitude: null,
      longitude: null,
    });
    cursor = result.maximum + 2;
  }
  return output;
}

function riseSet(swe: Swiss, raw: unknown): JsonValue {
  const input = object(raw, "input");
  const event = input.event === "set" ? "set" : "rise";
  const result = swe.swe_rise_trans(
    number(input.startJd, "input.startJd"),
    integer(input.bodyId, "input.bodyId"),
    "",
    swe.SEFLG_SWIEPH,
    (event === "rise" ? swe.SE_CALC_RISE : swe.SE_CALC_SET) |
      swe.SE_BIT_DISC_CENTER,
    number(input.longitude, "input.longitude"),
    number(input.latitude, "input.latitude"),
    0,
    0,
    0,
  );
  if (result.error)
    throw new Error(`swe_rise_trans(${event}): ${String(result.error)}`);
  return { transitJulianDay: number(result.transitTime, "transitTime") };
}

function starFile(): string {
  const packageRoot = path.dirname(require.resolve("swisseph-v2/package.json"));
  const candidate = path.join(packageRoot, "ephe", "sefstars.txt");
  if (!fs.existsSync(candidate))
    throw new Error("Swiss fixed-star catalog is unavailable");
  return candidate;
}

function fixedStarKey(name: string, designation: string): string {
  return `${name}-${designation}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function fixedStarCatalog(raw: unknown): JsonValue {
  const input = object(raw, "input");
  const maximumMagnitude =
    typeof input.maxMagnitude === "number" ? input.maxMagnitude : 6;
  const limit = Math.max(
    1,
    Math.min(10_000, typeof input.limit === "number" ? input.limit : 32),
  );
  const offset = Math.max(
    0,
    Math.floor(typeof input.offset === "number" ? input.offset : 0),
  );
  const query =
    typeof input.query === "string" ? input.query.trim().toLowerCase() : "";
  const seen = new Set<string>();
  const rows = fs
    .readFileSync(starFile(), "utf8")
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const parts = line.split(",").map((part) => part.trim());
      return {
        name: parts[0] ?? "",
        designation: parts[1] ?? parts[0] ?? "",
        magnitude: Number(parts[13]),
      };
    })
    .filter(
      (row) =>
        row.name &&
        /^[a-z]{2}[A-Z][A-Za-z0-9]*$/u.test(row.designation) &&
        Number.isFinite(row.magnitude) &&
        row.magnitude <= maximumMagnitude,
    )
    .filter((row) => {
      const key = row.designation.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        left.magnitude - right.magnitude || left.name.localeCompare(right.name),
    )
    .map((row) => ({
      key: fixedStarKey(row.name, row.designation),
      name: row.name,
      designation: row.designation,
      family: "Swiss",
      longitude2020: 0,
      nature: `Swiss catalog · mag ${row.magnitude.toFixed(2)}`,
    }))
    .filter(
      (row) =>
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.designation.toLowerCase().includes(query) ||
        row.key.includes(query),
    );
  return {
    maxMagnitude: maximumMagnitude,
    offset,
    limit,
    total: rows.length,
    rows: rows.slice(offset, offset + limit),
  };
}

function fixedStarPositions(swe: Swiss, raw: unknown): JsonValue {
  const input = object(raw, "input");
  const julianDay = number(input.julianDay, "input.julianDay");
  const stars = array(input.stars, "input.stars", MAX_FIXED_STARS);
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  return stars
    .map((value, index) => {
      const star = object(value, `input.stars[${index}]`);
      const name = string(star.name, `input.stars[${index}].name`);
      const result = swe.swe_fixstar2_ut(name, julianDay, flags);
      if (result.error)
        throw new Error(`swe_fixstar2_ut(${name}): ${String(result.error)}`);
      const equatorial = swe.swe_fixstar2_ut(
        name,
        julianDay,
        flags | swe.SEFLG_EQUATORIAL,
      );
      if (equatorial.error) {
        throw new Error(
          `swe_fixstar2_ut(${name}, equatorial): ${String(equatorial.error)}`,
        );
      }
      const magnitude = swe.swe_fixstar2_mag(name);
      if (magnitude.error)
        throw new Error(
          `swe_fixstar2_mag(${name}): ${String(magnitude.error)}`,
        );
      return {
        starKey: string(star.key, `input.stars[${index}].key`),
        starName: name,
        starDesignation: string(
          star.designation,
          `input.stars[${index}].designation`,
        ),
        swissName: String(result.name),
        family: typeof star.family === "string" ? star.family : "Swiss",
        nature: typeof star.nature === "string" ? star.nature : "",
        longitude: normalizeLongitude(result.longitude),
        latitude: typeof result.latitude === "number" ? result.latitude : 0,
        longitudeSpeed:
          typeof result.longitudeSpeed === "number" ? result.longitudeSpeed : 0,
        rightAscension:
          typeof equatorial.rectAscension === "number"
            ? equatorial.rectAscension
            : 0,
        declination:
          typeof equatorial.declination === "number"
            ? equatorial.declination
            : 0,
        magnitude:
          typeof magnitude.magnitude === "number" ? magnitude.magnitude : null,
      };
    })
    .sort(
      (left, right) =>
        left.longitude - right.longitude ||
        left.starName.localeCompare(right.starName),
    );
}

function assertRequest(value: unknown): EphemerisOperationRequestV1 {
  const request = object(value, "request");
  const operation = string(request.operation, "request.operation");
  const supported = new Set<EphemerisOperationRequestV1["operation"]>([
    "chart-frame",
    "positions",
    "crossings",
    "eclipses",
    "rise-set",
    "fixed-star-catalog",
    "fixed-star-positions",
  ]);
  if (!supported.has(operation as EphemerisOperationRequestV1["operation"]))
    throw new TypeError(`Unsupported ephemeris operation: ${operation}`);
  return {
    operation: operation as EphemerisOperationRequestV1["operation"],
    input: object(request.input, "request.input") as JsonValue,
  };
}

export function calculateEphemerisOperation(
  value: unknown,
): EphemerisOperationResponseV1 {
  const request = assertRequest(value);
  const swe = getSwiss();
  const handlers: Record<
    EphemerisOperationRequestV1["operation"],
    (engine: Swiss, input: unknown) => JsonValue
  > = {
    "chart-frame": chartFrame,
    positions,
    crossings,
    eclipses,
    "rise-set": riseSet,
    "fixed-star-catalog": (_engine, input) => fixedStarCatalog(input),
    "fixed-star-positions": fixedStarPositions,
  };
  return {
    apiVersion: CHART_API_VERSION,
    operation: request.operation,
    engine: {
      name: "Swiss Ephemeris",
      version: String(swe.swe_version()),
    },
    result: handlers[request.operation](swe, request.input),
  };
}
