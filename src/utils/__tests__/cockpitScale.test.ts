import { describe, expect, it } from "vitest";
import {
  getAdaptiveDialCeiling,
  getCockpitResourceSummary,
  getCockpitNodeStates,
} from "@/utils/cockpitScale";

const MIB = 1024 ** 2;
const TIB = 1024 ** 4;

describe("cockpit dial scale", () => {
  it("uses compact nice-number ceilings for bandwidth", () => {
    expect(getAdaptiveDialCeiling(1.18 * MIB, MIB)).toBe(2 * MIB);
    expect(getAdaptiveDialCeiling(421 * MIB, MIB)).toBe(500 * MIB);
  });

  it("keeps large traffic values within the dial range", () => {
    expect(getAdaptiveDialCeiling(17.5 * TIB, TIB)).toBe(25 * TIB);
    expect(getAdaptiveDialCeiling(301 * TIB, TIB)).toBe(500 * TIB);
  });

  it("falls back while live values are unavailable", () => {
    expect(getAdaptiveDialCeiling(0, MIB)).toBe(MIB);
    expect(getAdaptiveDialCeiling(Number.NaN, TIB)).toBe(TIB);
  });
});

describe("cockpit node ring", () => {
  it("renders one marker per node for ordinary node counts", () => {
    expect(getCockpitNodeStates(6, 5, 1)).toEqual([
      "online",
      "online",
      "online",
      "online",
      "online",
      "offline",
    ]);
  });

  it("compresses large fleets into a 36-slot proportional ring", () => {
    const states = getCockpitNodeStates(40, 32, 4);
    expect(states).toHaveLength(36);
    expect(states.filter((state) => state === "online")).toHaveLength(29);
    expect(states.filter((state) => state === "offline")).toHaveLength(4);
    expect(states.filter((state) => state === "unknown")).toHaveLength(3);
  });

  it("renders an empty ring while waiting for the first node", () => {
    expect(getCockpitNodeStates(0, 0, 0)).toEqual([]);
  });
});

describe("cockpit resource summary", () => {
  it("weights CPU by cores and sums memory and disk for online nodes", () => {
    const summary = getCockpitResourceSummary([
      {
        online: true,
        cpuCores: 2,
        cpuPct: 20,
        ramUsed: 4,
        ramTotal: 8,
        diskUsed: 30,
        diskTotal: 100,
      },
      {
        online: true,
        cpuCores: 6,
        cpuPct: 60,
        ramUsed: 12,
        ramTotal: 24,
        diskUsed: 150,
        diskTotal: 300,
      },
      {
        online: false,
        cpuCores: 32,
        cpuPct: 100,
        ramUsed: 64,
        ramTotal: 64,
        diskUsed: 500,
        diskTotal: 500,
      },
    ]);

    expect(summary).toEqual({
      cpuCores: 8,
      cpuPct: 50,
      ramUsed: 16,
      ramTotal: 32,
      diskUsed: 180,
      diskTotal: 400,
    });
  });

  it("clamps invalid and over-capacity resource values", () => {
    expect(
      getCockpitResourceSummary([
        {
          online: true,
          cpuCores: 0,
          cpuPct: 150,
          ramUsed: 12,
          ramTotal: 8,
          diskUsed: Number.NaN,
          diskTotal: 20,
        },
      ]),
    ).toEqual({
      cpuCores: 0,
      cpuPct: 100,
      ramUsed: 8,
      ramTotal: 8,
      diskUsed: 0,
      diskTotal: 20,
    });
  });
});
