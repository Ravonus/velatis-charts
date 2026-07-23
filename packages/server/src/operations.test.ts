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
  });
});
