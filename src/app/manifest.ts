import type { MetadataRoute } from "next";

// Lets the phone home-screen icon open the app full screen, without the
// browser's address bar. (Remove the old shortcut and add it again once.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutrition Tracker",
    short_name: "Nutrition",
    description: "Minimalistic nutrition tracking app",
    start_url: "/day",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
