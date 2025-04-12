export function detectImageType(base64: string): string {
  if (base64.startsWith("/9j/")) return "jpeg";
  if (base64.startsWith("iVBOR")) return "png";
  if (base64.startsWith("UklGR")) return "webp";
  if (base64.startsWith("SUkqA") || base64.startsWith("AAABAA")) return "tiff";
  if (base64.slice(4, 16).includes("ZnR5cG")) {
    try {
      const brand = Buffer.from(base64, "base64")
        .toString("binary")
        .slice(8, 12);
      if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
        return "heic";
      }
    } catch {
      // ignore
    }
  }
  return "jpeg";
}
