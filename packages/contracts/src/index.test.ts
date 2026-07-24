import { describe, expect, it } from "vitest";
import {
  MAX_EXTENSION_BYTES,
  assertChartState,
  createDefaultChartState,
  type ChartStateV1,
} from "./index.js";

function validState(): ChartStateV1 {
  return createDefaultChartState({
    id: "avery",
    name: "Avery",
    localDate: "1990-01-01",
    localTime: "12:30",
    timeZone: "America/Denver",
    latitude: 39.7392,
    longitude: -104.9903,
  });
}

function invalid(mutate: (state: ChartStateV1) => unknown): () => unknown {
  return () => {
    const state = validState();
    return assertChartState(mutate(state));
  };
}

describe("public chart contract", () => {
  it("creates an isolated complete default", () => {
    expect(createDefaultChartState().people[0]).toEqual({
      id: "person-1",
      name: "Chart 1",
      localDate: "1990-01-01",
      localTime: "12:00",
      timeZone: "UTC",
      latitude: 0,
      longitude: 0,
    });
    const first = validState();
    const second = validState();
    first.settings.points.pop();
    expect(second.settings.points).toContain("lilith");
    expect(first.presentation).toEqual({
      showAspectLines: true,
      showDegrees: true,
      showHouses: true,
    });
    expect(() => assertChartState(second)).not.toThrow();
  });

  it.each([
    ["non-object", () => assertChartState(null), "must be an object"],
    [
      "version",
      invalid((state) => ({ ...state, version: 2 })),
      "Unsupported chart state version",
    ],
    [
      "mode",
      invalid((state) => ({ ...state, mode: "unknown" })),
      "Invalid chart mode",
    ],
    [
      "people type",
      invalid((state) => ({ ...state, people: "nope" })),
      "people must be an array",
    ],
    [
      "people count",
      invalid((state) => ({ ...state, people: [] })),
      "people must contain",
    ],
    [
      "person type",
      invalid((state) => ({ ...state, people: [null] })),
      "must be an object",
    ],
    [
      "person id",
      invalid((state) => {
        state.people[0]!.id = " spaces are invalid ";
        return state;
      }),
      "id is invalid",
    ],
    [
      "duplicate id",
      invalid((state) => {
        state.mode = "compare";
        state.people.push({ ...state.people[0]! });
        return state;
      }),
      "Duplicate person id",
    ],
    [
      "name",
      invalid((state) => {
        state.people[0]!.name = " ";
        return state;
      }),
      "name is invalid",
    ],
    [
      "date",
      invalid((state) => {
        state.people[0]!.localDate = "January 1";
        return state;
      }),
      "localDate",
    ],
    [
      "time",
      invalid((state) => {
        state.people[0]!.localTime = "noon";
        return state;
      }),
      "localTime",
    ],
    [
      "latitude",
      invalid((state) => {
        state.people[0]!.latitude = 91;
        return state;
      }),
      "latitude is invalid",
    ],
    [
      "longitude",
      invalid((state) => {
        state.people[0]!.longitude = Number.NaN;
        return state;
      }),
      "longitude is invalid",
    ],
    [
      "time zone",
      invalid((state) => {
        state.people[0]!.timeZone = "Mars/Olympus";
        return state;
      }),
      "valid IANA time zone",
    ],
    [
      "extension key",
      invalid((state) => {
        state.extensions = { unqualified: true };
        return state;
      }),
      "reverse-DNS",
    ],
    [
      "extension size",
      invalid((state) => {
        state.people[0]!.extensions = {
          "test.example.large": "x".repeat(MAX_EXTENSION_BYTES),
        };
        return state;
      }),
      "exceeds",
    ],
    [
      "settings",
      invalid((state) => ({ ...state, settings: null })),
      "settings are required",
    ],
    [
      "zodiac",
      invalid((state) => {
        state.settings.zodiac = "invalid" as "tropical";
        return state;
      }),
      "Invalid zodiac mode",
    ],
    [
      "points",
      invalid((state) => {
        state.settings.points = [];
        return state;
      }),
      "At least one point",
    ],
    [
      "compare count",
      invalid((state) => ({ ...state, mode: "compare" })),
      "at least two people",
    ],
    [
      "transit",
      invalid((state) => ({ ...state, transitAt: "not-a-date" })),
      "ISO date-time",
    ],
    [
      "presentation extensions",
      invalid((state) => {
        state.presentation = { extensions: { invalid: true } };
        return state;
      }),
      "reverse-DNS",
    ],
  ])("rejects invalid %s", (_label, operation, message) => {
    expect(operation).toThrow(message);
  });

  it("accepts compare, transit, and namespaced extensions", () => {
    const state = validState();
    state.mode = "compare";
    state.people.push({
      ...state.people[0]!,
      id: "jordan",
      name: "Jordan",
      extensions: { "example.test.person": { consent: true } },
    });
    state.transitAt = "2026-07-24T12:00:00.000Z";
    state.extensions = { "example.test.chart": [1, 2, 3] };
    state.presentation = {
      extensions: { "example.test.presentation": "compact" },
    };
    expect(() => assertChartState(state)).not.toThrow();
  });
});
