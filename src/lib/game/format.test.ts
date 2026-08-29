import { describe, expect, it } from "vitest";
import { formatClock, formatDelta, formatShort } from "./format";

describe("formatClock", () => {
  it("reads like a speedrun timer", () => {
    expect(formatClock(0)).toBe("0:00.00");
    expect(formatClock(9_590)).toBe("0:09.59");
    expect(formatClock(61_280)).toBe("1:01.28");
  });

  it("grows an hours field only when needed", () => {
    expect(formatClock(3_599_990)).toBe("59:59.99");
    expect(formatClock(3_600_000)).toBe("1:00:00.00");
  });

  it("never renders negative time", () => {
    expect(formatClock(-500)).toBe("0:00.00");
  });
});

describe("formatShort", () => {
  it("drops hundredths for dense lists", () => {
    expect(formatShort(10_000)).toBe("10s");
    expect(formatShort(75_000)).toBe("1m 15s");
  });
});

describe("formatDelta", () => {
  it("always carries a sign", () => {
    expect(formatDelta(4_210)).toBe("+4.21");
    expect(formatDelta(-1_080)).toBe("-1.08");
  });
});
