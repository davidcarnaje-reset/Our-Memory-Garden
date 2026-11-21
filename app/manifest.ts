import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Our Memory Garden",
    short_name: "Memory Garden",
    description: "A cozy botanical keepsake of our favorite moments together.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6F0",
    theme_color: "#5B7A5F",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
