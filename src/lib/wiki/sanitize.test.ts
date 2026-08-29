import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitizeArticle } from "./sanitize";

/**
 * Fixture is a real `action=parse` response for "Banana" - a long article with
 * infoboxes, navboxes, cladograms and 240+ citations, which is exactly the
 * shape that breaks naive stripping.
 */
const raw = JSON.parse(
  readFileSync(new URL("./__fixtures__/banana.json", import.meta.url), "utf8"),
).parse.text as string;

describe("sanitizeArticle", () => {
  const { html, links, sections } = sanitizeArticle(raw);

  it("strips scripts, styles and citation markers", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/class="[^"]*\breference\b/);
  });

  it("drops the references section but keeps See also", () => {
    expect(html).not.toContain('id="References"');
    expect(html).not.toContain('id="External_links"');
    expect(html).toContain('id="See_also"');
  });

  it("keeps the article body", () => {
    expect(html).toContain('id="Description"');
    expect(html).toContain('id="History"');
  });

  it("extracts the remaining section hierarchy for contents navigation", () => {
    expect(sections).toContainEqual({
      id: "Description",
      label: "Description",
      level: 2,
    });
    expect(sections).toContainEqual({
      id: "Taxonomy",
      label: "Taxonomy",
      level: 3,
    });
    expect(sections.some((section) => section.id === "References")).toBe(false);
  });

  it("cuts the payload down substantially", () => {
    expect(html.length).toBeLessThan(raw.length * 0.6);
  });

  it("tags every live link with a normalized article title", () => {
    expect(links).toContain("Cavendish banana");
    expect(links.length).toBeGreaterThan(100);

    for (const title of links) {
      expect(title).not.toContain("_");
      expect(title).not.toMatch(/^(File|Category|Help|Special|Template):/);
    }
  });

  it("neutralizes non-article links instead of leaving them clickable", () => {
    expect(html).not.toContain('href="/wiki/File:');
    expect(html).not.toContain('href="/wiki/Category:');
    expect(html).not.toContain("redlink=1");
    expect(html).not.toMatch(/href="https?:\/\/(?!upload)/);
  });

  it("makes protocol-relative image sources absolute", () => {
    expect(html).not.toMatch(/src="\/\//);
  });
});
