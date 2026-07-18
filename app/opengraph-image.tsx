import { ImageResponse } from "next/og";

export const alt = "받은 마음을 잊지 않도록, 축하금 장부";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f4f1ea",
          color: "#22211d",
          display: "flex",
          fontFamily: "sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: "72px 88px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#fffdf8",
            borderRadius: 40,
            boxShadow: "0 20px 50px rgba(34, 33, 29, 0.12)",
            display: "flex",
            height: "100%",
            justifyContent: "space-between",
            padding: "64px 72px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
            <div style={{ color: "#0b8f68", display: "flex", fontSize: 28, fontWeight: 700, marginBottom: 32 }}>
              축하금 장부
            </div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.15 }}>
              받은 마음을<br />잊지 않도록
            </div>
            <div style={{ color: "#68645b", display: "flex", fontSize: 28, marginTop: 32 }}>
              이름 · 그룹 · 금액을 한곳에 기록하세요
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              background: "#10b981",
              borderRadius: 56,
              display: "flex",
              height: 240,
              justifyContent: "center",
              width: 240,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#fffdf8",
                borderRadius: 36,
                color: "#0b8f68",
                display: "flex",
                fontSize: 88,
                fontWeight: 800,
                height: 160,
                justifyContent: "center",
                width: 160,
              }}
            >
              W
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
