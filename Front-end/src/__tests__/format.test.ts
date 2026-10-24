import { formatMonth, formatPeriod, uniqueSorted } from "../lib/format";

describe("format", () => {
  it("formate un mois dans la langue demandée", () => {
    expect(formatMonth("2026-09-14", "fr")).toMatch(/sept\.? 2026/);
    expect(formatMonth("2026-09-14", "en")).toMatch(/Sept?\.? 2026/);
  });

  it("affiche le marqueur « en cours » dans la bonne langue", () => {
    expect(formatPeriod("2026-09-14", null, true, "fr")).toMatch(/aujourd'hui$/);
    expect(formatPeriod("2026-09-14", null, true, "en")).toMatch(/present$/);
  });

  it("affiche un intervalle", () => {
    expect(formatPeriod("2025-04-01", "2025-07-31", false, "fr")).toMatch(/avr\.? 2025 – juil\.? 2025/);
  });

  it("ne répète pas un mois identique", () => {
    expect(formatPeriod("2025-04-01", "2025-04-30", false, "fr")).not.toContain("–");
  });

  it("déduplique et trie avec les accents", () => {
    expect(uniqueSorted(["IA", "Data", "IA", "Écologie"], "fr")).toEqual(["Data", "Écologie", "IA"]);
  });
});
