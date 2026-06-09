export type ThemedImageUrls = {
  imageUrlLight: string;
  imageUrlDark: string;
};

export type ThemeVariant = "light" | "dark";

export const resolveThemedImageUrl = (
  urls: ThemedImageUrls,
  theme: ThemeVariant,
): string => {
  if (theme === "dark" && urls.imageUrlDark.length > 0) {
    return urls.imageUrlDark;
  }

  return urls.imageUrlLight;
};

export const hasThemedImage = (urls: ThemedImageUrls, theme: ThemeVariant): boolean =>
  resolveThemedImageUrl(urls, theme).length > 0;
