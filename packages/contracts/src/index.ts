export const CHART_STATE_VERSION = 1 as const;
export const CHART_API_VERSION = "v1" as const;
export const MAX_PEOPLE = 8;
export const MAX_EXTENSION_BYTES = 32_000;

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ChartMode = "natal" | "compare" | "transits";
export type ZodiacMode = "tropical" | "sidereal";
export type NodeMode = "mean" | "true";
export type HouseSystem =
  | "placidus"
  | "koch"
  | "porphyry"
  | "regiomontanus"
  | "campanus"
  | "equal"
  | "whole-sign"
  | "alcabitius"
  | "morinus"
  | "topocentric";

export type Ayanamsa =
  | "fagan-bradley"
  | "lahiri"
  | "deluce"
  | "raman"
  | "ushashashi"
  | "krishnamurti"
  | "djwhal-khul"
  | "yukteshwar"
  | "jn-bhasin"
  | "babyl-kugler-1"
  | "babyl-kugler-2"
  | "babyl-kugler-3"
  | "babyl-huber"
  | "babyl-etpsc"
  | "aldebaran-10tau"
  | "hipparchos"
  | "sassanian";

export type ChartPointId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "north-node"
  | "chiron"
  | "lilith";

export interface ChartPerson {
  id: string;
  name: string;
  localDate: string;
  localTime: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  locationLabel?: string;
  extensions?: Record<string, JsonValue>;
}

export interface OrbPolicy {
  conjunction: number;
  opposition: number;
  trine: number;
  square: number;
  sextile: number;
}

export interface CalculationSettings {
  zodiac: ZodiacMode;
  ayanamsa: Ayanamsa;
  houseSystem: HouseSystem;
  nodeMode: NodeMode;
  points: ChartPointId[];
  orbs: OrbPolicy;
}

export interface PresentationSettings {
  theme?: string;
  showAspectLines?: boolean;
  showDegrees?: boolean;
  showHouses?: boolean;
  glyphSet?: string;
  extensions?: Record<string, JsonValue>;
}

export interface ChartStateV1 {
  version: typeof CHART_STATE_VERSION;
  mode: ChartMode;
  people: ChartPerson[];
  transitAt?: string;
  settings: CalculationSettings;
  presentation?: PresentationSettings;
  /**
   * Vendor-neutral expansion point. Use a reverse-DNS key such as
   * "com.example.progressions" and keep every value valid JSON.
   */
  extensions?: Record<string, JsonValue>;
}

export interface PlanetPosition {
  id: ChartPointId;
  name: string;
  glyph: string;
  longitude: number;
  latitude: number;
  distance: number;
  speed: number;
  retrograde: boolean;
  signIndex: number;
  degreeInSign: number;
  house: number;
}

export interface HousePosition {
  number: number;
  longitude: number;
  signIndex: number;
}

export type AspectKind =
  "conjunction" | "opposition" | "trine" | "square" | "sextile";

export interface ChartAspect {
  from: string;
  to: string;
  kind: AspectKind;
  angle: number;
  orb: number;
  applying?: boolean;
}

export interface NatalChart {
  personId: string;
  personName: string;
  utcDateTime: string;
  julianDay: number;
  ascendant: number;
  midheaven: number;
  houses: HousePosition[];
  planets: PlanetPosition[];
  aspects: ChartAspect[];
}

export interface SynastryChart {
  firstPersonId: string;
  secondPersonId: string;
  aspects: ChartAspect[];
}

export interface ChartResultV1 {
  apiVersion: typeof CHART_API_VERSION;
  engine: {
    name: "Swiss Ephemeris";
    version: string;
  };
  state: ChartStateV1;
  charts: NatalChart[];
  synastry: SynastryChart[];
  generatedAt: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: JsonValue;
  };
}

export const DEFAULT_SETTINGS: CalculationSettings = {
  zodiac: "tropical",
  ayanamsa: "lahiri",
  houseSystem: "placidus",
  nodeMode: "true",
  points: [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "north-node",
    "chiron",
    "lilith",
  ],
  orbs: {
    conjunction: 8,
    opposition: 8,
    trine: 7,
    square: 7,
    sextile: 5,
  },
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const timePattern = /^\d{2}:\d{2}(?::\d{2})?$/u;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/u;

function assertion(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TypeError(message);
}

function validateExtensions(
  value: Record<string, JsonValue> | undefined,
  path: string,
): void {
  if (value === undefined) return;
  const encoded = JSON.stringify(value);
  assertion(
    encoded.length <= MAX_EXTENSION_BYTES,
    `${path} exceeds ${MAX_EXTENSION_BYTES} bytes`,
  );
  for (const key of Object.keys(value)) {
    assertion(
      key.includes(".") && key.length <= 128,
      `${path} keys must be reverse-DNS names with a maximum length of 128`,
    );
  }
}

export function assertChartState(
  value: unknown,
): asserts value is ChartStateV1 {
  assertion(
    typeof value === "object" && value !== null,
    "Chart state must be an object",
  );
  const state = value as Partial<ChartStateV1>;
  assertion(
    state.version === CHART_STATE_VERSION,
    `Unsupported chart state version: ${String(state.version)}`,
  );
  assertion(
    ["natal", "compare", "transits"].includes(String(state.mode)),
    "Invalid chart mode",
  );
  assertion(Array.isArray(state.people), "people must be an array");
  assertion(
    state.people.length > 0 && state.people.length <= MAX_PEOPLE,
    `people must contain 1-${MAX_PEOPLE} entries`,
  );
  const ids = new Set<string>();
  for (const [index, person] of state.people.entries()) {
    assertion(
      typeof person === "object" && person !== null,
      `people[${index}] must be an object`,
    );
    assertion(idPattern.test(person.id), `people[${index}].id is invalid`);
    assertion(!ids.has(person.id), `Duplicate person id: ${person.id}`);
    ids.add(person.id);
    assertion(
      person.name.trim().length > 0 && person.name.length <= 120,
      `people[${index}].name is invalid`,
    );
    assertion(
      datePattern.test(person.localDate),
      `people[${index}].localDate must be YYYY-MM-DD`,
    );
    assertion(
      timePattern.test(person.localTime),
      `people[${index}].localTime must be HH:mm or HH:mm:ss`,
    );
    assertion(
      Number.isFinite(person.latitude) &&
        person.latitude >= -90 &&
        person.latitude <= 90,
      `people[${index}].latitude is invalid`,
    );
    assertion(
      Number.isFinite(person.longitude) &&
        person.longitude >= -180 &&
        person.longitude <= 180,
      `people[${index}].longitude is invalid`,
    );
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: person.timeZone });
    } catch {
      throw new TypeError(
        `people[${index}].timeZone must be a valid IANA time zone`,
      );
    }
    validateExtensions(person.extensions, `people[${index}].extensions`);
  }
  assertion(
    typeof state.settings === "object" && state.settings !== null,
    "settings are required",
  );
  assertion(
    ["tropical", "sidereal"].includes(state.settings.zodiac),
    "Invalid zodiac mode",
  );
  assertion(
    Array.isArray(state.settings.points) && state.settings.points.length > 0,
    "At least one point is required",
  );
  if (state.mode === "compare")
    assertion(
      state.people.length >= 2,
      "Compare mode requires at least two people",
    );
  if (state.transitAt !== undefined) {
    assertion(
      Number.isFinite(Date.parse(state.transitAt)),
      "transitAt must be an ISO date-time",
    );
  }
  validateExtensions(state.extensions, "extensions");
  validateExtensions(state.presentation?.extensions, "presentation.extensions");
}

export function createDefaultChartState(
  person?: Partial<ChartPerson>,
): ChartStateV1 {
  return {
    version: CHART_STATE_VERSION,
    mode: "natal",
    people: [
      {
        id: person?.id ?? "person-1",
        name: person?.name ?? "Chart 1",
        localDate: person?.localDate ?? "1990-01-01",
        localTime: person?.localTime ?? "12:00",
        timeZone: person?.timeZone ?? "UTC",
        latitude: person?.latitude ?? 0,
        longitude: person?.longitude ?? 0,
        locationLabel: person?.locationLabel,
        extensions: person?.extensions,
      },
    ],
    settings: structuredClone(DEFAULT_SETTINGS),
    presentation: {
      showAspectLines: true,
      showDegrees: true,
      showHouses: true,
    },
  };
}
