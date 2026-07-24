import { describe, expect, it } from "vitest";
import { calculateEphemerisOperation } from "./operations.js";

const tropical = {
  zodiacMode: "tropical",
  siderealAyanamsaKey: "SE_SIDM_LAHIRI",
  customAyanamsaDegrees: 0,
};

describe("ephemeris operations", () => {
  it("returns a complete rich chart frame", () => {
    const response = calculateEphemerisOperation({
      operation: "chart-frame",
      input: {
        julianDay: 2_460_000.5,
        latitude: 39.7392,
        longitude: -104.9903,
        calculationHouseSystem: "P",
        bodyIds: [0, 1, 2, 10, 15],
        includePrenatalSyzygy: true,
        settings: tropical,
      },
    });
    const frame = response.result as Record<string, unknown>;
    expect(frame.houses).toHaveLength(12);
    expect(frame.gauquelinSectors).toHaveLength(36);
    expect(frame.positions).toHaveLength(5);
    expect(frame.obliquity).toEqual(expect.any(Number));
    expect(frame.prenatalSyzygyLongitude).toEqual(expect.any(Number));
  });

  it("batches positions without server state", () => {
    const response = calculateEphemerisOperation({
      operation: "positions",
      input: {
        samples: [
          { julianDay: 2_460_000.5, bodyIds: [0, 1] },
          { julianDay: 2_460_001.5, bodyIds: [0, 1] },
        ],
        settings: tropical,
      },
    });
    const samples = response.result as Array<Record<string, unknown>>;
    expect(samples).toHaveLength(2);
    expect(samples[0]?.positions).toHaveLength(2);
    expect(samples[1]?.positions).toHaveLength(2);
  });

  it.each([
    undefined,
    {
      zodiacMode: "sidereal",
      siderealAyanamsaKey: "SE_SIDM_LAHIRI",
    },
    {
      zodiacMode: "sidereal",
      siderealAyanamsaKey: "SE_SIDM_USER",
      customAyanamsaDegrees: 24.25,
    },
  ])("supports default and sidereal position settings", (settings) => {
    const response = calculateEphemerisOperation({
      operation: "positions",
      input: {
        samples: [{ julianDay: 2_460_000.5, bodyIds: [0] }],
        settings,
      },
    });
    expect(response.result).toEqual([
      expect.objectContaining({
        positions: [expect.objectContaining({ longitude: expect.any(Number) })],
      }),
    ]);
  });

  it("finds exact longitude crossings on the server", () => {
    const response = calculateEphemerisOperation({
      operation: "crossings",
      input: {
        queries: [
          {
            bodyId: 0,
            targetLongitude: 0,
            aspectAngle: 0,
            fromJd: 2_460_380,
            toJd: 2_460_400,
          },
        ],
        settings: tropical,
      },
    });
    const [result] = response.result as Array<{
      exactJulianDays: number[];
    }>;
    expect(result?.exactJulianDays.length).toBeGreaterThan(0);
  });

  it("serves the visible Swiss fixed-star catalog", () => {
    const response = calculateEphemerisOperation({
      operation: "fixed-star-catalog",
      input: { query: "Sirius", maxMagnitude: 6, limit: 8, offset: 0 },
    });
    const catalog = response.result as {
      rows: Array<{ name: string }>;
    };
    expect(catalog.rows.some((row) => row.name === "Sirius")).toBe(true);

    const defaults = calculateEphemerisOperation({
      operation: "fixed-star-catalog",
      input: {},
    }).result as { rows: unknown[]; limit: number; offset: number };
    expect(defaults.limit).toBe(32);
    expect(defaults.offset).toBe(0);
    expect(defaults.rows.length).toBeGreaterThan(0);
  });

  it("finds bounded solar and lunar eclipses", () => {
    const response = calculateEphemerisOperation({
      operation: "eclipses",
      input: { fromJd: 2_460_000, toJd: 2_460_500 },
    });
    const eclipses = response.result as Array<{
      kind: string;
      maximum: number;
      eclipseType: string;
    }>;
    expect(eclipses.length).toBeGreaterThan(0);
    expect(eclipses.some((event) => event.kind === "solar")).toBe(true);
    expect(eclipses.some((event) => event.kind === "lunar")).toBe(true);
    expect(eclipses.every((event) => event.maximum >= 2_460_000)).toBe(true);
  });

  it("calculates rise and set events", () => {
    for (const event of ["rise", "set"]) {
      const response = calculateEphemerisOperation({
        operation: "rise-set",
        input: {
          event,
          startJd: 2_460_000.5,
          bodyId: 0,
          latitude: 39.7392,
          longitude: -104.9903,
        },
      });
      expect(response.result).toMatchObject({
        transitJulianDay: expect.any(Number),
      });
    }
  });

  it("calculates fixed-star positions", () => {
    const response = calculateEphemerisOperation({
      operation: "fixed-star-positions",
      input: {
        julianDay: 2_460_000.5,
        stars: [
          {
            key: "sirius-alcm",
            name: "Sirius",
            designation: "alCMa",
          },
        ],
      },
    });
    expect(response.result).toEqual([
      expect.objectContaining({
        starKey: "sirius-alcm",
        starName: "Sirius",
        family: "Swiss",
        nature: "",
        longitude: expect.any(Number),
        declination: expect.any(Number),
      }),
    ]);
  });

  it.each([
    [{ operation: "unknown", input: {} }, "Unsupported ephemeris operation"],
    [
      {
        operation: "eclipses",
        input: { fromJd: 2_460_000, toJd: 2_500_000 },
      },
      "eclipse range is invalid",
    ],
    [
      { operation: "positions", input: { samples: "not-an-array" } },
      "must be an array",
    ],
    [
      {
        operation: "positions",
        input: {
          samples: [{ julianDay: 2_460_000.5, bodyIds: [0.5] }],
        },
      },
      "must be an integer",
    ],
    [
      {
        operation: "positions",
        input: {
          settings: {
            zodiacMode: "sidereal",
            siderealAyanamsaKey: "not-supported",
          },
          samples: [{ julianDay: 2_460_000.5, bodyIds: [0] }],
        },
      },
      "siderealAyanamsaKey is unsupported",
    ],
  ])("rejects an invalid bounded operation", (request, message) => {
    expect(() => calculateEphemerisOperation(request)).toThrow(message);
  });
});
