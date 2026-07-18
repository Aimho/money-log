import { describe, expect, it } from "vitest";

import { parseVoiceEntry } from "@/lib/voice-entry";

describe("parseVoiceEntry", () => {
  it("uses an existing multi-word group as a strong boundary", () => {
    const result = parseVoiceEntry("김민지 대학 친구 십오만 원", ["대학 친구"]);
    expect(result.candidates[0]).toMatchObject({ amount: 150000, group: "대학 친구", name: "김민지" });
    expect(result.isAmbiguous).toBe(false);
  });

  it("offers alternatives for a plausible new group", () => {
    const result = parseVoiceEntry("김민지 독서 모임 10만 원", []);
    expect(result.candidates[0]).toMatchObject({ amount: 100000, group: "독서 모임", name: "김민지" });
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("supports an entry without a group", () => {
    expect(parseVoiceEntry("김민지 오만 원", []).candidates[0]).toMatchObject({ amount: 50000, group: "", name: "김민지" });
  });

  it("returns no candidates when the amount is invalid", () => {
    expect(parseVoiceEntry("김민지 대학 친구", ["대학 친구"]).candidates).toEqual([]);
  });

  it("finds the amount even when it is spoken first", () => {
    expect(parseVoiceEntry("십오만 원 김민지 대학 친구", ["대학 친구"]).candidates[0]).toMatchObject({
      amount: 150000,
      group: "대학 친구",
      name: "김민지",
    });
  });

  it("keeps a spaced compound amount together", () => {
    expect(parseVoiceEntry("김민지 친구 1만 5천 원", ["친구"]).candidates[0]).toMatchObject({
      amount: 15000,
      group: "친구",
      name: "김민지",
    });
  });
});
