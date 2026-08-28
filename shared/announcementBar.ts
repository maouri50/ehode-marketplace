export const ANNOUNCEMENT_FONT_VALUES = ["sans", "serif", "rounded", "mono"] as const;

export type AnnouncementFont = (typeof ANNOUNCEMENT_FONT_VALUES)[number];

export type AnnouncementBarConfiguration = {
  backgroundColor: string;
  textColor: string;
  fontFamily: AnnouncementFont;
  rotationSeconds: number;
  messages: string[];
};

export const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarConfiguration = {
  backgroundColor: "#f1641e",
  textColor: "#ffffff",
  fontFamily: "sans",
  rotationSeconds: 4,
  messages: [
    "Original digital downloads · Ready when your project is",
    "Instant access after payment · Made for your next idea",
    "Creative resources for curious makers · Explore the collection",
  ],
};

export function nextAnnouncementIndex(currentIndex: number, messageCount: number) {
  if (messageCount <= 1) return 0;
  return (currentIndex + 1) % messageCount;
}

export function announcementFontStack(fontFamily: AnnouncementFont) {
  switch (fontFamily) {
    case "serif":
      return "Georgia, 'Times New Roman', serif";
    case "rounded":
      return "Trebuchet MS, Arial, sans-serif";
    case "mono":
      return "ui-monospace, SFMono-Regular, Menlo, monospace";
    default:
      return "Arial, Helvetica, sans-serif";
  }
}
