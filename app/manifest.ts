import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "축하금 장부",
    short_name: "축하금 장부",
    description: "행사별 축하금과 소중한 마음을 간편하게 기록하고 정리하세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#10b981",
    lang: "ko-KR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
