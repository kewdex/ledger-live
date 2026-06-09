import { hasThemedImage, resolveThemedImageUrl } from "../resolveThemedImageUrl";

describe("resolveThemedImageUrl", () => {
  const urls = {
    imageUrlLight: "https://example.com/light.png",
    imageUrlDark: "https://example.com/dark.png",
  };

  it.each([
    ["light", "https://example.com/light.png"],
    ["dark", "https://example.com/dark.png"],
  ] as const)("should return the %s image url", (theme, expectedUrl) => {
    expect(resolveThemedImageUrl(urls, theme)).toBe(expectedUrl);
  });

  it("should fall back to light when dark url is empty", () => {
    expect(
      resolveThemedImageUrl(
        { imageUrlLight: "https://example.com/light.png", imageUrlDark: "" },
        "dark",
      ),
    ).toBe("https://example.com/light.png");
  });
});

describe("hasThemedImage", () => {
  it.each([
    ["light", true],
    ["dark", true],
  ] as const)("should return true when a resolvable image exists for %s theme", (theme, expected) => {
    expect(
      hasThemedImage(
        { imageUrlLight: "https://example.com/light.png", imageUrlDark: "" },
        theme,
      ),
    ).toBe(expected);
  });

  it("should return false when both themed urls are empty", () => {
    expect(
      hasThemedImage({ imageUrlLight: "", imageUrlDark: "" }, "light"),
    ).toBe(false);
  });
});
