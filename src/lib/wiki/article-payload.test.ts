import { describe, expect, it } from "vitest";
import { toArticle } from "./article-payload";

const complete = {
  title: "Banana",
  pageId: 38940,
  html: "<p>A banana…</p>",
  links: ["Fruit"],
  sections: [{ id: "History", label: "History", level: 2 }],
  redirectedFrom: null,
};

describe("toArticle", () => {
  it("passes a complete payload through", () => {
    expect(toArticle(complete, "Banana")).toEqual(complete);
  });

  it("fills in sections missing from an older cached payload", () => {
    // The exact crash this exists to prevent: a response cached before
    // `sections` was added, replayed into a build that maps over it.
    const { sections, ...legacy } = complete;
    void sections;

    expect(toArticle(legacy, "Banana").sections).toEqual([]);
  });

  it("fills in links missing from an older cached payload", () => {
    const { links, ...legacy } = complete;
    void links;

    expect(toArticle(legacy, "Banana").links).toEqual([]);
  });

  it("replaces a non-array in an additive field", () => {
    expect(
      toArticle({ ...complete, sections: "nonsense" }, "Banana").sections,
    ).toEqual([]);
  });

  it("falls back to the requested title when the payload has none", () => {
    const { title, ...untitled } = complete;
    void title;

    expect(toArticle(untitled, "Banana").title).toBe("Banana");
  });

  it("normalises a missing redirect to null", () => {
    const { redirectedFrom, ...rest } = complete;
    void redirectedFrom;

    expect(toArticle(rest, "Banana").redirectedFrom).toBeNull();
  });

  it("throws when there is no article body to show", () => {
    // Rendering a blank page here would hide the failure rather than surface
    // it, and the run would look broken with no explanation.
    const { html, ...bodyless } = complete;
    void html;

    expect(() => toArticle(bodyless, "Banana")).toThrow(/Malformed/);
    expect(() => toArticle({ ...complete, html: "" }, "Banana")).toThrow();
  });

  it("throws rather than dereferencing null or undefined", () => {
    expect(() => toArticle(null, "Banana")).toThrow(/Malformed/);
    expect(() => toArticle(undefined, "Banana")).toThrow(/Malformed/);
  });
});
