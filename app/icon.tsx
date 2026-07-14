import { ImageResponse } from "next/og";

export const size = {
  height: 32,
  width: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f4f1ea",
          border: "1px solid rgba(34,33,29,0.1)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#10b981",
            borderRadius: 8,
            display: "flex",
            height: 18,
            width: 18,
          }}
        />
      </div>
    ),
    size,
  );
}
