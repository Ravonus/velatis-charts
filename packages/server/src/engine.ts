import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
import {
  CHART_API_VERSION,
  assertChartState,
  type Ayanamsa,
  type AspectKind,
  type CalculationSettings,
  type ChartAspect,
  type ChartPerson,
  type ChartPointId,
  type ChartResultV1,
  type ChartStateV1,
  type HouseSystem,
  type NatalChart,
  type PlanetPosition,
  type SynastryChart,
} from "@velatis/charts-contracts";

const require = createRequire(import.meta.url);
// The native module's published declarations do not model every runtime union
// accurately, so the adapter deliberately contains the loose boundary here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Swiss = any;

let swiss: Swiss | undefined;

const POINTS: Record<
  ChartPointId,
  {
    name: string;
    glyph: string;
    id: (swe: Swiss, settings: CalculationSettings) => number;
  }
> = {
  sun: { name: "Sun", glyph: "☉", id: (swe) => swe.SE_SUN },
  moon: { name: "Moon", glyph: "☽", id: (swe) => swe.SE_MOON },
  mercury: { name: "Mercury", glyph: "☿", id: (swe) => swe.SE_MERCURY },
  venus: { name: "Venus", glyph: "♀", id: (swe) => swe.SE_VENUS },
  mars: { name: "Mars", glyph: "♂", id: (swe) => swe.SE_MARS },
  jupiter: { name: "Jupiter", glyph: "♃", id: (swe) => swe.SE_JUPITER },
  saturn: { name: "Saturn", glyph: "♄", id: (swe) => swe.SE_SATURN },
  uranus: { name: "Uranus", glyph: "♅", id: (swe) => swe.SE_URANUS },
  neptune: { name: "Neptune", glyph: "♆", id: (swe) => swe.SE_NEPTUNE },
  pluto: { name: "Pluto", glyph: "♇", id: (swe) => swe.SE_PLUTO },
  "north-node": {
    name: "North Node",
    glyph: "☊",
    id: (swe, settings) =>
      settings.nodeMode === "true" ? swe.SE_TRUE_NODE : swe.SE_MEAN_NODE,
  },
  chiron: { name: "Chiron", glyph: "⚷", id: (swe) => swe.SE_CHIRON },
  lilith: { name: "Lilith", glyph: "⚸", id: (swe) => swe.SE_MEAN_APOG },
};

const HOUSE_CODES: Record<HouseSystem, string> = {
  placidus: "P",
  koch: "K",
  porphyry: "O",
  regiomontanus: "R",
  campanus: "C",
  equal: "E",
  "whole-sign": "W",
  alcabitius: "B",
  morinus: "M",
  topocentric: "T",
};

const AYANAMSA_KEYS: Record<Ayanamsa, string> = {
  "fagan-bradley": "SE_SIDM_FAGAN_BRADLEY",
  lahiri: "SE_SIDM_LAHIRI",
  deluce: "SE_SIDM_DELUCE",
  raman: "SE_SIDM_RAMAN",
  ushashashi: "SE_SIDM_USHASHASHI",
  krishnamurti: "SE_SIDM_KRISHNAMURTI",
  "djwhal-khul": "SE_SIDM_DJWHAL_KHUL",
  yukteshwar: "SE_SIDM_YUKTESHWAR",
  "jn-bhasin": "SE_SIDM_JN_BHASIN",
  "babyl-kugler-1": "SE_SIDM_BABYL_KUGLER1",
  "babyl-kugler-2": "SE_SIDM_BABYL_KUGLER2",
  "babyl-kugler-3": "SE_SIDM_BABYL_KUGLER3",
  "babyl-huber": "SE_SIDM_BABYL_HUBER",
  "babyl-etpsc": "SE_SIDM_BABYL_ETPSC",
  "aldebaran-10tau": "SE_SIDM_ALDEBARAN_15TAU",
  hipparchos: "SE_SIDM_HIPPARCHOS",
  sassanian: "SE_SIDM_SASSANIAN",
};

const ASPECT_ANGLES: Record<AspectKind, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

function locateEphemerisPath(): string | undefined {
  const packageRoot = path.dirname(require.resolve("swisseph-v2/package.json"));
  const candidate = path.join(packageRoot, "ephe");
  return fs.existsSync(path.join(candidate, "sepl_18.se1"))
    ? candidate
    : undefined;
}

function getSwiss(): Swiss {
  if (swiss) return swiss;
  swiss = require("swisseph-v2") as Swiss;
  const ephemerisPath = locateEphemerisPath();
  if (ephemerisPath) swiss.swe_set_ephe_path(ephemerisPath);
  return swiss;
}

function longitudeDistance(left: number, right: number): number {
  const distance = Math.abs(left - right) % 360;
  return distance > 180 ? 360 - distance : distance;
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const hour = values.hour === "24" ? 0 : Number(values.hour);
  const interpretedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    hour,
    Number(values.minute),
    Number(values.second),
  );
  return interpretedAsUtc - date.getTime();
}

export function localDateTimeToUtc(person: ChartPerson): Date {
  const [year, month, day] = person.localDate.split("-").map(Number);
  const [hour, minute, second = 0] = person.localTime.split(":").map(Number);
  const desiredWallTime = Date.UTC(
    year!,
    month! - 1,
    day!,
    hour!,
    minute!,
    second,
  );
  let candidate = new Date(desiredWallTime);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    candidate = new Date(
      desiredWallTime - timeZoneOffsetMilliseconds(candidate, person.timeZone),
    );
  }
  return candidate;
}

function julianDay(swe: Swiss, date: Date): number {
  const hours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3_600 +
    date.getUTCMilliseconds() / 3_600_000;
  return swe.swe_julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    hours,
    swe.SE_GREG_CAL,
  );
}

function houseFor(longitude: number, cusps: number[]): number {
  for (let index = 0; index < 12; index += 1) {
    const start = normalizeLongitude(cusps[index]!);
    const end = normalizeLongitude(cusps[(index + 1) % 12]!);
    const span = normalizeLongitude(end - start);
    const position = normalizeLongitude(longitude - start);
    if (position < span || (index === 11 && position === span))
      return index + 1;
  }
  return 1;
}

function aspectsBetween(
  first: Array<Pick<PlanetPosition, "id" | "longitude">>,
  second: Array<Pick<PlanetPosition, "id" | "longitude">>,
  settings: CalculationSettings,
  crossChart: boolean,
): ChartAspect[] {
  const aspects: ChartAspect[] = [];
  for (let leftIndex = 0; leftIndex < first.length; leftIndex += 1) {
    const rightStart = crossChart ? 0 : leftIndex + 1;
    for (
      let rightIndex = rightStart;
      rightIndex < second.length;
      rightIndex += 1
    ) {
      const left = first[leftIndex]!;
      const right = second[rightIndex]!;
      if (crossChart && left.id === right.id && first === second) continue;
      const angle = longitudeDistance(left.longitude, right.longitude);
      for (const [kind, target] of Object.entries(ASPECT_ANGLES) as Array<
        [AspectKind, number]
      >) {
        const orb = Math.abs(angle - target);
        if (orb <= settings.orbs[kind]) {
          aspects.push({
            from: left.id,
            to: right.id,
            kind,
            angle,
            orb,
          });
          break;
        }
      }
    }
  }
  return aspects.sort((left, right) => left.orb - right.orb);
}

function calculateNatal(
  swe: Swiss,
  person: ChartPerson,
  settings: CalculationSettings,
): NatalChart {
  const utc = localDateTimeToUtc(person);
  const jd = julianDay(swe, utc);
  let flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  if (settings.zodiac === "sidereal") {
    const siderealMode = swe[AYANAMSA_KEYS[settings.ayanamsa]];
    swe.swe_set_sid_mode(siderealMode);
    flags |= swe.SEFLG_SIDEREAL;
  }

  const housesResult = swe.swe_houses_ex(
    jd,
    settings.zodiac === "sidereal" ? swe.SEFLG_SIDEREAL : 0,
    person.latitude,
    person.longitude,
    HOUSE_CODES[settings.houseSystem],
  );
  if ("error" in housesResult)
    throw new Error(`Swiss Ephemeris houses error: ${housesResult.error}`);
  const cusps: number[] = (housesResult.house as number[])
    .slice(0, 12)
    .map(normalizeLongitude);

  const planets = settings.points.map((pointId): PlanetPosition => {
    const definition = POINTS[pointId];
    const result = swe.swe_calc_ut(jd, definition.id(swe, settings), flags);
    if ("error" in result)
      throw new Error(
        `Swiss Ephemeris ${definition.name} error: ${result.error}`,
      );
    const longitude = normalizeLongitude(result.longitude);
    return {
      id: pointId,
      name: definition.name,
      glyph: definition.glyph,
      longitude,
      latitude: result.latitude,
      distance: result.distance,
      speed: result.longitudeSpeed,
      retrograde: result.longitudeSpeed < 0,
      signIndex: Math.floor(longitude / 30),
      degreeInSign: longitude % 30,
      house: houseFor(longitude, cusps),
    };
  });

  return {
    personId: person.id,
    personName: person.name,
    utcDateTime: utc.toISOString(),
    julianDay: jd,
    ascendant: normalizeLongitude(housesResult.ascendant),
    midheaven: normalizeLongitude(housesResult.mc),
    houses: cusps.map((longitude, index) => ({
      number: index + 1,
      longitude,
      signIndex: Math.floor(longitude / 30),
    })),
    planets,
    aspects: aspectsBetween(planets, planets, settings, false),
  };
}

function calculateSynastry(
  charts: NatalChart[],
  settings: CalculationSettings,
): SynastryChart[] {
  const result: SynastryChart[] = [];
  for (let firstIndex = 0; firstIndex < charts.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < charts.length;
      secondIndex += 1
    ) {
      const first = charts[firstIndex]!;
      const second = charts[secondIndex]!;
      result.push({
        firstPersonId: first.personId,
        secondPersonId: second.personId,
        aspects: aspectsBetween(first.planets, second.planets, settings, true),
      });
    }
  }
  return result;
}

export function calculateChartState(input: unknown): ChartResultV1 {
  assertChartState(input);
  const state: ChartStateV1 = input;
  const swe = getSwiss();
  const charts = state.people.map((person) =>
    calculateNatal(swe, person, state.settings),
  );
  return {
    apiVersion: CHART_API_VERSION,
    engine: {
      name: "Swiss Ephemeris",
      version: swe.swe_version(),
    },
    state,
    charts,
    synastry:
      state.mode === "compare" ? calculateSynastry(charts, state.settings) : [],
    generatedAt: new Date().toISOString(),
  };
}
