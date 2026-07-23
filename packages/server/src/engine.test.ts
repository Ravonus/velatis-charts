import { describe, expect, it } from "vitest";
import { createDefaultChartState } from "@velatis/charts-contracts";
import { calculateChartState, localDateTimeToUtc } from "./engine.js";

describe("Swiss Ephemeris engine", () => {
  it("converts IANA wall time across daylight-saving time", () => {
    const winter = createDefaultChartState({
      localDate: "2024-01-15",
      localTime: "12:00",
      timeZone: "America/Denver",
    }).people[0]!;
    const summer = { ...winter, localDate: "2024-07-15" };
    expect(localDateTimeToUtc(winter).toISOString()).toBe(
      "2024-01-15T19:00:00.000Z",
    );
    expect(localDateTimeToUtc(summer).toISOString()).toBe(
      "2024-07-15T18:00:00.000Z",
    );
  });

  it("calculates a complete natal chart", () => {
    const state = createDefaultChartState({
      name: "Ada",
      localDate: "1815-12-10",
      localTime: "12:00",
      timeZone: "Europe/London",
      latitude: 51.5074,
      longitude: -0.1278,
    });
    const result = calculateChartState(state);
    expect(result.engine.name).toBe("Swiss Ephemeris");
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0]?.houses).toHaveLength(12);
    expect(result.charts[0]?.planets).toHaveLength(
      state.settings.points.length,
    );
    expect(result.charts[0]?.ascendant).toBeGreaterThanOrEqual(0);
    expect(result.charts[0]?.ascendant).toBeLessThan(360);
  });

  it("calculates pairwise aspects for multiple people", () => {
    const state = createDefaultChartState({ id: "ada", name: "Ada" });
    state.mode = "compare";
    state.people.push({
      ...state.people[0]!,
      id: "grace",
      name: "Grace",
      localDate: "1906-12-09",
    });
    const result = calculateChartState(state);
    expect(result.charts).toHaveLength(2);
    expect(result.synastry).toHaveLength(1);
    expect(result.synastry[0]?.firstPersonId).toBe("ada");
    expect(result.synastry[0]?.secondPersonId).toBe("grace");
  });
});
