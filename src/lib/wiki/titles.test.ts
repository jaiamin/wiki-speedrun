import { describe, expect, it } from "vitest";
import {
  isArticleTitle,
  normalizeTitle,
  titleFromHref,
  titlesMatch,
  titleToPath,
} from "./titles";

describe("normalizeTitle", () => {
  it("matches how MediaWiki stores a title", () => {
    expect(normalizeTitle("united_states")).toBe("United states");
    expect(normalizeTitle("  Black   Death  ")).toBe("Black Death");
    expect(normalizeTitle("banana#Cultivation")).toBe("Banana");
  });

  it("only uppercases the first character", () => {
    // "AIDS" and "Aids" are different articles; only the first letter of a
    // main-namespace title is case-insensitive.
    expect(normalizeTitle("aIDS")).toBe("AIDS");
    expect(normalizeTitle("iPhone")).toBe("IPhone");
  });

  it("handles empty input without throwing", () => {
    expect(normalizeTitle("   ")).toBe("");
    expect(normalizeTitle("#section")).toBe("");
  });
});

describe("titleFromHref", () => {
  it("extracts article titles from wiki links", () => {
    expect(titleFromHref("/wiki/Banana")).toBe("Banana");
    expect(titleFromHref("/wiki/Cavendish_banana")).toBe("Cavendish banana");
    expect(titleFromHref("./Banana")).toBe("Banana");
    expect(titleFromHref("https://en.wikipedia.org/wiki/Banana")).toBe("Banana");
  });

  it("decodes percent-encoded titles", () => {
    expect(titleFromHref("/wiki/Caf%C3%A9")).toBe("Café");
    expect(titleFromHref("/wiki/Banana_(disambiguation)")).toBe(
      "Banana (disambiguation)",
    );
  });

  it("rejects anything that is not a playable article", () => {
    expect(titleFromHref("/wiki/File:Banana.jpg")).toBeNull();
    expect(titleFromHref("/wiki/Category:Fruit")).toBeNull();
    expect(titleFromHref("/wiki/Special:Search")).toBeNull();
    expect(titleFromHref("/wiki/Help:Contents")).toBeNull();
    expect(titleFromHref("/wiki/Template:Infobox")).toBeNull();
    expect(titleFromHref("/wiki/Talk:Banana")).toBeNull();
    expect(titleFromHref("#cite_note-1")).toBeNull();
    expect(titleFromHref("https://example.com")).toBeNull();
    expect(titleFromHref("")).toBeNull();
  });

  it("rejects red links, which point at articles that do not exist", () => {
    expect(
      titleFromHref("/w/index.php?title=Nonexistent&action=edit&redlink=1"),
    ).toBeNull();
  });

  it("tolerates namespaces written with underscores", () => {
    expect(titleFromHref("/wiki/User_talk:Someone")).toBeNull();
  });

  it("does not throw on malformed percent-encoding", () => {
    expect(titleFromHref("/wiki/%E0%A4%A")).toBeNull();
  });
});

describe("titlesMatch", () => {
  it("ignores underscores, spacing and first-letter case", () => {
    expect(titlesMatch("United States", "united_States")).toBe(true);
    expect(titlesMatch("Black  Death", "Black_Death")).toBe(true);
    expect(titlesMatch("Banana", "Bananas")).toBe(false);
  });

  it("keeps titles that differ past the first letter distinct", () => {
    // Only the first character of a main-namespace title is case-insensitive,
    // so "United states" is a different page from "United States" — in
    // practice a redirect, which the article endpoint resolves server-side
    // before win detection ever compares anything.
    expect(titlesMatch("United States", "United states")).toBe(false);
  });
});

describe("titleToPath", () => {
  it("produces a URL-safe path segment", () => {
    expect(titleToPath("Cavendish banana")).toBe("Cavendish_banana");
    expect(titleToPath("Banana (disambiguation)")).toBe(
      "Banana_(disambiguation)",
    );
  });
});

describe("isArticleTitle", () => {
  it("separates articles from other namespaces", () => {
    expect(isArticleTitle("Banana")).toBe(true);
    expect(isArticleTitle("Category:Fruit")).toBe(false);
    expect(isArticleTitle("")).toBe(false);
  });
});
