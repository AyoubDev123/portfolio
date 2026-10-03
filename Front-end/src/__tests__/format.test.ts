import { formatMonth, formatPeriod, uniqueSorted } from "../lib/format";

describe("format", () => {
  it("formate un mois en français", () => {
    expect(formatMonth("2026-09-14")).toMatch(/sept\.? 2026/);
  });

  it("affiche « aujourd'hui » pour une expérience en cours", () => {
    expect(formatPeriod("2026-09-14", null, true)).toMatch(/aujourd'hui$/);
  });

  it("affiche un intervalle", () => {
    expect(formatPeriod("2025-04-01", "2025-07-31")).toMatch(/avr\.? 2025 – juil\.? 2025/);
  });

  it("ne répète pas un mois identique", () => {
    expect(formatPeriod("2025-04-01", "2025-04-30")).not.toContain("–");
  });

  it("déduplique et trie avec les accents", () => {
    expect(uniqueSorted(["IA", "Data", "IA", "Écologie"])).toEqual(["Data", "Écologie", "IA"]);
  });
});
